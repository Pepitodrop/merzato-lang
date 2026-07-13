import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const example = fileURLToPath(new URL('../examples/merz-memes.mza', import.meta.url));

test('German Merz meme example prints the documented satire lines', () => {
  const result = spawnSync(process.execPath, [cli, 'run', example], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    [
      'Was ist Bubatz?',
      'Jetzt darf auch mal Rambo Zambo im Adenauer-Haus sein.',
      'Bierdeckel-Steuer',
      'Brandmauer',
      'Mehr arbeiten',
      ''
    ].join('\n')
  );
});
