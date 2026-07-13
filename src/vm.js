import {
  MerzatoResourceError,
  MerzatoRuntimeError,
  formatLocation
} from './errors.js';
import { REGISTER_COUNT, validateProgram } from './validator.js';

function normalizeMerzName(name) {
  return String(name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function positiveInteger(value, fallback, name) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return resolved;
}

export class ConsoleHost {
  constructor({ write = true, output = process.stdout } = {}) {
    this.write = write;
    this.outputStream = output;
    this.outputText = '';
  }

  output(value, mode) {
    let text;
    if (mode === 'char') {
      const codePoint = Number(value);
      if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff ||
          (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        throw new RangeError(`Invalid Unicode scalar value ${String(value)}`);
      }
      text = String.fromCodePoint(codePoint);
    } else {
      text = String(value);
    }
    this.outputText += text;
    if (this.write) this.outputStream.write(text);
  }

  async call(name, vm) {
    switch (normalizeMerzName(name)) {
      case 'THE_CRITIC_SAYS': {
        const value = vm.pop();
        const text = String(value);
        if (this.write) console.log(text);
        return;
      }
      case 'THE_PERFORMANCE_IS_OVER':
        vm.halted = true;
        return;
      default:
        throw new MerzatoRuntimeError(
          `MerzScript syscall '${name}' needs a browser host or custom host`,
          { code: 'UNSUPPORTED_SYSCALL' }
        );
    }
  }
}

export class MerzatoVM {
  constructor(program, host = new ConsoleHost(), options = {}) {
    this.program = validateProgram(program, { freeze: true });
    this.host = host;
    this.registers = Array.from({ length: REGISTER_COUNT }, () => 0n);
    this.stack = [];
    this.callStack = [];
    this.heap = new Map();
    this.pc = program.entry ?? 0;
    this.halted = false;
    this.running = false;
    this.disposed = false;
    this.maxSteps = positiveInteger(options.maxSteps, 1_000_000, 'maxSteps');
    this.maxStackDepth = positiveInteger(options.maxStackDepth, 100_000, 'maxStackDepth');
    this.maxCallDepth = positiveInteger(options.maxCallDepth, 10_000, 'maxCallDepth');
    this.maxHeapCells = positiveInteger(options.maxHeapCells, 100_000, 'maxHeapCells');
    this.maxStringLength = positiveInteger(options.maxStringLength, 1_000_000, 'maxStringLength');
    this.runQueue = Promise.resolve();
  }

  assertUsable() {
    if (this.disposed) {
      throw new MerzatoRuntimeError('The VM has been disposed', { code: 'VM_DISPOSED' });
    }
  }

  checkValue(value) {
    if (typeof value === 'string' && value.length > this.maxStringLength) {
      throw new MerzatoResourceError(`String limit exceeded (${this.maxStringLength} characters)`, {
        limit: this.maxStringLength
      });
    }
    return value;
  }

  push(value) {
    if (this.stack.length >= this.maxStackDepth) {
      throw new MerzatoResourceError(`Stack limit exceeded (${this.maxStackDepth})`, {
        limit: this.maxStackDepth
      });
    }
    this.stack.push(this.checkValue(value));
  }

  pop() {
    if (this.stack.length === 0) {
      throw new MerzatoRuntimeError('Stack underflow', { code: 'STACK_UNDERFLOW' });
    }
    return this.stack.pop();
  }

  peek() {
    if (this.stack.length === 0) {
      throw new MerzatoRuntimeError('Stack underflow', { code: 'STACK_UNDERFLOW' });
    }
    return this.stack[this.stack.length - 1];
  }

  asBigInt(value) {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
    if (typeof value === 'string' && /^[+-]?\d+$/.test(value)) return BigInt(value);
    throw new MerzatoRuntimeError(`Expected an integer, got ${String(value)}`, {
      code: 'TYPE_ERROR'
    });
  }

  isZero(value) {
    if (typeof value === 'bigint') return value === 0n;
    return value === 0 || value === false || value === '' || value === null || value === undefined;
  }

  resolveRegister(value) {
    if (!value || value.type !== 'register') {
      throw new MerzatoRuntimeError('Expected register operand', { code: 'INVALID_REGISTER' });
    }
    if (!Number.isInteger(value.index) || value.index < 0 || value.index >= this.registers.length) {
      throw new MerzatoRuntimeError(`Register index out of range: ${String(value.index)}`, {
        code: 'INVALID_REGISTER'
      });
    }
    return value.index;
  }

  resolveTarget(value) {
    let target;
    if (typeof value === 'bigint') target = Number(value);
    else if (typeof value === 'number') target = value;
    else if (typeof value === 'string' && Object.hasOwn(this.program.labels, value)) {
      target = this.program.labels[value];
    }

    if (!Number.isSafeInteger(target) || target < 0 || target > this.program.instructions.length) {
      throw new MerzatoRuntimeError(`Unknown or invalid jump target '${String(value)}'`, {
        code: 'INVALID_TARGET'
      });
    }
    return target;
  }

  binaryInteger(operation) {
    const right = this.asBigInt(this.pop());
    const left = this.asBigInt(this.pop());
    this.push(operation(left, right));
  }

  instructionLocation(instruction, pc) {
    return {
      pc,
      line: instruction?.line,
      artOrder: instruction?.artOrder,
      filename: this.program.filename
    };
  }

  contextualize(error, instruction, pc) {
    if (error instanceof MerzatoRuntimeError && error.pc !== undefined) return error;
    const location = this.instructionLocation(instruction, pc);
    const suffix = formatLocation(location);
    const wrapped = error instanceof MerzatoRuntimeError
      ? new error.constructor(`${error.message}${suffix}`, { ...error, ...location, cause: error })
      : new MerzatoRuntimeError(`${error.message ?? String(error)}${suffix}`, {
          code: error.code ?? 'RUNTIME_ERROR',
          ...location,
          cause: error
        });
    return wrapped;
  }

  async step() {
    this.assertUsable();
    if (this.halted) return;
    const currentPc = this.pc;
    const instruction = this.program.instructions[currentPc];
    if (!instruction) {
      this.halted = true;
      return;
    }
    this.pc += 1;
    const [a] = instruction.args;

    try {
      switch (instruction.op) {
        case 'NOP': break;
        case 'PUSH': this.push(a); break;
        case 'POP': this.pop(); break;
        case 'DUP': this.push(this.peek()); break;
        case 'SWAP': {
          const x = this.pop();
          const y = this.pop();
          this.push(x);
          this.push(y);
          break;
        }
        case 'ADD': this.binaryInteger((x, y) => x + y); break;
        case 'SUB': this.binaryInteger((x, y) => x - y); break;
        case 'MUL': this.binaryInteger((x, y) => x * y); break;
        case 'DIV':
          this.binaryInteger((x, y) => {
            if (y === 0n) throw new MerzatoRuntimeError('Division by zero', { code: 'DIVISION_BY_ZERO' });
            return x / y;
          });
          break;
        case 'MOD':
          this.binaryInteger((x, y) => {
            if (y === 0n) throw new MerzatoRuntimeError('Modulo by zero', { code: 'DIVISION_BY_ZERO' });
            const result = x % y;
            return result < 0n ? result + (y < 0n ? -y : y) : result;
          });
          break;
        case 'NOT': this.push(this.isZero(this.pop()) ? 1n : 0n); break;
        case 'CMPGT': this.binaryInteger((x, y) => x > y ? 1n : 0n); break;
        case 'LOAD': this.push(this.registers[this.resolveRegister(a)]); break;
        case 'STORE': this.registers[this.resolveRegister(a)] = this.checkValue(this.pop()); break;
        case 'HLOAD': {
          const address = this.asBigInt(this.pop()).toString();
          this.push(this.heap.get(address) ?? 0n);
          break;
        }
        case 'HSTORE': {
          const address = this.asBigInt(this.pop()).toString();
          const value = this.checkValue(this.pop());
          if (!this.heap.has(address) && this.heap.size >= this.maxHeapCells) {
            throw new MerzatoResourceError(`Heap cell limit exceeded (${this.maxHeapCells})`, {
              limit: this.maxHeapCells
            });
          }
          this.heap.set(address, value);
          break;
        }
        case 'JMP': this.pc = this.resolveTarget(a); break;
        case 'JZ': if (this.isZero(this.pop())) this.pc = this.resolveTarget(a); break;
        case 'JNZ': if (!this.isZero(this.pop())) this.pc = this.resolveTarget(a); break;
        case 'CALL':
          if (this.callStack.length >= this.maxCallDepth) {
            throw new MerzatoResourceError(`Call stack limit exceeded (${this.maxCallDepth})`, {
              limit: this.maxCallDepth
            });
          }
          this.callStack.push(this.pc);
          this.pc = this.resolveTarget(a);
          break;
        case 'RET':
          if (this.callStack.length === 0) this.halted = true;
          else this.pc = this.callStack.pop();
          break;
        case 'TOSTR': this.push(String(this.pop())); break;
        case 'CONCAT': {
          const right = String(this.pop());
          const left = String(this.pop());
          this.push(left + right);
          break;
        }
        case 'OUTN': await this.host.output(this.asBigInt(this.pop()), 'number', this); break;
        case 'OUTC': await this.host.output(this.asBigInt(this.pop()), 'char', this); break;
        case 'SYS': await this.host.call(a, this); break;
        case 'HALT': this.halted = true; break;
        default:
          throw new MerzatoRuntimeError(`Unsupported opcode ${instruction.op}`, {
            code: 'UNKNOWN_OPCODE'
          });
      }
    } catch (error) {
      throw this.contextualize(error, instruction, currentPc);
    }
  }

  async execute(maxSteps) {
    this.assertUsable();
    if (this.running) {
      throw new MerzatoRuntimeError('VM execution overlap detected', { code: 'EXECUTION_OVERLAP' });
    }
    this.running = true;
    let steps = 0;
    try {
      while (!this.halted) {
        if (steps >= maxSteps) {
          throw new MerzatoResourceError(`Step limit exceeded (${maxSteps})`, {
            limit: maxSteps,
            pc: this.pc
          });
        }
        await this.step();
        steps += 1;
      }
      return this.snapshot(steps);
    } finally {
      this.running = false;
    }
  }

  snapshot(steps = 0) {
    return Object.freeze({
      steps,
      pc: this.pc,
      halted: this.halted,
      stack: Object.freeze([...this.stack]),
      registers: Object.freeze([...this.registers]),
      heapSize: this.heap.size
    });
  }

  enqueue(operation) {
    this.assertUsable();
    const queued = this.runQueue.then(operation, operation);
    this.runQueue = queued.catch(() => undefined);
    return queued;
  }

  run(maxSteps = this.maxSteps) {
    return this.enqueue(() => this.execute(positiveInteger(maxSteps, this.maxSteps, 'maxSteps')));
  }

  runFrom(label, options = {}) {
    const normalized = typeof options === 'number' ? { maxSteps: options } : options;
    const maxSteps = positiveInteger(normalized.maxSteps, this.maxSteps, 'maxSteps');
    const values = normalized.values ?? [];
    if (!Array.isArray(values)) throw new TypeError('runFrom values must be an array');

    return this.enqueue(() => {
      if (this.stack.length + values.length > this.maxStackDepth) {
        throw new MerzatoResourceError(`Stack limit exceeded (${this.maxStackDepth})`, {
          limit: this.maxStackDepth
        });
      }
      const checkedValues = values.map(value => this.checkValue(value));
      this.pc = this.resolveTarget(label);
      this.halted = false;
      for (const value of checkedValues) this.push(value);
      return this.execute(maxSteps);
    });
  }

  reset({ clearMemory = true } = {}) {
    if (this.running) {
      throw new MerzatoRuntimeError('Cannot reset a running VM', { code: 'EXECUTION_OVERLAP' });
    }
    this.pc = this.program.entry ?? 0;
    this.halted = false;
    this.stack.length = 0;
    this.callStack.length = 0;
    if (clearMemory) {
      this.registers.fill(0n);
      this.heap.clear();
    }
  }

  dispose() {
    if (this.running) {
      throw new MerzatoRuntimeError('Cannot dispose a running VM', { code: 'EXECUTION_OVERLAP' });
    }
    this.host?.dispose?.();
    this.disposed = true;
  }
}

export { normalizeMerzName };
