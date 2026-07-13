#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { stdin, stderr, stdout } from 'node:process';
import { assemble } from './assembler.js';
import { compileArtSvg } from './artCompiler.js';
import { parseMidiNotes } from './midi.js';
import { ConsoleHost, MerzatoVM } from './vm.js';
import { VERSION } from './version.js';

function usage(stream = stdout) {
  stream.write(`Merzato ${VERSION}\n\n`);
  stream.write('Paint it. Play it. Insult the browser.\n\n');
  stream.write('Usage:\n');
  stream.write('  merzato run <program.mza|-> [--max-steps N] [--json]\n');
  stream.write('  merzato art <painting.merz.svg|-> [score.mid] [--max-steps N] [--json]\n');
  stream.write('  merzato asm <program.mza|-> [--json]\n');
  stream.write('  merzato check <program.mza|painting.merz.svg|-> [score.mid] [--json]\n');
  stream.write('  merzato --version\n');
}

function parseArguments(argv) {
  const positionals = [];
  const options = { json: false, debug: false, maxSteps: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--json') options.json = true;
    else if (value === '--debug') options.debug = true;
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

async function loadProgram(sourcePath, midiPath) {
  const source = await readSource(sourcePath, 'utf8');
  if (isArtwork(sourcePath, source)) {
    const midiNotes = midiPath ? parseMidiNotes(await readFile(midiPath)) : [];
    return compileArtSvg(source, { midiNotes, filename: sourcePath });
  }
  if (midiPath) throw new Error('A MIDI score can only be paired with .merz.svg artwork');
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

  if (command === 'run') {
    if (midiPath) throw new Error('run accepts one assembly source path');
    const program = await loadProgram(sourcePath);
    if (program.sourceType !== 'assembly') throw new Error('run expects Merzato Assembly; use art for SVG');
    const host = new ConsoleHost({ write: !options.json });
    const result = await new MerzatoVM(program, host, { maxSteps: options.maxSteps }).run();
    if (options.json) writeJson({ output: host.outputText, result });
    return;
  }

  if (command === 'art') {
    const program = await loadProgram(sourcePath, midiPath);
    if (program.sourceType !== 'svg-art') throw new Error('art expects a .merz.svg source file');
    const host = new ConsoleHost({ write: !options.json });
    const result = await new MerzatoVM(program, host, { maxSteps: options.maxSteps }).run();
    if (options.json) writeJson({ output: host.outputText, score: program.score, result });
    return;
  }

  if (command === 'asm') {
    if (midiPath) throw new Error('asm accepts one assembly source path');
    const program = assemble(await readSource(sourcePath), { filename: sourcePath });
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
    else stdout.write(`OK: ${sourcePath} (${result.instructions} instructions, ${result.labels} labels)\n`);
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
    ['UNKNOWN_LABEL', 'UNKNOWN_ENTRY', 'UNKNOWN_OPCODE', 'DUPLICATE_ENTRY', 'DUPLICATE_LABEL'].includes(error.code);
  process.exitCode = sourceError ? 2 : 1;
}
