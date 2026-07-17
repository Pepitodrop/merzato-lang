#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { stdin, stderr, stdout } from 'node:process';
import { assemble } from './assembler.js';
import { compileArtSvg } from './artCompiler.js';
import { MerzatoResourceError } from './errors.js';
import { compileMerzSpeech } from './merzSpeech.js';
import { parseMidiNotes } from './midi.js';
import { ConsoleHost, MerzatoVM } from './vm.js';
import { VERSION } from './version.js';

function usage(stream = stdout) {
  stream.write(`Merzato ${VERSION}\n\n`);
  stream.write('Paint it. Play it. Debate it like the Chancellor.\n\n');
  stream.write('Usage:\n');
  stream.write('  merzato run <program.mza|program.merz|-> [--max-steps N] [--trace] [--json]\n');
  stream.write('  merzato speech <program.merz|-> [--max-steps N] [--trace] [--json]\n');
  stream.write('  merzato art <painting.merz.svg|-> [score.mid] [--max-steps N] [--trace] [--json]\n');
  stream.write('  merzato asm <program.mza|program.merz|-> [--json]\n');
  stream.write('  merzato check <program.mza|program.merz|painting.merz.svg|-> [score.mid] [--json]\n');
  stream.write('  merzato --version\n');
}

function parseArguments(argv) {
  const positionals = [];
  const options = { json: false, debug: false, trace: false, maxSteps: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--json') options.json = true;
    else if (value === '--debug') options.debug = true;
    else if (value === '--trace') options.trace = true;
    else if (value === '--max-steps') {
      const raw = argv[++index];
      if (raw === undefined) throw new Error('--max-steps requires a value');
      options.maxSteps = Number(raw);
    } else if (value.startsWith('--max-steps=')) {
      options.maxSteps = Number(value.slice('--max-steps='.length));
    } else if (value.startsWith('-') && value !== '-') {
      throw new Error(`Unknown option '${value}'`);
    } else {
      positionals.push(value);
    }
  }
  if (options.maxSteps !== undefined &&
      (!Number.isSafeInteger(options.maxSteps) || options.maxSteps <= 0)) {
    throw new Error('--max-steps must be a positive safe integer');
  }
  return { positionals, options };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function readSource(path, encoding = 'utf8') {
  if (path === '-') {
    if (encoding !== 'utf8') throw new Error('Binary MIDI input cannot be read from stdin');
    return readStdin();
  }
  return readFile(path, encoding);
}

function isArtwork(path, source = '') {
  return path.toLowerCase().endsWith('.merz.svg') || (path === '-' && /<svg\b/i.test(source));
}

function isSpeech(path, source = '') {
  return (path.toLowerCase().endsWith('.merz') && !path.toLowerCase().endsWith('.merz.svg')) ||
    (path === '-' && /(?:Die Regierung beginnt bei|Zum Tagesordnungspunkt|Wir brauchen jetzt)/i.test(source));
}

async function loadProgram(sourcePath, midiPath, { forceSpeech = false } = {}) {
  const source = await readSource(sourcePath, 'utf8');
  if (isArtwork(sourcePath, source)) {
    const midiNotes = midiPath ? parseMidiNotes(await readFile(midiPath)) : [];
    return compileArtSvg(source, { midiNotes, filename: sourcePath });
  }
  if (midiPath) throw new Error('A MIDI score can only be paired with .merz.svg artwork');
  if (forceSpeech || isSpeech(sourcePath, source)) {
    return compileMerzSpeech(source, { filename: sourcePath });
  }
  return assemble(source, { filename: sourcePath });
}

function jsonReplacer(_, value) {
  if (typeof value === 'bigint') return `${value}n`;
  if (value && value.nodeType === 1) return `[Element ${value.tagName ?? 'unknown'}]`;
  return value;
}

function writeJson(value) {
  stdout.write(`${JSON.stringify(value, jsonReplacer, 2)}\n`);
}

function errorPayload(error) {
  return {
    error: {
      name: error.name,
      code: error.code ?? 'CLI_ERROR',
      message: error.message,
      line: error.line,
      artOrder: error.artOrder,
      pc: error.pc
    }
  };
}

function traceValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (value && typeof value === 'object' && value.type === 'register') return `r${value.index}`;
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value, jsonReplacer) ?? String(value);
  } catch {
    return String(value);
  }
}

function traceInstruction(instruction) {
  if (!instruction) return '<end>';
  const operands = instruction.args.map(traceValue).join(' ');
  return operands ? `${instruction.op} ${operands}` : instruction.op;
}

