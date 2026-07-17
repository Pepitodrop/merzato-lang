# Merzato

[![CI](https://github.com/Pepitodrop/merzato-lang/actions/workflows/ci.yml/badge.svg)](https://github.com/Pepitodrop/merzato-lang/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Pepitodrop/merzato-lang/actions/workflows/codeql.yml/badge.svg)](https://github.com/Pepitodrop/merzato-lang/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933)](https://nodejs.org/)
[![Version 1.1.0](https://img.shields.io/badge/version-1.1.0-blue.svg)](./CHANGELOG.md)
[![Try online](https://img.shields.io/badge/try-online-brightgreen.svg)](https://pepitodrop.github.io/merzato-lang/)

> **Paint it. Play it. Insult the browser.**

**Merzato** is a multimodal art programming language combining:

- **Piet-style visual semantics:** colour transitions select operations;
- **Velato-inspired musical semantics:** MIDI intervals select operands;
- **MerzScript absurdism:** joke-language phrases invoke explicit host capabilities;
- **assembly foundations:** a validated register/stack VM is the canonical execution layer.

Version **1.1.0** implements the stable 1.x Assembly, ordered-SVG, MIDI, MerzScript, CLI, and JavaScript API profile. It adds named compile-time constants and source-level execution tracing while remaining compatible with Merzato 1.0 programs.

## Try Merzato

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

## Hello World

Create a file called `hello-world.mza`:

```asm
.entry main

main:
  push 72
  outc
  push 101
  outc
  push 108
  outc
  push 108
  outc
  push 111
  outc
  push 44
  outc
  push 32
  outc
  push 119
  outc
  push 111
  outc
  push 114
  outc
  push 108
  outc
  push 100
  outc
  push 33
  outc
  push 10
  outc
  halt
```

Run it:

```bash
node src/cli.js run hello-world.mza
```

Output:

```text
Hello, world!
```

The repository also includes `examples/hello.mza`, which prints `Hello, art!`:

```bash
node src/cli.js run examples/hello.mza
```

## Run artwork

Execute an SVG painting paired with a MIDI score:

```bash
node src/cli.js art examples/hello.merz.svg examples/hello.mid
# Hi
```

Validate a program without executing it:

```bash
node src/cli.js check examples/button.merz.svg examples/button.mid
```

Read Assembly from standard input and bound its execution:

```bash
printf 'push 65\noutc\nhalt\n' | node src/cli.js run - --max-steps 1000
# A
```

Machine-readable output:

```bash
node src/cli.js run examples/hello.mza --json
```

## Named constants

Merzato 1.1 adds compile-time constants for repeated values, registers, and strings. Define them with `.const` and reference them with `$NAME`:

```asm
.const RESULT_REGISTER r2
.const ANSWER 42
.const NEWLINE 10

.entry main

main:
  push $ANSWER
  store $RESULT_REGISTER
  load $RESULT_REGISTER
  outn
  push $NEWLINE
  outc
  halt
```

Constants are case-sensitive, may be referenced before their declaration, and are substituted before validation. Their values must be an arbitrary-precision integer, a register from `r0` to `r15`, or a quoted string.

Run the included example:

```bash
node src/cli.js run examples/constants.mza
# 42
```

## Trace execution

Add `--trace` to `run` or `art` to see every instruction before it executes:

```bash
node src/cli.js run examples/constants.mza --trace
```

Program output stays on standard output. Trace records go to standard error and include the program counter, source line or artwork order, decoded instruction, and current stack:

```text
[trace] pc=0 line=9 PUSH 42 stack=[]
[trace] pc=1 line=10 STORE r2 stack=[42]
...
[trace] halted steps=7 pc=7 stack=[]
```

Tracing also works together with `--json`, because the JSON result remains isolated on standard output.

## Build a browser app

```asm
.entry main
main:
  push "Count: 0"
  push "counterButton"
  merz "THIS IS NOT A BUTTON"
  store r0

  load r0
  push "#app"
  merz "PUT IT IN THE MUSEUM"

  push "on_click"
  load r0
  merz "WHEN THE AUDIENCE CLICKS"

  push 0
  store r1
  halt

on_click:
  load r1
  push 1
  add
  dup
  store r1
  push "Count: "
  load r1
  tostr
  concat
  load r0
  merz "APPLAUD"
  halt
```

This creates a real DOM button and updates it after each click. Event executions are serialized through the VM queue, so rapid browser input cannot race the instruction stream.

## Three artistic layers, one runtime

| Layer | Computational role |
| --- | --- |
| SVG colour transition | Selects the opcode |
| MIDI note interval | Selects a register or operand |
| MerzScript phrase | Invokes an approved host capability |
| Merzato Assembly | Canonical low-level representation |
| Merzato VM | Validates and executes the program |

Example MerzScript phrases:

```text
THIS IS NOT A BUTTON
PUT IT IN THE MUSEUM
WHEN THE AUDIENCE CLICKS
DRESS IT LIKE CAPITALISM
BORROW THE INTERNET
THE CRITIC SAYS
THE PERFORMANCE IS OVER
```

Their exact stack contracts are documented in [`docs/MERZSCRIPT.md`](./docs/MERZSCRIPT.md).

## Secure embedding

Merzato programs are code, not passive media. The runtime provides:

- instruction, stack, call-stack, heap, string, SVG, MIDI, and response-size limits;
- validation of opcodes, operand arity, registers, labels, and jump targets before execution;
- source line, artwork block, and program-counter locations on runtime errors;
- a browser host confined to one DOM root;
- network and prompt capabilities disabled by default;
- explicit network-origin allowlists, timeouts, response limits, and credential omission;
- disposable browser event bindings.

```js
import { BrowserHost, MerzatoVM, assemble } from 'merzato-lang';

const host = new BrowserHost({
  root: document.querySelector('#app'),
  capabilities: {
    dom: true,
    events: true,
    style: true,
    network: false,
    prompt: false
  }
});

const vm = new MerzatoVM(assemble(source), host, {
  maxSteps: 100_000,
  maxHeapCells: 10_000
});

await vm.run();
```

See [`SECURITY.md`](./SECURITY.md) for the trust model.

## JavaScript API

```js
import {
  assemble,
  ConsoleHost,
  MerzatoVM,
  parseMidiNotes,
  compileArtSvg
} from 'merzato-lang';

const program = assemble('push 42\noutn\nhalt');
const host = new ConsoleHost({ write: false });
await new MerzatoVM(program, host).run();
console.log(host.outputText); // 42
```

The package includes TypeScript declarations and subpath exports for the assembler, art compiler, browser host, errors, MIDI parser, validator, and VM.

## Turing completeness

The abstract VM can simulate a two-counter Minsky machine. Registers or heap cells hold arbitrary-precision counters; increment, conditional decrement, zero testing, and arbitrary jumps are expressible using the stable instruction set. Real executions remain bounded by configured resource limits and available memory.

## Stable 1.x profile

The following are compatibility commitments for the 1.x line:

- Assembly instruction names and stack effects;
- register count and interval-to-register mapping;
- ordered SVG `data-*` attributes;
- documented MerzScript phrase contracts;
- public JavaScript exports and CLI command forms.

Full two-dimensional Piet Direction Pointer/Codel Chooser traversal remains a future opt-in profile and will not silently change ordered-SVG semantics. See [`docs/STABILITY.md`](./docs/STABILITY.md).

## Project layout

```text
src/                 assembler, validator, VM, SVG compiler, MIDI parser, hosts, CLI
examples/            Assembly, SVG, and MIDI programs
web/                 zero-build browser playground
test/                conformance, security, integration, and CLI tests
scripts/             release checks and browser end-to-end test
docs/                architecture, stability, ABI, release, and usage documentation
SPEC.md               normative 1.1 language specification
```

## Documentation

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
