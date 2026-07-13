import { assemble } from '../src/assembler.js';
import { compileArtSvg } from '../src/artCompiler.js';
import { BrowserHost } from '../src/browserHost.js';
import { parseMidiNotes } from '../src/midi.js';
import { MerzatoVM } from '../src/vm.js';

const sourceElement = document.querySelector('#source');
const appElement = document.querySelector('#app');
const consoleElement = document.querySelector('#console');

sourceElement.value = await fetch('../examples/counter.mza').then(response => response.text());

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
