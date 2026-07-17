import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  compileMerzSpeech,
  ConsoleHost,
  MERZ_MEME_RULES,
  MerzatoVM,
  transpileMerzSpeech
} from '../src/index.js';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const twoCounter = fileURLToPath(new URL('../examples/two-counter.merz', import.meta.url));
const memeCabinet = fileURLToPath(new URL('../examples/merz-memes.merz', import.meta.url));

function execute(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    ...options
  });
}

test('Merz speech compiles every stable VM operation', () => {
  const source = `
# Every line remains German political-style prose.
Die Regierung beginnt bei main.
Wir nennen ANTWORT ab jetzt 42.
Zum Tagesordnungspunkt main.
Wir brauchen jetzt $ANTWORT.
Das nehmen wir wieder vom Tisch.
Wir brauchen jetzt 1.
Das sage ich ganz bewusst noch einmal.
Wir drehen die Reihenfolge um.
Wir rechnen das zusammen, denn Leistung muss sich lohnen.
Wir brauchen jetzt 1.
Wir ziehen das ab, damit der Haushalt stimmt.
Wir brauchen jetzt 2.
Wir vervielfachen das für den Wirtschaftsstandort.
Wir brauchen jetzt 2.
Wir teilen das durch, solide finanziert.
Wir brauchen jetzt 2.
Der Rest bleibt unter der Schuldenbremse.
Das Gegenteil ist jetzt richtig.
Wir brauchen jetzt 1.
Wir prüfen, ob das erste größer ist.
Das kommt jetzt in das Ministerium r0.
Aus dem Ministerium r0 wird geliefert.
Wir brauchen jetzt 0.
Wir legen das im Bundesarchiv ab.
Wir brauchen jetzt 0.
Wir holen das aus dem Bundesarchiv.
Wir gehen jetzt ohne weitere Debatte zu weiter.
Wenn das null ist, gehen wir zu weiter.
Wenn das nicht null ist, gehen wir zu weiter.
Wir rufen jetzt helfer auf.
Wir formulieren das jetzt als Text.
Wir brauchen jetzt " Haushalt".
Wir führen diese Aussagen zusammen.
Die Zahl muss jetzt raus.
Der Buchstabe muss jetzt raus.
Das Kanzleramt ordnet an: "THE PERFORMANCE IS OVER".
Ich sage ganz klar: "Haushalt; aber sicher".
Dazu sage ich heute nichts.
Wir beenden diese Debatte.
Zum Tagesordnungspunkt helfer.
Wir kehren zur vorherigen Debatte zurück.
Zum Tagesordnungspunkt weiter.
Wir beenden diese Debatte.
`;

  const program = compileMerzSpeech(source, { filename: 'all.merz' });
  const ops = new Set(program.instructions.map(instruction => instruction.op));
  for (const op of [
    'PUSH', 'POP', 'DUP', 'SWAP', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'NOT', 'CMPGT',
    'LOAD', 'STORE', 'HLOAD', 'HSTORE', 'JMP', 'JZ', 'JNZ', 'CALL', 'RET', 'TOSTR',
    'CONCAT', 'OUTN', 'OUTC', 'SYS', 'HALT', 'NOP'
  ]) {
    assert.equal(ops.has(op), true, `missing ${op}`);
  }
  assert.equal(program.sourceType, 'merz-speech');
  assert.match(program.generatedAssembly, /\.const ANTWORT 42/);
  assert.match(transpileMerzSpeech(source), /merz "THE CRITIC SAYS"/);
});

test('functional meme aliases execute real computation', async () => {
  const program = compileMerzSpeech(`
Die Regierung beginnt bei main.
Zum Tagesordnungspunkt main.
Gehobene Mittelschicht mit 40.
Gehobene Mittelschicht mit 2.
Mehr arbeiten.
BlackRock verwaltet r0.
Privatflieger liefert r0.
Die Zahl muss jetzt raus.
Aber ohne Bubatz.
`);
  const host = new ConsoleHost({ write: false });
  const result = await new MerzatoVM(program, host).run();

  assert.equal(host.outputText, '42');
  assert.equal(result.registers[0], 42n);
  assert.equal(result.halted, true);
});

