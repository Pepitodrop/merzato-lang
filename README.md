# Merzato

[![CI](https://github.com/Pepitodrop/merzato-lang/actions/workflows/ci.yml/badge.svg)](https://github.com/Pepitodrop/merzato-lang/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Pepitodrop/merzato-lang/actions/workflows/codeql.yml/badge.svg)](https://github.com/Pepitodrop/merzato-lang/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933)](https://nodejs.org/)
[![Version 1.2.0](https://img.shields.io/badge/version-1.2.0-blue.svg)](./CHANGELOG.md)
[![Try online](https://img.shields.io/badge/try-online-brightgreen.svg)](https://pepitodrop.github.io/merzato-lang/)

> **Paint it. Play it. Debate it like the Chancellor.**

**Merzato** is a Turing-complete art programming language whose primary `.merz` syntax reads like exaggerated German political rhetoric associated with Friedrich Merz. The sentences compile to a validated register/stack virtual machine, so the language can implement loops, memory, functions, arithmetic, browser applications, and arbitrary computation rather than merely printing jokes.

The speech profile is fictional political satire. It is not an impersonation or quotation system and is not affiliated with or endorsed by Friedrich Merz, the German Federal Government, the CDU, or any broadcaster.

Merzato also retains its original artistic layers:

- **Piet-style visual semantics:** SVG colour transitions select operations;
- **Velato-inspired musical semantics:** MIDI intervals select operands;
- **MerzScript absurdism:** joke-language phrases invoke explicit browser capabilities;
- **Assembly compatibility:** `.mza` remains the canonical low-level representation.

Version **1.2.0** adds the complete Merz speech profile while remaining compatible with all Merzato 1.0 and 1.1 programs.

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

Then open `http://localhost:8080/web/`.

The package has no runtime dependencies.

## Hello, Chancellor

Create `hello.merz`:

```text
Die Regierung beginnt bei main.

Zum Tagesordnungspunkt main.
  Ich sage ganz klar: "Wir müssen dieses Hello World jetzt gemeinsam anpacken".
  Wir beenden diese Debatte.
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

## A real loop

This is executable code, not decorative prose. The following program transfers five units from counter `r0` to counter `r1` using a conditional loop:

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
  Wir rechnen das zusammen, denn Leistung muss sich lohnen.
  Das kommt jetzt in das Ministerium r1.
  Wir gehen jetzt ohne weitere Debatte zu schleife.

Zum Tagesordnungspunkt ende.
  Aus dem Ministerium r1 wird geliefert.
  Die Zahl muss jetzt raus.
  Wir beenden diese Debatte.
```

Run the included version:

```bash
node src/cli.js speech examples/two-counter.merz
# 5
```

## Why it is Turing complete

The Merz speech compiler exposes the operations needed to simulate a two-counter Minsky machine:

- arbitrary-precision counters in registers or heap cells;
- increment and decrement through sentence-form load, push, arithmetic, and store operations;
- zero testing through `Wenn das null ist ...`;
- arbitrary loops through agenda-point labels and jumps.

Those sentences compile to the same abstract VM already proven capable of the simulation. Real executions remain bounded by configured limits and physical memory, as with every practical implementation.

## Speech syntax

Representative mappings:

| Merz speech | Operation |
| --- | --- |
| `Die Regierung beginnt bei main.` | Entry point |
| `Zum Tagesordnungspunkt loop.` | Label |
| `Wir brauchen jetzt 42.` | Push value |
| `Das kommt jetzt in das Ministerium r0.` | Store register |
| `Aus dem Ministerium r0 wird geliefert.` | Load register |
| `Wir rechnen das zusammen, denn Leistung muss sich lohnen.` | Add |
| `Wenn das null ist, gehen wir zu ende.` | Conditional jump |
| `Wir gehen jetzt ohne weitere Debatte zu loop.` | Unconditional jump |
| `Wir rufen jetzt funktion auf.` | Function call |
| `Wir kehren zur vorherigen Debatte zurück.` | Return |
| `Das Kanzleramt ordnet an: "APPLAUD".` | MerzScript syscall |
| `Wir beenden diese Debatte.` | Halt |

The complete sentence-to-instruction table is in [`docs/MERZ_SPEECH.md`](./docs/MERZ_SPEECH.md).

## Browser application

The default playground example is a working interactive counter written entirely in the speech dialect:

```text
Die Regierung beginnt bei main.

Zum Tagesordnungspunkt main.
  Wir brauchen jetzt "Count: 0".
  Wir brauchen jetzt "counterButton".
  Das Kanzleramt ordnet an: "THIS IS NOT A BUTTON".
  Das kommt jetzt in das Ministerium r0.

  Aus dem Ministerium r0 wird geliefert.
  Wir brauchen jetzt "#app".
  Das Kanzleramt ordnet an: "PUT IT IN THE MUSEUM".

  Wir brauchen jetzt "on_click".
  Aus dem Ministerium r0 wird geliefert.
  Das Kanzleramt ordnet an: "WHEN THE AUDIENCE CLICKS".
  Wir beenden diese Debatte.

Zum Tagesordnungspunkt on_click.
  Ich sage ganz klar: "Der Klick ist im Kanzleramt angekommen".
  Wir beenden diese Debatte.
```

The fuller `examples/chancellor-counter.merz` updates the button after every click. Event executions remain serialized through the VM queue.

## CLI

```bash
# Speech source
node src/cli.js speech examples/two-counter.merz
node src/cli.js run examples/two-counter.merz

# Validate without running
node src/cli.js check examples/two-counter.merz

# Inspect the compiled program
node src/cli.js asm examples/two-counter.merz --json

# Trace every generated instruction
node src/cli.js speech examples/two-counter.merz --trace

# Existing Assembly remains supported
node src/cli.js run examples/hello.mza

# Existing SVG + MIDI artwork remains supported
node src/cli.js art examples/hello.merz.svg examples/hello.mid
```

Trace output goes to standard error and identifies the original `.merz` source line.

## JavaScript API

```js
import {
  compileMerzSpeech,
  ConsoleHost,
  MerzatoVM,
  transpileMerzSpeech
} from 'merzato-lang';

const source = `
Die Regierung beginnt bei main.
Zum Tagesordnungspunkt main.
Wir brauchen jetzt 42.
Die Zahl muss jetzt raus.
Wir beenden diese Debatte.
`;

console.log(transpileMerzSpeech(source));

const program = compileMerzSpeech(source);
const host = new ConsoleHost({ write: false });
await new MerzatoVM(program, host).run();
console.log(host.outputText); // 42
```

The package includes TypeScript declarations and a `merzato-lang/speech` subpath export.

## Three artistic layers, one runtime

| Layer | Computational role |
| --- | --- |
| Merz speech sentence | Selects a canonical Assembly instruction |
| SVG colour transition | Selects the opcode |
| MIDI note interval | Selects a register or operand |
| MerzScript phrase | Invokes an approved host capability |
| Merzato Assembly | Canonical low-level representation |
| Merzato VM | Validates and executes the program |

## Secure embedding

Merzato programs are code, not passive media. The runtime provides:

- instruction, stack, call-stack, heap, string, SVG, MIDI, and response-size limits;
- validation of speech sentences, opcodes, operand arity, registers, labels, and jump targets before execution;
- source line, artwork block, and program-counter locations on runtime errors;
- a browser host confined to one DOM root;
- network and prompt capabilities disabled by default;
- explicit network-origin allowlists, timeouts, response limits, and credential omission;
- disposable browser event bindings.

See [`SECURITY.md`](./SECURITY.md) for the trust model.

## Stable 1.x profile

The speech syntax is additive. Existing commitments remain unchanged for:

- Assembly instruction names and stack effects;
- register count and interval-to-register mapping;
- ordered SVG `data-*` attributes;
- documented MerzScript phrase contracts;
- public JavaScript exports and existing CLI command forms.

See [`docs/STABILITY.md`](./docs/STABILITY.md).

## Project layout

```text
src/                 speech compiler, assembler, validator, VM, SVG/MIDI compilers, hosts, CLI
examples/            Merz speech, Assembly, SVG, and MIDI programs
web/                 zero-build browser playground
test/                conformance, security, integration, speech, and CLI tests
scripts/             release checks and browser end-to-end test
docs/                speech syntax, architecture, stability, ABI, and release documentation
SPEC.md               normative 1.2 language specification
```

## Documentation

- [Merz speech profile](./docs/MERZ_SPEECH.md)
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
