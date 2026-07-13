function normalizeMerzName(name) {
  return String(name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export class ConsoleHost {
  constructor({ write = true } = {}) {
    this.write = write;
    this.outputText = '';
  }

  output(value, mode) {
    const text = mode === 'char'
      ? String.fromCodePoint(Number(value))
      : String(value);
    this.outputText += text;
    if (this.write) process.stdout.write(text);
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
        throw new Error(`MerzScript syscall '${name}' needs a browser host or custom host`);
    }
  }
}

export class MerzatoVM {
  constructor(program, host = new ConsoleHost(), options = {}) {
    this.program = program;
    this.host = host;
    this.registers = Array.from({ length: 16 }, () => 0n);
    this.stack = [];
    this.callStack = [];
    this.heap = new Map();
    this.pc = program.entry ?? 0;
    this.halted = false;
    this.running = false;
    this.maxSteps = options.maxSteps ?? 1_000_000;
    this.runQueue = Promise.resolve();
  }

  push(value) {
    this.stack.push(value);
  }

  pop() {
    if (this.stack.length === 0) throw new Error(`Stack underflow at pc=${this.pc - 1}`);
    return this.stack.pop();
  }

  peek() {
    if (this.stack.length === 0) throw new Error(`Stack underflow at pc=${this.pc - 1}`);
    return this.stack[this.stack.length - 1];
  }

  asBigInt(value) {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
    if (typeof value === 'string' && /^[+-]?\d+$/.test(value)) return BigInt(value);
    throw new TypeError(`Expected an integer, got ${String(value)}`);
  }

  isZero(value) {
    if (typeof value === 'bigint') return value === 0n;
    return value === 0 || value === false || value === '' || value === null || value === undefined;
  }

  resolveRegister(value) {
    if (!value || value.type !== 'register') throw new TypeError('Expected register operand');
    if (!Number.isInteger(value.index) || value.index < 0 || value.index >= this.registers.length) {
      throw new RangeError(`Register index out of range: ${String(value.index)}`);
    }
    return value.index;
  }

  resolveTarget(value) {
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value === 'string' && Object.hasOwn(this.program.labels, value)) {
      return this.program.labels[value];
    }
    throw new Error(`Unknown jump target '${String(value)}'`);
  }

  binaryInteger(operation) {
    const right = this.asBigInt(this.pop());
    const left = this.asBigInt(this.pop());
    this.push(operation(left, right));
  }

  async step() {
    if (this.halted) return;
    const instruction = this.program.instructions[this.pc];
    if (!instruction) {
      this.halted = true;
      return;
    }
    this.pc += 1;
    const [a] = instruction.args;

    switch (instruction.op) {
      case 'NOP': break;
      case 'PUSH':
        if (instruction.args.length !== 1) throw new Error('PUSH expects one operand');
        this.push(a);
        break;
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
          if (y === 0n) throw new RangeError('Division by zero');
          return x / y;
        });
        break;
      case 'MOD':
        this.binaryInteger((x, y) => {
          if (y === 0n) throw new RangeError('Modulo by zero');
          const result = x % y;
          return result < 0n ? result + (y < 0n ? -y : y) : result;
        });
        break;
      case 'NOT': this.push(this.isZero(this.pop()) ? 1n : 0n); break;
      case 'CMPGT': this.binaryInteger((x, y) => x > y ? 1n : 0n); break;
      case 'LOAD': this.push(this.registers[this.resolveRegister(a)]); break;
      case 'STORE': this.registers[this.resolveRegister(a)] = this.pop(); break;
      case 'HLOAD': {
        const address = this.asBigInt(this.pop()).toString();
        this.push(this.heap.get(address) ?? 0n);
        break;
      }
      case 'HSTORE': {
        const address = this.asBigInt(this.pop()).toString();
        const value = this.pop();
        this.heap.set(address, value);
        break;
      }
      case 'JMP': this.pc = this.resolveTarget(a); break;
      case 'JZ': if (this.isZero(this.pop())) this.pc = this.resolveTarget(a); break;
      case 'JNZ': if (!this.isZero(this.pop())) this.pc = this.resolveTarget(a); break;
      case 'CALL': this.callStack.push(this.pc); this.pc = this.resolveTarget(a); break;
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
      case 'SYS':
        if (instruction.args.length !== 1) throw new Error('SYS/MERZ expects exactly one phrase');
        await this.host.call(a, this);
        break;
      case 'HALT': this.halted = true; break;
      default: throw new Error(`Unsupported opcode ${instruction.op}`);
    }
  }

  async execute(maxSteps) {
    if (this.running) throw new Error('VM execution overlap detected');
    this.running = true;
    let steps = 0;
    try {
      while (!this.halted) {
        if (steps >= maxSteps) throw new Error(`Step limit exceeded (${maxSteps})`);
        await this.step();
        steps += 1;
      }
      return { steps, stack: [...this.stack], registers: [...this.registers] };
    } finally {
      this.running = false;
    }
  }

  enqueue(operation) {
    const queued = this.runQueue.then(operation, operation);
    this.runQueue = queued.catch(() => undefined);
    return queued;
  }

  run(maxSteps = this.maxSteps) {
    return this.enqueue(() => this.execute(maxSteps));
  }

  runFrom(label, maxSteps = this.maxSteps) {
    return this.enqueue(() => {
      this.pc = this.resolveTarget(label);
      this.halted = false;
      return this.execute(maxSteps);
    });
  }
}

export { normalizeMerzName };
