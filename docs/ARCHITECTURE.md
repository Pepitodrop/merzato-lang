# Architecture

Merzato separates artistic source formats from execution through a small canonical virtual machine.

```text
Merzato Assembly (.mza) ───────┐
                               ├──> instruction program ──> Merzato VM ──> host
SVG painting (.merz.svg) ──┐   │
                           ├───┘
MIDI score (.mid) ──────────┘
```

## Front ends

### Assembly

`src/assembler.js` parses the textual low-level language. It is the easiest format to debug and the reference representation for examples and tests.

### SVG artwork

`src/artCompiler.js` reads executable SVG rectangles. A transition between two Piet palette colours selects an opcode. Block metadata supplies constants, jump labels, and MerzScript phrases.

Version 0.1 uses `data-order` to define traversal. This keeps the prototype deterministic while the full spatial DP/CC traversal is developed.

### MIDI

`src/midi.js` extracts note-on events from Standard MIDI files. The interval between adjacent notes selects register operands for colour transitions that require registers.

## Virtual machine

`src/vm.js` implements:

- 16 tagged registers;
- an operand stack;
- a call stack;
- an integer-addressed heap;
- arbitrary-precision signed integers;
- branches, calls, output, and host syscalls;
- a configurable instruction limit;
- a serialized execution queue for browser events.

The abstract heap and integers are unbounded; concrete execution is limited by host resources.

## Hosts

A host supplies output and syscall behaviour. `ConsoleHost` supports terminal output and basic MerzScript control. `BrowserHost` implements DOM creation, mutation, events, prompts, network fetches, and logging.

A custom host only needs compatible `output(value, mode, vm)` and `call(name, vm)` methods.

## Trust boundary

The VM is not a security sandbox. Step limits constrain instruction count, but values and host calls can still consume resources. Browser capabilities should be explicitly restricted before running untrusted Merzato programs.
