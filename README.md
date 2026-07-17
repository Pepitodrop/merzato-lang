# Merzato

[![CI](https://github.com/Pepitodrop/merzato-lang/actions/workflows/ci.yml/badge.svg)](https://github.com/Pepitodrop/merzato-lang/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Pepitodrop/merzato-lang/actions/workflows/codeql.yml/badge.svg)](https://github.com/Pepitodrop/merzato-lang/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933)](https://nodejs.org/)
[![Version 1.3.0](https://img.shields.io/badge/version-1.3.0-blue.svg)](./CHANGELOG.md)
[![Try online](https://img.shields.io/badge/try-online-brightgreen.svg)](https://pepitodrop.github.io/merzato-lang/)

> **Paint it. Play it. Debate it like the Chancellor.**

**Merzato** is a Turing-complete art programming language whose primary `.merz` syntax reads like exaggerated German political rhetoric associated with Friedrich Merz. The sentences compile to a validated register/stack virtual machine, so the language supports loops, memory, functions, arithmetic, browser applications, and arbitrary computation rather than merely printing jokes.

The speech profile is fictional political satire. It is not an impersonation or quotation system and is not affiliated with or endorsed by Friedrich Merz, the German Federal Government, the CDU, or any broadcaster. Meme names may be public motifs, derived satire, or community-submitted remixes; their inclusion is not a claim that Friedrich Merz literally said or endorsed them.

Merzato retains its original artistic layers:

- **Piet-style visual semantics:** SVG colour transitions select operations;
- **Velato-inspired musical semantics:** MIDI intervals select operands;
- **MerzScript absurdism:** joke-language phrases invoke explicit browser capabilities;
- **Assembly compatibility:** `.mza` remains the canonical low-level representation.

Version **1.3.0** adds more than thirty functional and marker-style Friedrich-Merz meme aliases while remaining compatible with all Merzato 1.0–1.2 programs.

## Try it

Open the hosted playground:

**https://pepitodrop.github.io/merzato-lang/**

Or run it locally with Node.js 20 or newer:

```bash
git clone https://github.com/Pepitodrop/merzato-lang.git
cd merzato-lang
npm ci
npm run ci
npm run serve
```

Then open `http://localhost:8080/web/`. The package has no runtime dependencies.

## Hello, Chancellor

Create `hello.merz`:

```text
Die Regierung beginnt bei main.

Zum Tagesordnungspunkt main.
  Der Bundeskanzler sagt: "Wir müssen dieses Hello World jetzt gemeinsam anpacken".
  Aber ohne Bubatz.
```

Run it:

```bash
node src/cli.js speech hello.merz
```

Output:

```text
Wir müssen dieses Hello World jetzt gemeinsam anpacken
```

The regular `run` command also detects `.merz` files:

```bash
node src/cli.js run hello.merz
```

## Meme syntax that performs real work

The memes are language tokens, not only strings in an example. This valid program calculates `42`:

```text
Die Regierung beginnt bei main.

Zum Tagesordnungspunkt main.
  Gehobene Mittelschicht mit 40.
  Gehobene Mittelschicht mit 2.
  Mehr arbeiten.
  BlackRock verwaltet r0.
  Privatflieger liefert r0.
  Die Zahl muss jetzt raus.
  Aber ohne Bubatz.
```

Representative functional aliases:

| Meme syntax | VM operation |
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
| `Das iPad reagiert: "Text".` | Log text |
| `Der Bundeskanzler sagt: "Text".` | Log text |
| `Sosej Kanzler sagt: "Text".` | Log text |
| `Kalori Kanzler sagt: "Text".` | Log text |
| `Aber ohne Bubatz.` | `HALT` |

Accepted standalone performance markers compile to `NOP` and therefore do not alter machine state:

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

Run the thirty-reference showcase:

```bash
node src/cli.js speech examples/merz-memes.merz
```

## A real loop

This program transfers five units from counter `r0` to `r1` using a conditional loop:

```text
Die Regierung beginnt bei main.

Zum Tagesordnungspunkt main.
  Wir brauchen jetzt 5.
  Das kommt jetzt in das Ministerium r0.
  Wir brauchen jetzt 0.
  Das kommt jetzt in das Ministerium r1.

Zum Tagesordnungspunkt schleife.
  Aus dem Ministerium r0 wird geliefert.
  Wenn das null ist, gehen wir zu ende.

  Aus dem Ministerium r0 wird geliefert.
  Wir brauchen jetzt 1.
  Wir ziehen das ab, damit der Haushalt stimmt.
  Das kommt jetzt in das Ministerium r0.

  Aus dem Ministerium r1 wird geliefert.
  Wir brauchen jetzt 1.
  Mehr arbeiten.
  Das kommt jetzt in das Ministerium r1.
  Brandmauer zu schleife.

Zum Tagesordnungspunkt ende.
  Aus dem Ministerium r1 wird geliefert.
  Die Zahl muss jetzt raus.
  Aber ohne Bubatz.
```

Run the included version:

```bash
node src/cli.js speech examples/two-counter.merz
# 5
```

## Why it is Turing complete

The speech compiler exposes the operations needed to simulate a two-counter Minsky machine:

- arbitrary-precision counters in registers or heap cells;
- increment and decrement through load, push, arithmetic, and store sentences;
- zero testing through conditional jumps;
- arbitrary loops through labels and jumps.

The meme aliases are additive shorthand for the same primitives. They do not remove or weaken the existing Turing-complete construction. Real executions remain bounded by configured limits and physical memory, as with every practical implementation.

## Browser application

The hosted playground starts with a working interactive counter written in the speech dialect. MerzScript syscalls can create and update DOM elements, attach serialized event handlers, style elements, log values, and—when explicitly enabled—perform bounded network requests.

```text
Wir brauchen jetzt "Count: 0".
Wir brauchen jetzt "counterButton".
Das Kanzleramt ordnet an: "THIS IS NOT A BUTTON".
```

See `examples/chancellor-counter.merz` for the complete application.

## CLI

```bash
# Speech source
node src/cli.js speech examples/two-counter.merz
node src/cli.js run examples/merz-memes.merz

# Validate or inspect without running
node src/cli.js check examples/two-counter.merz
node src/cli.js asm examples/two-counter.merz --json

# Trace every generated instruction
node src/cli.js speech examples/two-counter.merz --trace

# Existing Assembly and SVG + MIDI remain supported
node src/cli.js run examples/hello.mza
node src/cli.js art examples/hello.merz.svg examples/hello.mid
```

Trace output goes to standard error and identifies the original `.merz` source line.

## JavaScript API

```js
import {
  compileMerzSpeech,
  ConsoleHost,
  MERZ_MEME_RULES,
  MerzatoVM,
  transpileMerzSpeech
} from 'merzato-lang';

const source = `
Die Regierung beginnt bei main.
Zum Tagesordnungspunkt main.
Gehobene Mittelschicht mit 40.
Gehobene Mittelschicht mit 2.
Mehr arbeiten.
Die Zahl muss jetzt raus.
Aber ohne Bubatz.
`;

console.log(transpileMerzSpeech(source));
console.log(MERZ_MEME_RULES.length); // 30+

const program = compileMerzSpeech(source);
const host = new ConsoleHost({ write: false });
await new MerzatoVM(program, host).run();
console.log(host.outputText); // 42
```

The package includes TypeScript declarations and a `merzato-lang/speech` subpath export.

## Secure embedding

Merzato programs are code, not passive media. The runtime provides bounded instructions, stacks, heap, strings, SVG/MIDI inputs, and network responses; strict validation; original source locations; root-confined browser DOM access; disabled-by-default network and prompt capabilities; explicit origin allowlists; and disposable event bindings.

See [`SECURITY.md`](./SECURITY.md) for the trust model.

## Compatibility

The meme syntax is additive. Existing commitments remain unchanged for Assembly instruction names and stack effects, register count, SVG and MIDI profiles, MerzScript contracts, JavaScript exports, and existing CLI forms.

## Documentation

- [Merz speech profile and complete meme table](./docs/MERZ_SPEECH.md)
- [Language specification](./SPEC.md)
- [Getting started](./docs/GETTING_STARTED.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [MerzScript ABI](./docs/MERZSCRIPT.md)
- [Stability and compatibility](./docs/STABILITY.md)
- [Release process](./docs/RELEASING.md)
- [Security policy](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)

## License

Merzato is available under the [MIT License](./LICENSE).
