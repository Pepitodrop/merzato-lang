import { MerzatoRuntimeError, MerzatoResourceError } from './errors.js';
import { normalizeMerzName } from './vm.js';

const DEFAULT_CAPABILITIES = Object.freeze({
  dom: true,
  events: true,
  style: true,
  log: true,
  network: false,
  prompt: false
});

function isElement(value) {
  return Boolean(value && typeof value === 'object' && value.nodeType === 1);
}

function capabilityConfiguration(capabilities = {}) {
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    throw new TypeError('BrowserHost capabilities must be an object');
  }
  return Object.freeze({ ...DEFAULT_CAPABILITIES, ...capabilities });
}

function normalizeOrigin(origin) {
  return String(origin).replace(/\/$/, '');
}

export class BrowserHost {
  constructor({
    root,
    consoleElement,
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    fetchImpl = globalThis.fetch,
    capabilities,
    allowedOrigins = ['self'],
    requestTimeoutMs = 10_000,
    maxResponseBytes = 1_000_000
  } = {}) {
    if (!documentRef) throw new Error('BrowserHost requires a DOM document');
    this.document = documentRef;
    this.window = windowRef;
    this.fetchImpl = fetchImpl;
    this.root = root ?? this.document.querySelector?.('#app');
    if (!this.root) throw new Error('BrowserHost requires a root element');
    this.consoleElement = consoleElement ?? this.document.querySelector?.('#console') ?? null;
    this.capabilities = capabilityConfiguration(capabilities);
    if (!Array.isArray(allowedOrigins) || !allowedOrigins.every(origin => typeof origin === 'string')) {
      throw new TypeError('allowedOrigins must be an array of strings');
    }
    if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
      throw new RangeError('requestTimeoutMs must be a positive safe integer');
    }
    if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0) {
      throw new RangeError('maxResponseBytes must be a positive safe integer');
    }
    this.allowedOrigins = new Set(allowedOrigins.map(normalizeOrigin));
    this.requestTimeoutMs = requestTimeoutMs;
    this.maxResponseBytes = maxResponseBytes;
    this.outputText = '';
    this.eventBindings = [];
    this.disposed = false;
  }

  assertActive() {
    if (this.disposed) {
      throw new MerzatoRuntimeError('BrowserHost has been disposed', { code: 'HOST_DISPOSED' });
    }
  }

  requireCapability(name) {
    this.assertActive();
    if (!this.capabilities[name]) {
      throw new MerzatoRuntimeError(`Browser capability '${name}' is disabled`, {
        code: 'CAPABILITY_DENIED',
        capability: name
      });
    }
  }

  log(text) {
    this.requireCapability('log');
    const value = String(text);
    if (this.consoleElement) {
      this.consoleElement.textContent += `${value}\n`;
    } else {
      console.log(value);
    }
  }

  output(value, mode) {
    this.assertActive();
    let text;
    if (mode === 'char') {
      const codePoint = Number(value);
      if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff ||
          (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        throw new MerzatoRuntimeError(`Invalid Unicode scalar value ${String(value)}`, {
          code: 'INVALID_CODE_POINT'
        });
      }
      text = String.fromCodePoint(codePoint);
    } else {
      text = String(value);
    }
    this.outputText += text;
    if (this.consoleElement) this.consoleElement.textContent += text;
  }

  isWithinRoot(element) {
    if (element === this.root) return true;
    if (typeof this.root.contains === 'function') return this.root.contains(element);
    let current = element?.parentNode ?? element?.parentElement;
    while (current) {
      if (current === this.root) return true;
      current = current.parentNode ?? current.parentElement;
    }
    return false;
  }

  resolveTarget(value, { allowDetached = false } = {}) {
    if (isElement(value)) {
      if (allowDetached || this.isWithinRoot(value)) return value;
      throw new MerzatoRuntimeError('DOM target is outside the Merzato root', {
        code: 'DOM_SCOPE_VIOLATION'
      });
    }

    const selector = String(value);
    if (selector === '#app' || selector === `#${this.root.id}`) return this.root;

    let target = null;
    if (typeof this.root.querySelector === 'function') {
      try {
        target = this.root.querySelector(selector);
      } catch (error) {
        throw new MerzatoRuntimeError(`Invalid DOM selector '${selector}'`, {
          code: 'INVALID_SELECTOR',
          cause: error
        });
      }
    }
    if (!target && /^#[A-Za-z][\w:.-]*$/.test(selector)) {
      const candidate = this.document.getElementById?.(selector.slice(1));
      if (candidate && this.isWithinRoot(candidate)) target = candidate;
    }
    return target;
  }

  bindEvent(target, type, handler) {
    this.requireCapability('events');
    target.addEventListener(type, handler);
    this.eventBindings.push({ target, type, handler });
  }

  currentOrigin() {
    return this.window?.location?.origin ?? null;
  }

  assertUrlAllowed(rawUrl) {
    let url;
    try {
      url = new URL(rawUrl, this.window?.location?.href ?? undefined);
    } catch (error) {
      throw new MerzatoRuntimeError(`Invalid URL '${rawUrl}'`, {
        code: 'INVALID_URL',
        cause: error
      });
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new MerzatoRuntimeError(`URL protocol '${url.protocol}' is not allowed`, {
        code: 'NETWORK_POLICY_DENIED'
      });
    }

    const origin = normalizeOrigin(url.origin);
    const selfAllowed = this.allowedOrigins.has('self') && this.currentOrigin() === url.origin;
    if (!this.allowedOrigins.has('*') && !this.allowedOrigins.has(origin) && !selfAllowed) {
      throw new MerzatoRuntimeError(`Network origin '${origin}' is not allowed`, {
        code: 'NETWORK_POLICY_DENIED',
        origin
      });
    }
    return url;
  }

  async fetchText(rawUrl) {
    this.requireCapability('network');
    if (typeof this.fetchImpl !== 'function') {
      throw new MerzatoRuntimeError('BORROW THE INTERNET requires fetch', {
        code: 'FETCH_UNAVAILABLE'
      });
    }
    const url = this.assertUrlAllowed(rawUrl);
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(), this.requestTimeoutMs)
      : null;
    try {
      const response = await this.fetchImpl(url.href, {
        method: 'GET',
        credentials: 'omit',
        redirect: 'error',
        signal: controller?.signal,
        headers: { Accept: 'text/plain, application/json;q=0.9, */*;q=0.1' }
      });
      if (!response.ok) {
        throw new MerzatoRuntimeError(`HTTP ${response.status} for ${url.href}`, {
          code: 'HTTP_ERROR',
          status: response.status
        });
      }
      const contentLength = Number(response.headers?.get?.('content-length'));
      if (Number.isFinite(contentLength) && contentLength > this.maxResponseBytes) {
        throw new MerzatoResourceError(`Network response exceeds ${this.maxResponseBytes} bytes`, {
          limit: this.maxResponseBytes
        });
      }
      if (response.body?.getReader) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let received = 0;
        let text = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.byteLength;
            if (received > this.maxResponseBytes) {
              await reader.cancel?.();
              throw new MerzatoResourceError(`Network response exceeds ${this.maxResponseBytes} bytes`, {
                limit: this.maxResponseBytes
              });
            }
            text += decoder.decode(value, { stream: true });
          }
          text += decoder.decode();
          return text;
        } finally {
          reader.releaseLock?.();
        }
      }
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > this.maxResponseBytes) {
        throw new MerzatoResourceError(`Network response exceeds ${this.maxResponseBytes} bytes`, {
          limit: this.maxResponseBytes
        });
      }
      return text;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new MerzatoRuntimeError(`Network request timed out after ${this.requestTimeoutMs}ms`, {
          code: 'NETWORK_TIMEOUT',
          cause: error
        });
      }
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  async call(name, vm) {
    const syscall = normalizeMerzName(name);
    switch (syscall) {
      case 'THIS_IS_NOT_A_BUTTON': {
        this.requireCapability('dom');
        const id = String(vm.pop());
        const text = String(vm.pop());
        const button = this.document.createElement('button');
        button.id = id;
        button.type = 'button';
        button.textContent = text;
        vm.push(button);
        return;
      }
      case 'THIS_IS_NOT_A_DIV': {
        this.requireCapability('dom');
        const id = String(vm.pop());
        const div = this.document.createElement('div');
        div.id = id;
        vm.push(div);
        return;
      }
      case 'PUT_IT_IN_THE_MUSEUM': {
        this.requireCapability('dom');
        const parent = this.resolveTarget(vm.pop());
        const child = this.resolveTarget(vm.pop(), { allowDetached: true });
        if (!parent || !child) {
          throw new MerzatoRuntimeError('Museum installation failed: invalid parent or child', {
            code: 'DOM_TARGET_NOT_FOUND'
          });
        }
        parent.appendChild(child);
        return;
      }
      case 'APPLAUD': {
        this.requireCapability('dom');
        const target = this.resolveTarget(vm.pop());
        const text = String(vm.pop());
        if (!target) {
          throw new MerzatoRuntimeError('APPLAUD target not found', { code: 'DOM_TARGET_NOT_FOUND' });
        }
        target.textContent = text;
        return;
      }
      case 'DRESS_IT_LIKE_CAPITALISM': {
        this.requireCapability('style');
        const target = this.resolveTarget(vm.pop());
        const property = String(vm.pop()).trim();
        const value = String(vm.pop());
        if (!target) {
          throw new MerzatoRuntimeError('Style target not found', { code: 'DOM_TARGET_NOT_FOUND' });
        }
        if (!/^(--[\w-]+|[a-zA-Z][\w-]*)$/.test(property) || property.toLowerCase() === 'csstext') {
          throw new MerzatoRuntimeError(`Invalid style property '${property}'`, {
            code: 'INVALID_STYLE_PROPERTY'
          });
        }
        if (typeof target.style?.setProperty === 'function') target.style.setProperty(property, value);
        else target.style[property] = value;
        return;
      }
      case 'WHEN_THE_AUDIENCE_CLICKS': {
        const target = this.resolveTarget(vm.pop());
        const label = String(vm.pop());
        if (!target) {
          throw new MerzatoRuntimeError('Click target not found', { code: 'DOM_TARGET_NOT_FOUND' });
        }
        const handler = () => {
          void vm.runFrom(label).catch(error => {
            try { this.log(`Runtime error: ${error.message}`); } catch { /* host disposed */ }
          });
        };
        this.bindEvent(target, 'click', handler);
        return;
      }
      case 'WHEN_THE_AUDIENCE_TYPES': {
        const target = this.resolveTarget(vm.pop());
        const label = String(vm.pop());
        if (!target) {
          throw new MerzatoRuntimeError('Input target not found', { code: 'DOM_TARGET_NOT_FOUND' });
        }
        const handler = () => {
          void vm.runFrom(label, { values: [String(target.value ?? '')] }).catch(error => {
            try { this.log(`Runtime error: ${error.message}`); } catch { /* host disposed */ }
          });
        };
        this.bindEvent(target, 'input', handler);
        return;
      }
      case 'THE_CRITIC_SAYS':
        this.log(String(vm.pop()));
        return;
      case 'BORROW_THE_INTERNET':
        vm.push(await this.fetchText(String(vm.pop())));
        return;
      case 'ASK_THE_AUDIENCE':
        this.requireCapability('prompt');
        if (!this.window?.prompt) {
          throw new MerzatoRuntimeError('ASK THE AUDIENCE requires window.prompt', {
            code: 'PROMPT_UNAVAILABLE'
          });
        }
        vm.push(this.window.prompt(String(vm.pop())) ?? '');
        return;
      case 'THE_PERFORMANCE_IS_OVER':
        vm.halted = true;
        return;
      default:
        throw new MerzatoRuntimeError(`Unknown MerzScript phrase '${name}'`, {
          code: 'UNKNOWN_SYSCALL'
        });
    }
  }

  dispose() {
    for (const { target, type, handler } of this.eventBindings) {
      target.removeEventListener?.(type, handler);
    }
    this.eventBindings.length = 0;
    this.disposed = true;
  }
}

export { DEFAULT_CAPABILITIES };
