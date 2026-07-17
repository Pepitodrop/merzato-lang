import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assemble, ConsoleHost, MerzatoVM } from '../src/index.js';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const example = fileURLToPath(new URL('../examples/constants.mza', import.meta.url));

test('named constants support forward references and typed literals', async () => {
  const program = assemble(`
.entry main
main:
  push $MESSAGE
  pop
  push $ANSWER
  store $TARGET
  load $TARGET
  outn
  halt
.const MESSAGE "The answer is"
.const ANSWER 42
.const TARGET r3
`);

  assert.equal(program.instructions[0].args[0], 'The answer is');
  assert.equal(program.instructions[2].args[0], 42n);
  assert.deepEqual(program.instructions[3].args[0], { type: 'register', index: 3 });

  const host = new ConsoleHost({ write: false });
  await new MerzatoVM(program, host).run();
  assert.equal(host.outputText, '42');
});

test('named constants reject missing and duplicate definitions', () => {
  assert.throws(
    () => assemble('push $MISSING'),
    error => error.code === 'UNKNOWN_CONSTANT'
  );
  assert.throws(
    () => assemble('.const VALUE 1\n.const VALUE 2\nhalt'),
    error => error.code === 'DUPLICATE_CONSTANT'
  );
  assert.throws(
    () => assemble('.const TARGET some_label\nhalt'),
    error => error.code === 'INVALID_CONSTANT'
  );
});

test('CLI trace prints each instruction to stderr without changing program output', () => {
  const result = spawnSync(process.execPath, [cli, 'run', example, '--trace'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '42\n');
  assert.match(result.stderr, /\[trace\] pc=0 line=8 PUSH 42 stack=\[\]/);
  assert.match(result.stderr, /\[trace\] pc=6 line=14 HALT/);
  assert.match(result.stderr, /\[trace\] halted steps=7 pc=7 stack=\[\]/);
});
