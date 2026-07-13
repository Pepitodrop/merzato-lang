import { normalizeMerzName } from './vm.js';

function isElement(value) {
  return value && typeof value === 'object' && value.nodeType === 1;
}

export class BrowserHost {
  constructor({
    root,
    consoleElement,
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    fetchImpl = globalThis.fetch
  } = {}) {
    if (!documentRef) throw new Error('BrowserHost requires a DOM document');
    this.document = documentRef;
    this.window = windowRef;
    this.fetchImpl = fetchImpl;
    this.root = root ?? this.document.querySelector('#app');
    this.consoleElement = consoleElement ?? this.document.querySelector('#console');
    this.outputText = '';
  }

  log(text) {
    if (this.consoleElement) {
      this.consoleElement.textContent += `${text}\n`;
    } else {
      console.log(text);
    }
  }

  output(value, mode) {
    const text = mode === 'char'
      ? String.fromCodePoint(Number(value))
      : String(value);
    this.outputText += text;
    if (this.consoleElement) this.consoleElement.textContent += text;
  }

  resolveTarget(value) {
    if (isElement(value)) return value;
    const selector = String(value);
    if (selector === '#app' && this.root) return this.root;
    return this.document.querySelector(selector) ?? this.document.getElementById(selector.replace(/^#/, ''));
  }

  async call(name, vm) {
    const syscall = normalizeMerzName(name);
    switch (syscall) {
      case 'THIS_IS_NOT_A_BUTTON': {
        const id = String(vm.pop());
        const text = String(vm.pop());
        const button = this.document.createElement('button');
        button.id = id;
        button.textContent = text;
        vm.push(button);
        return;
      }
      case 'THIS_IS_NOT_A_DIV': {
        const id = String(vm.pop());
        const div = this.document.createElement('div');
        div.id = id;
        vm.push(div);
        return;
      }
      case 'PUT_IT_IN_THE_MUSEUM': {
        const parent = this.resolveTarget(vm.pop());
        const child = this.resolveTarget(vm.pop());
        if (!parent || !child) throw new Error('Museum installation failed: invalid parent or child');
        parent.appendChild(child);
        return;
      }
      case 'APPLAUD': {
        const target = this.resolveTarget(vm.pop());
        const text = String(vm.pop());
        if (!target) throw new Error('APPLAUD target not found');
        target.textContent = text;
        return;
      }
      case 'DRESS_IT_LIKE_CAPITALISM': {
        const target = this.resolveTarget(vm.pop());
        const property = String(vm.pop());
        const value = String(vm.pop());
        if (!target) throw new Error('Style target not found');
        target.style[property] = value;
        return;
      }
      case 'WHEN_THE_AUDIENCE_CLICKS': {
        const target = this.resolveTarget(vm.pop());
        const label = String(vm.pop());
        if (!target) throw new Error('Click target not found');
        target.addEventListener('click', () => {
          void vm.runFrom(label).catch(error => this.log(`Runtime error: ${error.message}`));
        });
        return;
      }
      case 'WHEN_THE_AUDIENCE_TYPES': {
        const target = this.resolveTarget(vm.pop());
        const label = String(vm.pop());
        if (!target) throw new Error('Input target not found');
        target.addEventListener('input', () => {
          vm.push(target.value);
          void vm.runFrom(label).catch(error => this.log(`Runtime error: ${error.message}`));
        });
        return;
      }
      case 'THE_CRITIC_SAYS': this.log(String(vm.pop())); return;
      case 'BORROW_THE_INTERNET': {
        if (typeof this.fetchImpl !== 'function') throw new Error('BORROW THE INTERNET requires fetch');
        const url = String(vm.pop());
        const response = await this.fetchImpl(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
        vm.push(await response.text());
        return;
      }
      case 'ASK_THE_AUDIENCE': {
        if (!this.window?.prompt) throw new Error('ASK THE AUDIENCE requires window.prompt');
        vm.push(this.window.prompt(String(vm.pop())) ?? '');
        return;
      }
      case 'THE_PERFORMANCE_IS_OVER': vm.halted = true; return;
      default: throw new Error(`Unknown MerzScript phrase '${name}'`);
    }
  }
}
