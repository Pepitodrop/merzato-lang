# Architecture

Merzato separates artistic source formats from execution through a validated canonical program and bounded VM.

```text
Assembly (.mza) ───────────────┐
                               ├─> validator ─> instruction program ─> VM ─> host
SVG artwork (.merz.svg) ──┐    │
                          ├────┘
MIDI score (.mid) ─────────┘
```

## Front ends

### Assembly

`src/assembler.js` tokenizes directives, labels, instructions, quoted strings, registers, and arbitrary-precision integer literals. It rejects malformed syntax and passes the result through the shared validator.

### Ordered SVG

`src/artCompiler.js` scans executable SVG rectangle tags, validates the stable 1.0 attributes, derives operations from Piet colour deltas, and derives registers from note intervals. It rejects entity declarations, duplicate orders/labels, unsupported colours, unsafe argument shapes, invalid notes, and unresolved targets.

### MIDI

`src/midi.js` parses bounded Standard MIDI files with chunk and event bounds checking. It exposes file metadata, first-musical-track selection, explicit track selection, and merged tick order.

## Validator

`src/validator.js` defines the instruction signatures and validates:

- supported opcodes;
- exact operand arity;
- registers;
- labels and entry points;
- direct and symbolic branch targets;
- syscall phrases.

Both source front ends and direct VM construction use this validator.

## Virtual machine

`src/vm.js` implements tagged registers, operand and call stacks, heap, control flow, output, syscalls, structured errors, resource limits, immutable snapshots, reset/disposal, and a serialized run queue.

Event arguments are inserted only inside the queue operation, preventing input callbacks from mutating a running VM.

## Hosts

`ConsoleHost` supports terminal output and the console-compatible MerzScript subset.

`BrowserHost` provides a capability-controlled browser ABI. DOM targets must belong to its configured root. Network and prompt access are disabled by default. Network access uses an origin allowlist, no credentials, rejected redirects, timeouts, and response limits.

Custom hosts implement compatible `output` and `call` methods. Custom syscalls are part of the embedding application, not the standard 1.0 ABI.

## Packaging

`src/index.js` is the public package entry point. `index.d.ts` defines the TypeScript surface. The package has no runtime dependencies.