test('at least thirty Merz meme aliases are accepted as language syntax', () => {
  assert.ok(MERZ_MEME_RULES.length >= 30);
  const source = `
Die Regierung beginnt bei main.
Zum Tagesordnungspunkt main.
Was ist Bubatz?
Merz leck Eier.
Mehrzweckeier.
Der Bundeskanzler.
Sosej Kanzler Halal.
Kalori Kanzler.
The Greatest Fritz.
Fritze Merz.
Rambo Zambo im Adenauer-Haus.
Aber erst ab 18 Uhr.
Das iPad nickt.
Sauerland Airlines.
Mittelschicht mit Privatflugzeug.
Kanzler im zweiten Versuch.
Deutschland muss wieder arbeiten.
Bubatz im Adenauer-Haus.
Regierungsflieger statt Privatflieger.
Gehobene Mittelschicht mit 1.
Mimimi.
Rambo Zambo.
Bierdeckel-Steuer.
Brandmauer zu ende.
Im ersten Wahlgang gescheitert, weiter zu ende.
Im zweiten Wahlgang geht es zu ende.
The Greatest Fritz ruft helfer auf.
Das iPad reagiert: "Kommentar gelesen".
Der Bundeskanzler sagt: "Mehr arbeiten".
Sosej Kanzler sagt: "Halal".
Kalori Kanzler sagt: "Kalorien".
Aber ohne Bubatz.
Zum Tagesordnungspunkt helfer.
Fritze Merz kehrt zurück.
Zum Tagesordnungspunkt ende.
Wir beenden diese Debatte.
`;

  const program = compileMerzSpeech(source);
  assert.equal(program.sourceType, 'merz-speech');
  assert.match(program.generatedAssembly, /push 1\ndup\nswap\nmod/);
  assert.match(program.generatedAssembly, /jmp ende\njz ende\njnz ende/);
  assert.match(program.generatedAssembly, /call helfer/);
});

test('expanded meme cabinet contains thirty satire references', () => {
  const result = execute(['speech', memeCabinet]);
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trim().split('\n');
  assert.equal(lines.length, 30);
  for (const phrase of [
    'Merz leck Eier',
    'Mehrzweckeier',
    'Sosej Kanzler Halal',
    'Kalori Kanzler',
    'The Greatest Fritz',
    'Das iPad reagiert',
    'Mittelschicht mit Privatflugzeug',
    'Kanzler im zweiten Versuch',
    'BlackRock-Bumerang',
    'Regierungsflieger statt Privatflieger'
  ]) {
    assert.ok(lines.includes(phrase), `missing meme: ${phrase}`);
  }
});

test('Merz speech expresses a two-counter-machine loop', async () => {
  const source = await readFile(twoCounter, 'utf8');
  const program = compileMerzSpeech(source, { filename: twoCounter });
  const host = new ConsoleHost({ write: false });
  const result = await new MerzatoVM(program, host).run();

  assert.equal(host.outputText, '5\n');
  assert.equal(result.registers[0], 0n);
  assert.equal(result.registers[1], 5n);
  assert.equal(result.halted, true);
});

test('CLI runs and validates .merz speech files', () => {
  const run = execute(['speech', twoCounter]);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, '5\n');

  const auto = execute(['run', twoCounter]);
  assert.equal(auto.status, 0, auto.stderr);
  assert.equal(auto.stdout, '5\n');

  const check = execute(['check', twoCounter, '--json']);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).sourceType, 'merz-speech');
});

test('unknown political prose is rejected with its source line', () => {
  assert.throws(
    () => compileMerzSpeech('Das wird schon irgendwie funktionieren.'),
    error => error.code === 'UNKNOWN_SPEECH' && error.line === 1
  );

  const result = execute(['speech', '-'], { input: 'Das wird schon irgendwie funktionieren.\n' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /do not understand this Merz-style statement/i);
});
