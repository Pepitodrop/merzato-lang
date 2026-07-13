import { assemble } from '../src/assembler.js';
import { compileArtSvg } from '../src/artCompiler.js';
import { BrowserHost } from '../src/browserHost.js';
import { parseMidiNotes } from '../src/midi.js';
import { MerzatoVM } from '../src/vm.js';

const sourceElement = document.querySelector('#source');
const appElement = document.querySelector('#app');
const consoleElement = document.querySelector('#console');

async function loadExample(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load example: HTTP ${response.status}`);
  sourceElement.value = await response.text();
}

await loadExample('../examples/counter.mza');

function reset() {
  appElement.replaceChildren();
  consoleElement.textContent = '';
}

async function execute(program) {
  const host = new BrowserHost({ root: appElement, consoleElement });
  const vm = new MerzatoVM(program, host);
  await vm.run();
  return vm;
}

document.querySelector('#run').addEventListener('click', async () => {
  reset();
  try {
    await execute(assemble(sourceElement.value));
  } catch (error) {
    consoleElement.textContent = `Error: ${error.stack ?? error.message}`;
  }
});

document.querySelector('#loadMemes').addEventListener('click', async () => {
  reset();
  try {
    await loadExample('../examples/merz-memes.mza');
  } catch (error) {
    consoleElement.textContent = `Error: ${error.stack ?? error.message}`;
  }
});

document.querySelector('#runArt').addEventListener('click', async () => {
  reset();
  try {
    const [svg, midiBuffer] = await Promise.all([
      fetch('../examples/button.merz.svg').then(response => response.text()),
      fetch('../examples/button.mid').then(response => response.arrayBuffer())
    ]);
    const midiNotes = parseMidiNotes(new Uint8Array(midiBuffer));
    await execute(compileArtSvg(svg, { midiNotes }));
  } catch (error) {
    consoleElement.textContent = `Error: ${error.stack ?? error.message}`;
  }
});

document.querySelector('#reset').addEventListener('click', reset);
