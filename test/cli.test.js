import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const hello = fileURLToPath(new URL('../examples/hello.mza', import.meta.url));

function execute(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    ...options
  });
}

test('CLI reports the stable version', () => {
  const result = execute(['--version']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '1.1.0');
});

test('CLI validates files and supports JSON output', () => {
  const result = execute(['check', hello, '--json']);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.sourceType, 'assembly');
});

test('CLI executes assembly from stdin', () => {
  const result = execute(['run', '-'], { input: 'push 65\noutc\nhalt\n' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'A');
});

test('CLI uses a nonzero usage exit code for invalid programs', () => {
  const result = execute(['run', '-'], { input: 'push\n' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /expects 1 operand/);
});

test('CLI honors the maximum step limit', () => {
  const result = execute(['run', '-', '--max-steps', '3'], { input: 'loop: jmp loop\n' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Step limit exceeded/);
});

test('CLI classifies unresolved labels as source errors', () => {
  const result = execute(['run', '-'], { input: 'jmp missing\n' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown jump target/);
});
