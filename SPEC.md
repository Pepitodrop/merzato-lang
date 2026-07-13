# Merzato 0.1 Language Specification

## 1. Identity

**Merzato** is a multimodal art programming language. A source program may be authored as:

1. **Merzato Assembly (`.mza`)** — the canonical, debuggable representation.
2. **Merzato SVG (`.merz.svg`)** — a painting whose Piet colour transitions select instructions.
3. **A paired MIDI score (`.mid`)** — Velato-inspired note intervals select registers and other operands.
4. **MerzScript phrases** — intentionally absurd phrases invoke host capabilities, especially the browser DOM.

The slogan is: **Paint it. Play it. Insult the browser.**

## 2. Execution model

The Merzato Abstract Machine is a deterministic machine with:

- 16 general-purpose tagged registers (`r0`–`r15`)
- an unbounded operand stack
- an unbounded integer-addressed heap
- arbitrary-precision signed integers
- a call stack and program counter
- synchronous or asynchronous host syscalls

Real implementations are naturally limited by available memory.

## 3. Core assembly

### Data and stack

`PUSH`, `POP`, `DUP`, `SWAP`, `TOSTR`, `CONCAT`

### Integer arithmetic

`ADD`, `SUB`, `MUL`, `DIV`, `MOD`, `NOT`, `CMPGT`

### Registers and heap

`LOAD rN`, `STORE rN`, `HLOAD`, `HSTORE`

For `HSTORE`, push the value followed by the address. For `HLOAD`, push the address.

### Control flow

`JMP label`, `JZ label`, `JNZ label`, `CALL label`, `RET`, `HALT`

### I/O and host calls

`OUTN`, `OUTC`, `SYS "phrase"`

`MERZ "phrase"` is an assembler alias for `SYS`.

## 4. Piet colour semantics

Merzato uses Piet's six-hue and three-lightness cycles. A transition from one ordered SVG block to the next selects an opcode by `(hue delta, lightness delta)`:

| Hue Δ | same | +1 light | +2 light |
|---:|---|---|---|
| 0 | NOP | PUSH | POP |
| 1 | ADD | SUB | MUL |
| 2 | DIV | MOD | NOT |
| 3 | CMPGT | JMP | JZ |
| 4 | DUP | LOAD | STORE |
| 5 | SYS | OUTN | OUTC |

Version 0.1 orders SVG blocks with `data-order`. A future full-canvas profile can replace this with Piet-compatible spatial DP/CC traversal without changing the VM.

For `PUSH`, the exited block's `data-value`, `data-codels`, or calculated codel area is used.

## 5. Velato music semantics

A painting can embed `data-note` MIDI pitches or be paired with a Standard MIDI file. Notes are matched to ordered colour blocks.

For register-taking operations:

`register = signed_interval_mod_16(previous_note, current_note)`

Thus melody controls storage while colour controls action. The MIDI score may remain musically meaningful because absolute pitch is irrelevant to the register mapping; intervals matter.

## 6. MerzScript browser ABI

MerzScript is a joke-language syscall vocabulary. The current browser host defines:

- `THIS IS NOT A BUTTON` — pop `id`, pop `text`, create a button, push its handle.
- `THIS IS NOT A DIV` — pop `id`, create a div, push its handle.
- `PUT IT IN THE MUSEUM` — pop parent, pop child, append child.
- `APPLAUD` — pop target, pop text, set text content.
- `DRESS IT LIKE CAPITALISM` — pop target, property, value; set a style.
- `WHEN THE AUDIENCE CLICKS` — pop target, pop label; invoke label on click.
- `WHEN THE AUDIENCE TYPES` — pop target, pop label; push input value and invoke label.
- `THE CRITIC SAYS` — pop and log a value.
- `BORROW THE INTERNET` — pop URL, fetch text, push response text.
- `ASK THE AUDIENCE` — pop prompt, push the entered string.
- `THE PERFORMANCE IS OVER` — halt.

Hosts may add phrases. Unknown phrases are runtime errors.

## 7. Turing completeness

Merzato can simulate a two-counter Minsky machine:

- each counter is an arbitrary-precision integer in a register or heap cell;
- increment is `LOAD`, `PUSH 1`, `ADD`, `STORE`;
- conditional decrement is composed from `LOAD`, zero testing via `JZ`, subtraction, `STORE`, and `JMP`;
- labels provide arbitrary control flow.

A two-counter Minsky machine is computationally universal, so the abstract Merzato machine is Turing complete. This claim concerns the abstract machine; a concrete computer remains memory-bounded.

## 8. SVG art profile

Every executable `<rect>` requires:

- `data-order` — sequence index
- a Piet palette `fill`
- `data-note`, unless a MIDI score supplies the note

Optional attributes:

- `data-value` / `data-codels`
- `data-label`
- `data-target` for jumps
- `data-merz` and `data-args` for SYS transitions
- `data-store="rN"` to save a syscall result

Non-executable SVG elements are ignored and may be used freely as visual art.
