#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { assemble } from './assembler.js';
import { compileArtSvg } from './artCompiler.js';
import { parseMidiNotes } from './midi.js';
import { ConsoleHost, MerzatoVM } from './vm.js';

const VERSION = '0.1.0';

function usage(stream = process.stdout) {
  stream.write(`Merzato ${VERSION}\n\n`);
  stream.write('Paint it. Play it. Insult the browser.\n\n');
  stream.write('Usage:\n');
  stream.write('  merzato run <program.mza>\n');
  stream.write('  merzato art <painting.merz.svg> [score.mid]\n');
  stream.write('  merzato asm <program.mza>\n');
  stream.write('  merzato check <program.mza|painting.merz.svg> [score.mid]\n');
  stream.write('  merzato --version\n');
}

function isArtwork(path) {
  return path.toLowerCase().endsWith('.merz.svg');
}

async function loadProgram(sourcePath, midiPath) {
  if (isArtwork(sourcePath)) {
    const svg = await readFile(sourcePath, 'utf8');
    const midiNotes = midiPath ? parseMidiNotes(await readFile(midiPath)) : [];
    return compileArtSvg(svg, { midiNotes });
  }
  return assemble(await readFile(sourcePath, 'utf8'));
}

const [command, sourcePath, midiPath] = process.argv.slice(2);

try {
  if (command === '--help' || command === '-h' || command === 'help') {
    usage();
  } else if (command === '--version' || command === '-v' || command === 'version') {
    console.log(VERSION);
  } else if (!command || !sourcePath) {
    usage(process.stderr);
    process.exitCode = 1;
  } else if (command === 'run') {
    const source = await readFile(sourcePath, 'utf8');
    await new MerzatoVM(assemble(source), new ConsoleHost()).run();
  } else if (command === 'art') {
    const program = await loadProgram(sourcePath, midiPath);
    if (program.sourceType !== 'svg-art') throw new Error('art expects a .merz.svg source file');
    await new MerzatoVM(program, new ConsoleHost()).run();
  } else if (command === 'asm') {
    const program = assemble(await readFile(sourcePath, 'utf8'));
    console.log(JSON.stringify(program, (_, value) => typeof value === 'bigint' ? `${value}n` : value, 2));
  } else if (command === 'check') {
    const program = await loadProgram(sourcePath, midiPath);
    console.log(`OK: ${sourcePath} (${program.instructions.length} instructions, ${Object.keys(program.labels).length} labels)`);
  } else {
    usage(process.stderr);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`merzato: ${error.message}`);
  process.exitCode = 1;
}
