# Merzato

[![CI](https://github.com/Pepitodrop/merzato-lang/actions/workflows/ci.yml/badge.svg)](https://github.com/Pepitodrop/merzato-lang/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933)](https://nodejs.org/)
[![Status: Experimental](https://img.shields.io/badge/status-experimental-orange.svg)](./ROADMAP.md)

> **Paint it. Play it. Insult the browser.**

**Merzato** is an open-source multimodal art programming language combining:

- **Piet-style visual semantics:** colour transitions select operations;
- **Velato-inspired musical semantics:** MIDI intervals select operands;
- **MerzScript absurdism:** joke-language phrases control browser capabilities;
- **assembly foundations:** a small register/stack virtual machine is the canonical execution layer.

The current `0.1` implementation is runnable, Turing complete at the abstract-machine level, and capable of creating interactive browser applications.

## What is implemented

- Merzato Assembly (`.mza`) parser and CLI
- 16-register stack VM with arbitrary-precision integers
- integer-addressed heap, labels, branches, calls, and step limits
- executable SVG artworks (`.merz.svg`)
- Standard MIDI note parsing and interval-derived registers
- MerzScript DOM, event, style, prompt, log, and fetch operations
- browser playground and interactive counter
- automated conformance tests and GitHub Actions CI

## Try it

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/Pepitodrop/merzato-lang.git
cd merzato-lang
npm ci
npm run ci
```

Run the assembly demo:

```bash
node src/cli.js run examples/hello.mza
# Hello, art!
```

Run an SVG painting paired with a MIDI score:

```bash
node src/cli.js art examples/hello.merz.svg examples/hello.mid
# Hi
```

Validate a program without executing it:

```bash
node src/cli.js check examples/button.merz.svg examples/button.mid
```

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

This creates a real DOM button and updates it after each click. Browser event executions are serialized by the VM.

## Browser playground

```bash
npm run serve
```

Open `http://localhost:8080/web/`. You can edit and execute assembly or run the bundled SVG + MIDI + MerzScript artwork.

## Three layers, one program

| Artistic layer | Computational role |
| --- | --- |
| SVG colour transition | Selects the opcode |
| MIDI note interval | Selects a register or operand |
| MerzScript phrase | Invokes a host/browser capability |
| Merzato Assembly | Canonical low-level representation |
| Merzato VM | Executes the program |

Example MerzScript phrases include:

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

## Turing completeness

The abstract VM can simulate a two-counter Minsky machine. Registers or heap cells hold arbitrary-precision counters; increment, conditional decrement, zero testing, and arbitrary jumps are expressible using the core instruction set. Therefore the abstract language is computationally universal. Real executions remain bounded by available memory and the configured instruction limit.

## Project layout

```text
src/                 assembler, VM, SVG compiler, MIDI parser, hosts, CLI
examples/            assembly, SVG, and MIDI example programs
web/                 zero-build browser playground
test/                Node.js conformance and integration tests
docs/                architecture, getting started, and MerzScript ABI
SPEC.md               versioned language specification
ROADMAP.md            planned spatial, musical, web, and editor work
```

## Current limitation

The SVG profile currently orders executable rectangles with `data-order`. It does not yet implement Piet's full two-dimensional Direction Pointer and Codel Chooser traversal. That spatial execution model is the primary `0.2` milestone and can be added without changing the underlying VM.

## Documentation

- [Getting started](./docs/GETTING_STARTED.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [MerzScript ABI](./docs/MERZSCRIPT.md)
- [Language specification](./SPEC.md)
- [Roadmap](./ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)

## Contributing

Contributions from programmers, artists, musicians, and language-design enthusiasts are welcome. Semantic changes should include tests and an update to `SPEC.md`. See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

Merzato is available under the [MIT License](./LICENSE).
