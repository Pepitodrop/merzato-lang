import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const timeoutMs = 20_000;

function contentType(path) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.mid': 'audio/midi',
    '.mza': 'text/plain; charset=utf-8'
  }[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const requestedPath = url.pathname === '/' ? '/web/index.html' : decodeURIComponent(url.pathname);
      let filePath = resolve(repositoryRoot, `.${requestedPath}`);
      if (filePath !== repositoryRoot && !filePath.startsWith(`${repositoryRoot}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const metadata = await stat(filePath);
      if (metadata.isDirectory()) filePath = join(filePath, 'index.html');
      const body = await readFile(filePath);
      response.writeHead(200, {
        'Content-Type': contentType(filePath),
        'Cache-Control': 'no-store'
      });
      response.end(body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}/web/`
  };
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'google-chrome-stable',
    'google-chrome',
    'chromium',
    'chromium-browser'
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) return candidate;
  }
  throw new Error(`Chrome or Chromium was not found. Tried: ${candidates.join(', ')}`);
}

function waitForDevTools(chrome) {
  return new Promise((resolveDevTools, rejectDevTools) => {
    let stderr = '';
    const timer = setTimeout(() => {
      rejectDevTools(new Error(`Chrome did not expose DevTools within ${timeoutMs}ms.\n${stderr}`));
    }, timeoutMs);

    chrome.stderr.setEncoding('utf8');
    chrome.stderr.on('data', chunk => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolveDevTools(match[1]);
      }
    });
    chrome.once('exit', code => {
      clearTimeout(timer);
      rejectDevTools(new Error(`Chrome exited before DevTools was available (code ${code}).\n${stderr}`));
    });
  });
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
      else pending.resolve(message.result ?? {});
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function connectCdp(webSocketUrl) {
  if (typeof WebSocket !== 'function') {
    throw new Error('The browser E2E test requires Node.js 22 or newer with global WebSocket support');
  }
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });
  return new CdpClient(socket);
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result?.value;
}

async function waitFor(client, sessionId, expression, description) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(client, sessionId, expression)) return;
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function runBrowserTest(pageUrl) {
  const profileDirectory = await mkdtemp(join(tmpdir(), 'merzato-e2e-'));
  const chrome = spawn(findChrome(), [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDirectory}`,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let client;
  try {
    const webSocketUrl = await waitForDevTools(chrome);
    client = await connectCdp(webSocketUrl);
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await client.send('Target.attachToTarget', {
      targetId,
      flatten: true
    });
    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Page.navigate', { url: pageUrl }, sessionId);

    await waitFor(
      client,
      sessionId,
      `document.readyState === 'complete' && document.querySelector('#source')?.value.includes('counterButton')`,
      'the playground source editor'
    );

    await evaluate(client, sessionId, `document.querySelector('#run').click()`);
    await waitFor(
      client,
      sessionId,
      `document.querySelector('#counterButton')?.textContent === 'Count: 0'`,
      'the generated counter button'
    );
    await evaluate(client, sessionId, `{
      const button = document.querySelector('#counterButton');
      button.click(); button.click(); button.click();
      true;
    }`);
    await waitFor(
      client,
      sessionId,
      `document.querySelector('#counterButton')?.textContent === 'Count: 3'`,
      'three serialized counter clicks'
    );

    await evaluate(client, sessionId, `document.querySelector('#reset').click()`);
    await evaluate(client, sessionId, `document.querySelector('#runArt').click()`);
    await waitFor(
      client,
      sessionId,
      `document.querySelector('#paintedButton')?.textContent === 'Painted button'`,
      'the SVG and MIDI artwork button'
    );
    await evaluate(client, sessionId, `document.querySelector('#paintedButton').click()`);
    await waitFor(
      client,
      sessionId,
      `document.querySelector('#paintedButton')?.textContent === 'The painting clicked back.'`,
      'the artwork click handler'
    );

    const consoleText = await evaluate(client, sessionId, `document.querySelector('#console').textContent`);
    if (/\bError:/i.test(consoleText)) throw new Error(`Playground reported an error: ${consoleText}`);
    console.log('Browser E2E passed: assembly, DOM events, SVG, and MIDI execution are working.');
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await new Promise(resolveExit => chrome.once('exit', resolveExit)).catch(() => undefined);
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

const { server, url } = await startStaticServer();
try {
  await runBrowserTest(url);
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
}
