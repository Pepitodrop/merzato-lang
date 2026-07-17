# Merz speech profile

The `.merz` profile lets an entire Merzato program read like exaggerated German political rhetoric associated with Friedrich Merz rather than like Assembly. It is a fictional satirical dialect, not an impersonation or quotation system, and is not affiliated with or endorsed by Friedrich Merz, the German Federal Government, the CDU, or any broadcaster.

Every accepted sentence compiles deterministically to the stable Merzato VM. Existing `.mza`, `.merz.svg`, MIDI, JavaScript API, and MerzScript programs remain compatible.

## Run it

```bash
node src/cli.js speech examples/two-counter.merz
# 5

# `run` also detects the .merz extension
node src/cli.js run examples/two-counter.merz
```

Use `check`, `asm`, `--trace`, `--json`, and `--max-steps` exactly as with Assembly:

```bash
node src/cli.js check examples/two-counter.merz
node src/cli.js asm examples/two-counter.merz --json
node src/cli.js speech examples/two-counter.merz --trace
```

## Complete sentence mapping

Each executable statement ends with a period, except the question `Was ist Bubatz?`. Blank lines and comments beginning with `#`, `//`, or `;` are ignored. Comment markers inside quoted strings remain part of the string.

| Merz speech sentence | Generated Assembly |
| --- | --- |
| `Die Regierung beginnt bei main.` | `.entry main` |
| `Zum Tagesordnungspunkt loop.` | `loop:` |
| `Wir nennen ANTWORT ab jetzt 42.` | `.const ANTWORT 42` |
| `Wir brauchen jetzt 42.` | `PUSH 42` |
| `Das nehmen wir wieder vom Tisch.` | `POP` |
| `Das sage ich ganz bewusst noch einmal.` | `DUP` |
| `Wir drehen die Reihenfolge um.` | `SWAP` |
| `Wir rechnen das zusammen, denn Leistung muss sich lohnen.` | `ADD` |
| `Wir ziehen das ab, damit der Haushalt stimmt.` | `SUB` |
| `Wir vervielfachen das für den Wirtschaftsstandort.` | `MUL` |
| `Wir teilen das durch, solide finanziert.` | `DIV` |
| `Der Rest bleibt unter der Schuldenbremse.` | `MOD` |
| `Das Gegenteil ist jetzt richtig.` | `NOT` |
| `Wir prüfen, ob das erste größer ist.` | `CMPGT` |
| `Aus dem Ministerium r0 wird geliefert.` | `LOAD r0` |
| `Das kommt jetzt in das Ministerium r0.` | `STORE r0` |
| `Wir holen das aus dem Bundesarchiv.` | `HLOAD` |
| `Wir legen das im Bundesarchiv ab.` | `HSTORE` |
| `Wir gehen jetzt ohne weitere Debatte zu loop.` | `JMP loop` |
| `Wenn das null ist, gehen wir zu ende.` | `JZ ende` |
| `Wenn das nicht null ist, gehen wir zu loop.` | `JNZ loop` |
| `Wir rufen jetzt funktion auf.` | `CALL funktion` |
| `Wir kehren zur vorherigen Debatte zurück.` | `RET` |
| `Wir formulieren das jetzt als Text.` | `TOSTR` |
| `Wir führen diese Aussagen zusammen.` | `CONCAT` |
| `Die Zahl muss jetzt raus.` | `OUTN` |
| `Der Buchstabe muss jetzt raus.` | `OUTC` |
| `Das Kanzleramt ordnet an: "APPLAUD".` | `MERZ "APPLAUD"` |
| `Ich sage ganz klar: "Text".` | `PUSH "Text"` plus `MERZ "THE CRITIC SAYS"` |
| `Wir beenden diese Debatte.` | `HALT` |
| `Dazu sage ich heute nichts.` | `NOP` |

Operands use the same literal rules as Assembly: arbitrary-precision integers, quoted strings, registers `r0` through `r15`, labels, and `$CONSTANT` references where appropriate.

## Meme aliases

Version 1.3 adds more than thirty meme-shaped aliases. They are real syntax, not a hard-coded output list. Functional aliases perform VM operations:

| Meme syntax | Operation |
| --- | --- |
| `Gehobene Mittelschicht mit 42.` | `PUSH 42` |
| `Privatflieger liefert r0.` | `LOAD r0` |
| `BlackRock verwaltet r0.` | `STORE r0` |
| `Mimimi.` | `DUP` |
| `Rambo Zambo.` | `SWAP` |
| `Mehr arbeiten.` | `ADD` |
| `Leistung muss sich lohnen.` | `ADD` |
| `Bierdeckel-Steuer.` | `MOD` |
| `Brandmauer zu loop.` | `JMP loop` |
| `Im ersten Wahlgang gescheitert, weiter zu ende.` | `JZ ende` |
| `Im zweiten Wahlgang geht es zu loop.` | `JNZ loop` |
| `The Greatest Fritz ruft helfer auf.` | `CALL helfer` |
| `Fritze Merz kehrt zurück.` | `RET` |
| `Das iPad reagiert: "Text".` | Log `Text` |
| `Der Bundeskanzler sagt: "Text".` | Log `Text` |
| `Sosej Kanzler sagt: "Text".` | Log `Text` |
| `Kalori Kanzler sagt: "Text".` | Log `Text` |
| `Aber ohne Bubatz.` | `HALT` |

The following standalone meme markers are accepted as `NOP`, allowing them to be used as labels in performances without changing machine state:

```text
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
```

Some terms are documented public meme motifs or derived from public remarks; others are community-submitted remix names. Their presence means only that the compiler recognises the satire token, not that Friedrich Merz literally said or endorsed it.

Run the thirty-item showcase:

```bash
node src/cli.js speech examples/merz-memes.merz
```

## Turing completeness

The speech profile remains Turing complete at the same abstract-machine level as Merzato Assembly because it can express all primitives needed for a two-counter Minsky machine:

- unbounded abstract counters through registers or heap cells;
- increment through load, push, addition, and store sentences;
- conditional decrement through loading, zero testing, subtraction, and storing;
- arbitrary control flow through agenda-point labels and jumps.

`examples/two-counter.merz` implements this construction directly. The meme aliases are additive shorthand and do not remove or alter any primitive. Concrete runs remain bounded by configured resource limits and physical memory, as with every real implementation of a Turing-complete language.

## JavaScript API

```js
import { compileMerzSpeech, ConsoleHost, MERZ_MEME_RULES, MerzatoVM } from 'merzato-lang';

const program = compileMerzSpeech(`
Die Regierung beginnt bei main.
Zum Tagesordnungspunkt main.
Gehobene Mittelschicht mit 40.
Gehobene Mittelschicht mit 2.
Mehr arbeiten.
Die Zahl muss jetzt raus.
Aber ohne Bubatz.
`);

const host = new ConsoleHost({ write: false });
await new MerzatoVM(program, host).run();
console.log(host.outputText); // 42
console.log(MERZ_MEME_RULES.length); // 30+
```

`transpileMerzSpeech(source)` returns the generated canonical Assembly text for inspection or tooling.
