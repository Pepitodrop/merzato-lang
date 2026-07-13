import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assemble } from '../src/assembler.js';
import { compileArtSvg } from '../src/artCompiler.js';
import { BrowserHost } from '../src/browserHost.js';
import { parseMidiFile, parseMidiNotes } from '../src/midi.js';
import { ConsoleHost, MerzatoVM } from '../src/vm.js';

async function run(source, options = {}) {
  const host = new ConsoleHost({ write: false });
  const vm = new MerzatoVM(assemble(source), host, options);
  const result = await vm.run();
  return { host, vm, result };
}

test('assembly VM performs arithmetic and branching', async () => {
  const { host } = await run(`
    .entry main
    main:
      push 6
      push 7
      mul
      dup
      push 42
      sub
      jz correct
      push 88
      outc
      halt
    correct:
      outn
      halt
  `);
  assert.equal(host.outputText, '42');
});

test('heap and loop can implement a counter machine', async () => {
  const { host } = await run(`
    .entry main
    main:
      push 0
      store r0
    loop:
      load r0
      push 1
      add
      dup
      store r0
      push 5
      cmpgt
      jz loop
      load r0
      outn
      halt
  `);
  assert.equal(host.outputText, '6');
});

test('assembler accepts quoted strings, bare symbols, and same-line labels', () => {
  const program = assemble("start: push 'hello\\nworld'\npush bare-token\nhalt");
  assert.equal(program.labels.start, 0);
  assert.equal(program.instructions[0].args[0], 'hello\nworld');
  assert.equal(program.instructions[1].args[0], 'bare-token');
});

test('assembler rejects malformed source before execution', () => {
  assert.throws(() => assemble('push'), error => error.code === 'INVALID_ARITY');
  assert.throws(() => assemble('.entry a\n.entry b\na: halt\nb: halt'), error => error.code === 'DUPLICATE_ENTRY');
  assert.throws(() => assemble('push "unfinished'), error => error.code === 'UNTERMINATED_STRING');
  assert.throws(() => assemble('load r16'), error => error.code === 'INVALID_REGISTER');
  assert.throws(() => assemble('jmp nowhere'), error => error.code === 'UNKNOWN_LABEL');
});


test('labels cannot corrupt the label table prototype and compiled programs are immutable', () => {
  const program = assemble(`.entry __proto__
__proto__: push 1
halt`);
  assert.equal(program.entry, 0);
  assert.equal(Object.getPrototypeOf(program.labels), null);
  assert.ok(Object.isFrozen(program));
  assert.ok(Object.isFrozen(program.instructions));
  assert.throws(() => { program.instructions[0].op = 'HALT'; }, TypeError);
});

test('runtime errors carry source location', async () => {
  const vm = new MerzatoVM(assemble('nop\npop\nhalt'), new ConsoleHost({ write: false }));
  await assert.rejects(vm.run(), error => {
    assert.equal(error.code, 'STACK_UNDERFLOW');
    assert.equal(error.pc, 1);
    assert.equal(error.line, 2);
    assert.match(error.message, /line 2/);
    return true;
  });
});

test('VM enforces step, stack, heap, call, and string resource limits', async () => {
  await assert.rejects(
    new MerzatoVM(assemble('loop: jmp loop'), new ConsoleHost({ write: false }), { maxSteps: 3 }).run(),
    error => error.code === 'RESOURCE_LIMIT' && /Step limit/.test(error.message)
  );
  await assert.rejects(
    new MerzatoVM(assemble('push 1\npush 2'), new ConsoleHost({ write: false }), { maxStackDepth: 1 }).run(),
    error => error.code === 'RESOURCE_LIMIT' && /Stack limit/.test(error.message)
  );
  await assert.rejects(
    new MerzatoVM(
      assemble('push 10\npush 0\nhstore\npush 20\npush 1\nhstore'),
      new ConsoleHost({ write: false }),
      { maxHeapCells: 1 }
    ).run(),
    error => error.code === 'RESOURCE_LIMIT' && /Heap cell/.test(error.message)
  );
  await assert.rejects(
    new MerzatoVM(assemble('again: call again'), new ConsoleHost({ write: false }), { maxCallDepth: 2 }).run(),
    error => error.code === 'RESOURCE_LIMIT' && /Call stack/.test(error.message)
  );
  await assert.rejects(
    new MerzatoVM(assemble('push "abc"'), new ConsoleHost({ write: false }), { maxStringLength: 2 }).run(),
    error => error.code === 'RESOURCE_LIMIT' && /String limit/.test(error.message)
  );
});

test('VM snapshots are immutable and reset restores initial state', async () => {
  const vm = new MerzatoVM(assemble('push 7\nstore r0\nhalt'), new ConsoleHost({ write: false }));
  const result = await vm.run();
  assert.equal(result.registers[0], 7n);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.registers));
  vm.reset();
  assert.equal(vm.pc, 0);
  assert.equal(vm.registers[0], 0n);
  assert.equal(vm.halted, false);
});

