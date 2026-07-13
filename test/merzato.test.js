import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assemble } from '../src/assembler.js';
import { compileArtSvg } from '../src/artCompiler.js';
import { parseMidiNotes } from '../src/midi.js';
import { ConsoleHost, MerzatoVM } from '../src/vm.js';

test('assembly VM performs arithmetic and branching', async () => {
  const source = `
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
  `;
  const host = new ConsoleHost({ write: false });
  await new MerzatoVM(assemble(source), host).run();
  assert.equal(host.outputText, '42');
});

test('heap and loop can implement a counter machine', async () => {
  const source = `
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
  `;
  const host = new ConsoleHost({ write: false });
  await new MerzatoVM(assemble(source), host).run();
  assert.equal(host.outputText, '6');
});

test('painted SVG compiles to a working program', async () => {
  const svg = await readFile(new URL('../examples/hello.merz.svg', import.meta.url), 'utf8');
  const host = new ConsoleHost({ write: false });
  await new MerzatoVM(compileArtSvg(svg), host).run();
  assert.equal(host.outputText, 'Hi');
});

test('paired MIDI notes are parsed and accepted by the art compiler', async () => {
  const svg = await readFile(new URL('../examples/hello.merz.svg', import.meta.url), 'utf8');
  const midi = await readFile(new URL('../examples/hello.mid', import.meta.url));
  const notes = parseMidiNotes(midi);
  assert.deepEqual(notes.map(note => note.pitch), [60, 62, 67, 69, 74]);
  const program = compileArtSvg(svg, { midiNotes: notes });
  assert.equal(program.score.length, 5);
});

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.nodeType = 1;
    this.children = [];
    this.style = {};
    this.listeners = new Map();
    this.textContent = '';
    this._id = '';
  }
  set id(value) {
    this._id = String(value);
    this.ownerDocument.byId.set(this._id, this);
  }
  get id() { return this._id; }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  click() { this.listeners.get('click')?.(); }
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
  const { BrowserHost } = await import('../src/browserHost.js');
  const document = new FakeDocument();
  {
    const svg = await readFile(new URL('../examples/button.merz.svg', import.meta.url), 'utf8');
    const midi = await readFile(new URL('../examples/button.mid', import.meta.url));
    const program = compileArtSvg(svg, { midiNotes: parseMidiNotes(midi) });
    const host = new BrowserHost({ root: document.app, consoleElement: null, documentRef: document });
    const vm = new MerzatoVM(program, host);
    await vm.run();

    const button = document.getElementById('paintedButton');
    assert.ok(button);
    assert.equal(button.textContent, 'Painted button');
    assert.equal(document.app.children[0], button);

    button.click();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(button.textContent, 'The painting clicked back.');
  }
});


test('browser event handlers are serialized during rapid input', async () => {
  const { BrowserHost } = await import('../src/browserHost.js');
  const document = new FakeDocument();
  const source = await readFile(new URL('../examples/counter.mza', import.meta.url), 'utf8');
  const host = new BrowserHost({ root: document.app, consoleElement: null, documentRef: document });
  const vm = new MerzatoVM(assemble(source), host);
  await vm.run();

  const button = document.getElementById('counterButton');
  assert.ok(button);
  button.click();
  button.click();
  button.click();
  await vm.runQueue;

  assert.equal(button.textContent, 'Count: 3');
});