function traceStack(stack) {
  return `[${stack.map(traceValue).join(', ')}]`;
}

async function executeProgram(program, host, options) {
  const vm = new MerzatoVM(program, host, { maxSteps: options.maxSteps });
  if (!options.trace) return vm.run();

  const maxSteps = options.maxSteps ?? vm.maxSteps;
  let steps = 0;
  while (!vm.halted) {
    if (steps >= maxSteps) {
      throw new MerzatoResourceError(`Step limit exceeded (${maxSteps})`, {
        limit: maxSteps,
        pc: vm.pc
      });
    }
    const instruction = vm.program.instructions[vm.pc];
    const line = instruction?.line === undefined ? '' : ` line=${instruction.line}`;
    const artOrder = instruction?.artOrder === undefined ? '' : ` art=${instruction.artOrder}`;
    stderr.write(
      `[trace] pc=${vm.pc}${line}${artOrder} ${traceInstruction(instruction)} stack=${traceStack(vm.stack)}\n`
    );
    await vm.step();
    steps += 1;
  }

  stderr.write(`[trace] halted steps=${steps} pc=${vm.pc} stack=${traceStack(vm.stack)}\n`);
  return vm.snapshot(steps);
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 1 && ['--help', '-h', 'help'].includes(rawArgs[0])) {
    usage();
    return;
  }
  if (rawArgs.length === 1 && ['--version', '-v', 'version'].includes(rawArgs[0])) {
    stdout.write(`${VERSION}\n`);
    return;
  }
  const { positionals, options } = parseArguments(rawArgs);
  const [command, sourcePath, midiPath, ...extra] = positionals;

  if (!command || !sourcePath || extra.length > 0) {
    usage(stderr);
    process.exitCode = 2;
    return;
  }

  if (command === 'run' || command === 'speech') {
    if (midiPath) throw new Error(`${command} accepts one source path`);
    const program = await loadProgram(sourcePath, undefined, { forceSpeech: command === 'speech' });
    if (!['assembly', 'merz-speech'].includes(program.sourceType)) {
      throw new Error(`${command} expects Merzato Assembly or Merz speech; use art for SVG`);
    }
    const host = new ConsoleHost({ write: !options.json });
    const result = await executeProgram(program, host, options);
    if (options.json) writeJson({ output: host.outputText, result });
    return;
  }

  if (command === 'art') {
    const program = await loadProgram(sourcePath, midiPath);
    if (program.sourceType !== 'svg-art') throw new Error('art expects a .merz.svg source file');
    const host = new ConsoleHost({ write: !options.json });
    const result = await executeProgram(program, host, options);
    if (options.json) writeJson({ output: host.outputText, score: program.score, result });
    return;
  }

  if (command === 'asm') {
    if (midiPath) throw new Error('asm accepts one source path');
    const program = await loadProgram(sourcePath);
    if (program.sourceType === 'svg-art') throw new Error('asm expects Assembly or Merz speech source');
    writeJson(program);
    return;
  }

  if (command === 'check') {
    const program = await loadProgram(sourcePath, midiPath);
    const result = {
      ok: true,
      source: sourcePath,
      sourceType: program.sourceType,
      instructions: program.instructions.length,
      labels: Object.keys(program.labels).length
    };
    if (options.json) writeJson(result);
    else stdout.write(`OK: ${sourcePath} (${result.sourceType}, ${result.instructions} instructions, ${result.labels} labels)\n`);
    return;
  }

  throw new Error(`Unknown command '${command}'`);
}

try {
  await main();
} catch (error) {
  const jsonRequested = process.argv.includes('--json');
  if (jsonRequested) writeJson(errorPayload(error));
  else {
    stderr.write(`merzato: ${error.message}\n`);
    if (process.argv.includes('--debug') && error.stack) stderr.write(`${error.stack}\n`);
  }
  const sourceError = error instanceof SyntaxError || error.name?.includes('Validation') ||
    [
      'UNKNOWN_LABEL',
      'UNKNOWN_ENTRY',
      'UNKNOWN_OPCODE',
      'UNKNOWN_CONSTANT',
      'UNKNOWN_SPEECH',
      'DUPLICATE_ENTRY',
      'DUPLICATE_LABEL',
      'DUPLICATE_CONSTANT',
      'INVALID_CONSTANT'
    ].includes(error.code);
  process.exitCode = sourceError ? 2 : 1;
}