test('ConsoleHost rejects invalid Unicode scalar values', async () => {
  await assert.rejects(
    run('push 1114112\noutc'),
    error => error.code === 'RUNTIME_ERROR' && /Invalid Unicode scalar/.test(error.message)
  );
});

test('painted SVG compiles to a working program', async () => {
  const svg = await readFile(new URL('../examples/hello.merz.svg', import.meta.url), 'utf8');
  const host = new ConsoleHost({ write: false });
  await new MerzatoVM(compileArtSvg(svg), host).run();
  assert.equal(host.outputText, 'Hi');
});

test('art compiler ignores commented rectangles and validates structure', () => {
  const svg = `<svg>
    <!-- <rect data-order="0" fill="#FFC0C0"/> -->
    <rect data-order="0" data-value="65" fill="#FFC0C0"/>
    <rect data-order="1" fill="#FF0000"/>
  </svg>`;
  const program = compileArtSvg(svg);
  assert.equal(program.instructions[0].op, 'PUSH');
  assert.equal(program.instructions.length, 2);
});

test('art compiler rejects unsafe or ambiguous artwork', () => {
  assert.throws(
    () => compileArtSvg('<!DOCTYPE svg><svg><rect data-order="0" fill="#FFC0C0"/><rect data-order="1" fill="#FF0000"/></svg>'),
    error => error.code === 'INVALID_ARTWORK'
  );
  assert.throws(
    () => compileArtSvg('<svg><rect data-order="0" fill="#FFC0C0"/><rect data-order="0" fill="#FF0000"/></svg>'),
    /Duplicate data-order/
  );
  assert.throws(
    () => compileArtSvg('<svg><rect data-order="0" data-value="&unknown;" fill="#FFC0C0"/><rect data-order="1" fill="#FF0000"/></svg>'),
    /unsupported XML entity/
  );
  assert.throws(
    () => compileArtSvg('<svg><rect data-order="0" data-note="200" fill="#FFC0C0"/><rect data-order="1" fill="#FF0000"/></svg>'),
    /invalid MIDI note/i
  );
  assert.throws(
    () => compileArtSvg('<svg><rect data-order="0" fill="#FFC0C0"/><rect data-order="1" data-target="missing" fill="#00FFFF"/></svg>'),
    error => error.code === 'UNKNOWN_LABEL'
  );
});

test('paired MIDI notes are parsed and accepted by the art compiler', async () => {
  const svg = await readFile(new URL('../examples/hello.merz.svg', import.meta.url), 'utf8');
  const midi = await readFile(new URL('../examples/hello.mid', import.meta.url));
  const parsed = parseMidiFile(midi);
  assert.equal(parsed.format, 0);
  const notes = parseMidiNotes(midi);
  assert.deepEqual(notes.map(note => note.pitch), [60, 62, 67, 69, 74]);
  const program = compileArtSvg(svg, { midiNotes: notes });
  assert.equal(program.score.length, 5);
});

test('MIDI parser rejects truncated and invalid files deterministically', async () => {
  const midi = await readFile(new URL('../examples/hello.mid', import.meta.url));
  assert.throws(() => parseMidiNotes(midi.subarray(0, 12)), error => error.code === 'INVALID_MIDI');
  assert.throws(() => parseMidiNotes(new Uint8Array([1, 2, 3, 4])), error => error.code === 'INVALID_MIDI');
  assert.throws(() => parseMidiNotes(midi, { track: 4 }), RangeError);
});

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, value); }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.nodeType = 1;
    this.children = [];
    this.style = new FakeStyle();
    this.listeners = new Map();
    this.textContent = '';
    this.value = '';
    this.parentNode = null;
    this.type = '';
    this._id = '';
  }
  set id(value) {
    this._id = String(value);
    if (this._id) this.ownerDocument.byId.set(this._id, this);
  }
  get id() { return this._id; }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  contains(candidate) {
    return candidate === this || this.children.some(child => child.contains(candidate));
  }
  querySelector(selector) {
    if (!selector.startsWith('#')) return null;
    const candidate = this.ownerDocument.getElementById(selector.slice(1));
    return candidate && this.contains(candidate) ? candidate : null;
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type) { for (const handler of this.listeners.get(type) ?? []) handler(); }
  click() { this.emit('click'); }
}

class FakeDocument {
  constructor() {
    this.byId = new Map();
    this.app = new FakeElement('div', this);
    this.app.id = 'app';
  }
  createElement(tagName) { return new FakeElement(tagName, this); }
  getElementById(id) { return this.byId.get(id) ?? null; }
  querySelector(selector) {
    if (selector.startsWith('#')) return this.getElementById(selector.slice(1));
    return null;
  }
}

test('combined SVG + MIDI + MerzScript creates an interactive web app', async () => {
  const document = new FakeDocument();
  const svg = await readFile(new URL('../examples/button.merz.svg', import.meta.url), 'utf8');
  const midi = await readFile(new URL('../examples/button.mid', import.meta.url));
  const program = compileArtSvg(svg, { midiNotes: parseMidiNotes(midi) });
  const host = new BrowserHost({ root: document.app, consoleElement: null, documentRef: document });
  const vm = new MerzatoVM(program, host);
  await vm.run();

  const button = document.getElementById('paintedButton');
  assert.ok(button);
  assert.equal(button.type, 'button');
  assert.equal(button.textContent, 'Painted button');
  assert.equal(document.app.children[0], button);

  button.click();
  await vm.runQueue;
  assert.equal(button.textContent, 'The painting clicked back.');
});

test('browser click event handlers are serialized during rapid input', async () => {
  const document = new FakeDocument();
  const source = await readFile(new URL('../examples/counter.mza', import.meta.url), 'utf8');
  const host = new BrowserHost({ root: document.app, consoleElement: null, documentRef: document });
  const vm = new MerzatoVM(assemble(source), host);
  await vm.run();

  const button = document.getElementById('counterButton');
  button.click();
  button.click();
  button.click();
  await vm.runQueue;
  assert.equal(button.textContent, 'Count: 3');
});

test('browser input values are captured and queued atomically', async () => {
  const document = new FakeDocument();
  const input = document.createElement('input');
  input.id = 'input';
  document.app.appendChild(input);
  const program = assemble(`
    .entry main
    main:
      push on_input
      load r0
      merz "WHEN THE AUDIENCE TYPES"
      halt
    on_input:
      store r1
      halt
  `);
  const host = new BrowserHost({ root: document.app, consoleElement: null, documentRef: document });
  const vm = new MerzatoVM(program, host);
  vm.registers[0] = input;
  await vm.run();

  input.value = 'first'; input.emit('input');
  input.value = 'second'; input.emit('input');
  input.value = 'third'; input.emit('input');
  await vm.runQueue;
  assert.equal(vm.registers[1], 'third');
});

test('BrowserHost confines DOM access to its root', async () => {
  const document = new FakeDocument();
  const outside = document.createElement('div');
  outside.id = 'outside';
  const program = assemble('push "changed"\nload r0\nmerz "APPLAUD"\nhalt');
  const host = new BrowserHost({ root: document.app, consoleElement: null, documentRef: document });
  const vm = new MerzatoVM(program, host);
  vm.registers[0] = outside;
  await assert.rejects(vm.run(), error => error.code === 'DOM_SCOPE_VIOLATION');
});

test('BrowserHost denies network by default and enforces allowed origins', async () => {
  const document = new FakeDocument();
  const program = assemble('push "https://example.com/data"\nmerz "BORROW THE INTERNET"\nhalt');
  const denied = new MerzatoVM(
    program,
    new BrowserHost({ root: document.app, consoleElement: null, documentRef: document })
  );
  await assert.rejects(denied.run(), error => error.code === 'CAPABILITY_DENIED');

  const fetchCalls = [];
  const host = new BrowserHost({
    root: document.app,
    consoleElement: null,
    documentRef: document,
    capabilities: { network: true },
    allowedOrigins: ['https://example.com'],
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      return {
        ok: true,
        status: 200,
        headers: { get: () => '2' },
        text: async () => 'ok'
      };
    }
  });
  const allowed = new MerzatoVM(program, host);
  await allowed.run();
  assert.equal(allowed.stack.at(-1), 'ok');
  assert.equal(fetchCalls[0].url, 'https://example.com/data');

  const wrongOrigin = new MerzatoVM(
    assemble('push "https://evil.example/data"\nmerz "BORROW THE INTERNET"'),
    host
  );
  await assert.rejects(wrongOrigin.run(), error => error.code === 'NETWORK_POLICY_DENIED');
});


test('BrowserHost stops oversized streaming responses before buffering the full body', async () => {
  const document = new FakeDocument();
  let reads = 0;
  const chunks = [new Uint8Array([65, 66]), new Uint8Array([67, 68])];
  const host = new BrowserHost({
    root: document.app,
    consoleElement: null,
    documentRef: document,
    capabilities: { network: true },
    allowedOrigins: ['https://example.com'],
    maxResponseBytes: 3,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: async () => reads < chunks.length
            ? { done: false, value: chunks[reads++] }
            : { done: true },
          cancel: async () => {},
          releaseLock: () => {}
        })
      }
    })
  });
  const vm = new MerzatoVM(
    assemble(`push "https://example.com/data"
merz "BORROW THE INTERNET"`),
    host
  );
  await assert.rejects(vm.run(), error => error.code === 'RESOURCE_LIMIT');
  assert.equal(reads, 2);
});

test('disposing the browser host removes installed event handlers', async () => {
  const document = new FakeDocument();
  const button = document.createElement('button');
  button.id = 'button';
  document.app.appendChild(button);
  const program = assemble(`
    push handler
    load r0
    merz "WHEN THE AUDIENCE CLICKS"
    halt
    handler:
      load r1
      push 1
      add
      store r1
      halt
  `);
  const host = new BrowserHost({ root: document.app, consoleElement: null, documentRef: document });
  const vm = new MerzatoVM(program, host);
  vm.registers[0] = button;
  await vm.run();
  host.dispose();
  button.click();
  await vm.runQueue;
  assert.equal(vm.registers[1], 0n);
});
