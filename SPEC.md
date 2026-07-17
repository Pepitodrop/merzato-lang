# Merzato 1.2 Language Specification

## 1. Status and identity

This document defines the normative **Merzato 1.2 stable profile**. Merzato is a multimodal art programming language whose programs may be authored as:

1. **Merz speech (`.merz`)** — satirical German political rhetoric compiled to the canonical machine.
2. **Merzato Assembly (`.mza`)** — canonical low-level source.
3. **Ordered Merzato SVG (`.merz.svg`)** — Piet-style colour transitions select operations.
4. **Standard MIDI (`.mid`)** — Velato-inspired intervals select register operands.
5. **MerzScript phrases** — intentionally absurd phrases invoke explicitly enabled host capabilities.

The slogan is: **Paint it. Play it. Debate it like the Chancellor.**

The Merz speech profile is a fictional satirical syntax. It is not an impersonation, quotation system, official product, or endorsement by Friedrich Merz, the German Federal Government, the CDU, or any broadcaster.

Implementations claiming Merzato 1.2 compatibility must implement the Assembly and VM sections. Speech, SVG, MIDI, browser, and CLI support are profiles and must identify themselves when implemented.

## 2. Values and machine state

The Merzato Abstract Machine has:

- 16 general-purpose tagged registers, `r0` through `r15`;
- an operand stack;
- an integer-addressed heap;
- a call stack and program counter;
- arbitrary-precision signed integers;
- strings and host-defined opaque values;
- synchronous or asynchronous host syscalls.

The abstract model is unbounded. Conforming concrete implementations may impose documented positive resource limits and must fail deterministically when a limit is reached.

Registers initially contain integer zero. The stack, call stack, and heap are initially empty. Execution starts at `.entry`, or instruction zero when no entry directive exists.

## 3. Assembly grammar

Source is UTF-8 text. Instructions and directives are case-insensitive; labels and constant names are case-sensitive.

```text
program            := line*
line               := whitespace? (directive | label? instruction?) comment? newline
comment            := ";" text
label              := identifier ":"
directive          := ".entry" identifier
                     | ".const" identifier literal
instruction        := opcode operand-list?
operand-list       := operand ((whitespace | ",") operand)*
operand             := integer | register | quoted-string | constant-reference | bare-symbol
constant-reference := "$" identifier
literal            := integer | register | quoted-string
register           := "r0" ... "r15"
identifier         := [A-Za-z_][A-Za-z0-9_.-]*
```

Double-quoted strings use JSON string escaping. Single-quoted strings support `\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\0`, and `\uXXXX`. Semicolons inside quoted strings are not comments.

Exactly zero or one `.entry` directive is permitted. `.const NAME literal` defines a compile-time constant containing an arbitrary-precision integer, register, or quoted string. A constant is referenced as `$NAME`, may be used before its declaration, and is substituted before validation; constants do not exist in VM state at runtime.

Constant names and labels each must be unique within their own namespace. Unknown directives, instructions, labels, constants, invalid registers, malformed constant definitions, unterminated strings, and incorrect operand counts are compile-time errors.

`MERZ` is an assembly alias for `SYS`.

## 4. Merz speech source profile

Merz speech source is UTF-8 text using the `.merz` extension. Each non-empty executable line is one complete German sentence ending in a period. Leading and trailing whitespace are ignored. Comments begin with `#`, `//`, or `;` outside quoted strings.

A conforming compiler translates each sentence deterministically to the following Assembly form:

| Speech sentence pattern | Assembly |
| --- | --- |
| `Die Regierung beginnt bei LABEL.` | `.entry LABEL` |
| `Zum Tagesordnungspunkt LABEL.` | `LABEL:` |
| `Wir nennen NAME ab jetzt VALUE.` | `.const NAME VALUE` |
| `Wir brauchen jetzt VALUE.` | `PUSH VALUE` |
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
| `Aus dem Ministerium rN wird geliefert.` | `LOAD rN` |
| `Das kommt jetzt in das Ministerium rN.` | `STORE rN` |
| `Wir holen das aus dem Bundesarchiv.` | `HLOAD` |
| `Wir legen das im Bundesarchiv ab.` | `HSTORE` |
| `Wir gehen jetzt ohne weitere Debatte zu LABEL.` | `JMP LABEL` |
| `Wenn das null ist, gehen wir zu LABEL.` | `JZ LABEL` |
| `Wenn das nicht null ist, gehen wir zu LABEL.` | `JNZ LABEL` |
| `Wir rufen jetzt LABEL auf.` | `CALL LABEL` |
| `Wir kehren zur vorherigen Debatte zurück.` | `RET` |
| `Wir formulieren das jetzt als Text.` | `TOSTR` |
| `Wir führen diese Aussagen zusammen.` | `CONCAT` |
| `Die Zahl muss jetzt raus.` | `OUTN` |
| `Der Buchstabe muss jetzt raus.` | `OUTC` |
| `Das Kanzleramt ordnet an: PHRASE.` | `MERZ PHRASE` |
| `Ich sage ganz klar: VALUE.` | `PUSH VALUE`, then `MERZ "THE CRITIC SAYS"` |
| `Wir beenden diese Debatte.` | `HALT` |
| `Dazu sage ich heute nichts.` | `NOP` |

`LABEL`, `NAME`, `VALUE`, register, string, and constant-reference rules are inherited from Assembly. Unknown sentences are source errors. Compiled instructions retain the originating speech line for diagnostics and may additionally retain their generated Assembly line.

The reference API exposes `compileMerzSpeech(source)` and `transpileMerzSpeech(source)`. The CLI auto-detects `.merz` files and also provides the explicit `speech` command.

## 5. Instruction set

Stack notation lists the top of stack on the right. `a b → c` means pop `b`, then `a`, and push `c`.

| Instruction | Operands | Stack effect | Meaning |
| --- | --- | --- | --- |
| `NOP` | — | — | No operation |
| `PUSH x` | value | `→ x` | Push literal or symbolic value |
| `POP` | — | `x →` | Discard top value |
| `DUP` | — | `x → x x` | Duplicate top value |
| `SWAP` | — | `a b → b a` | Exchange top two values |
| `ADD` | — | `a b → a+b` | Integer addition |
| `SUB` | — | `a b → a-b` | Integer subtraction |
| `MUL` | — | `a b → a×b` | Integer multiplication |
| `DIV` | — | `a b → a/b` | Truncating integer division; zero divisor is an error |
| `MOD` | — | `a b → mod(a,b)` | Non-negative modulus relative to `|b|`; zero divisor is an error |
| `NOT` | — | `x → z` | Push `1` when zero-like, otherwise `0` |
| `CMPGT` | — | `a b → z` | Push `1` when `a>b`, otherwise `0` |
| `LOAD rN` | register | `→ value` | Push register value |
| `STORE rN` | register | `value →` | Store in register |
| `HLOAD` | — | `address → value` | Read heap; absent cells yield integer zero |
| `HSTORE` | — | `value address →` | Store heap cell |
| `JMP target` | label/address | — | Unconditional branch |
| `JZ target` | label/address | `x →` | Branch when zero-like |
| `JNZ target` | label/address | `x →` | Branch when not zero-like |
| `CALL target` | label/address | — | Push return address and branch |
| `RET` | — | — | Return; an empty call stack halts |
| `TOSTR` | — | `x → string(x)` | Convert value to string |
| `CONCAT` | — | `a b → string(a)+string(b)` | Concatenate |
| `OUTN` | — | `integer →` | Output decimal integer |
| `OUTC` | — | `integer →` | Output one Unicode scalar value |
| `SYS phrase` | string | host-defined | Invoke host syscall |
| `HALT` | — | — | Stop execution |

Zero-like values are integer `0`, number `0`, `false`, the empty string, `null`, and `undefined`.

Jump targets may resolve to the instruction count, which halts on the next fetch. Other out-of-range targets are invalid.

## 6. Errors and deterministic limits

A conforming implementation must distinguish source/validation errors from runtime errors. When source metadata exists, runtime errors should identify the instruction index and the speech line, Assembly line, or artwork block.

Implementations may bound:

- executed instructions per run;
- operand and call stack depths;
- heap cell count;
- string length;
- source, SVG block, MIDI track/event, and network-response sizes.

Reaching a configured limit is a resource error, not normal program termination.

## 7. Ordered SVG profile

Executable SVG elements are `<rect>` start tags containing `data-order`. Non-executable SVG content is ignored and may be used freely as artwork.

Every executable rectangle requires:

- unique non-negative integer `data-order`;
- a `fill` from the 18-colour Piet palette;
- a MIDI note from `data-note` or the paired score.

Blocks are processed in ascending `data-order`. A transition from one block to the next selects an opcode from hue and lightness deltas:

| Hue Δ | same lightness | +1 lightness | +2 lightness |
| ---: | --- | --- | --- |
| 0 | `NOP` | `PUSH` | `POP` |
| 1 | `ADD` | `SUB` | `MUL` |
| 2 | `DIV` | `MOD` | `NOT` |
| 3 | `CMPGT` | `JMP` | `JZ` |
| 4 | `DUP` | `LOAD` | `STORE` |
| 5 | `SYS` | `OUTN` | `OUTC` |

Optional attributes:

- `data-value` or positive `data-codels` for `PUSH`;
- `data-codel-size` for area-derived push values;
- `data-label` to assign an instruction label;
- `data-target` for branch transitions;
- `data-merz` and `data-args` for `SYS` transitions;
- `data-store="rN"` to store a syscall result.

`data-args` is a JSON array containing only strings, booleans, null, or safe integers. JSON integers become arbitrary-precision integers.

DOCTYPE and ENTITY declarations are invalid in executable artwork. Duplicate orders, duplicate labels, unsupported colours, invalid notes, missing syscall phrases, and unresolved branch targets are compile-time errors.

The ordered profile is stable throughout 1.x. Future full two-dimensional Piet traversal must use an explicit separate profile.

## 8. MIDI profile

Paired scores are Standard MIDI files. Version 1.0 supports formats 0, 1, and 2. The default note sequence is the first track containing note-on events with non-zero velocity. An implementation may expose explicit track selection or a tick-ordered merged-track mode.

For `LOAD` and `STORE` colour transitions:

```text
register = ((destination_note - source_note) mod 16 + 16) mod 16
```

MIDI pitches must be integers from 0 through 127. A paired score must contain at least as many notes as the artwork contains executable blocks. Extra notes are ignored by the ordered SVG compiler.

## 9. MerzScript browser ABI

The stable browser phrases and stack contracts are:

| Phrase | Stack before | Effect/result |
| --- | --- | --- |
| `THIS IS NOT A BUTTON` | `text id` | Create button; push element |
| `THIS IS NOT A DIV` | `id` | Create div; push element |
| `PUT IT IN THE MUSEUM` | `child parent` | Append child |
| `APPLAUD` | `text target` | Set `textContent` |
| `DRESS IT LIKE CAPITALISM` | `value property target` | Set one style property |
| `WHEN THE AUDIENCE CLICKS` | `label target` | Queue label after click |
| `WHEN THE AUDIENCE TYPES` | `label target` | Queue captured input value, then label |
| `THE CRITIC SAYS` | `value` | Log value |
| `BORROW THE INTERNET` | `url` | Fetch text and push it |
| `ASK THE AUDIENCE` | `prompt` | Prompt and push string |
| `THE PERFORMANCE IS OVER` | — | Halt |

Browser event callbacks must be serialized relative to each other. Input values must be captured when the event occurs and inserted into the VM only inside the serialized execution.

DOM operations must remain inside the configured root. Network and prompt capabilities are disabled by default in the reference implementation. Network requests require an explicit origin policy.

Hosts may add phrases, but added phrases are not part of the Merzato 1.2 standard ABI.

## 10. CLI tracing profile

The reference CLI accepts `--trace` for `run`, `speech`, and `art`. Trace records are written to standard error so normal program output and JSON output on standard output remain unchanged.

Each record identifies the current program counter, available source line or artwork order, decoded instruction and operands, and the operand stack before execution. A final record reports the halted program counter, executed step count, and final stack.

Tracing is observational: enabling it must not change VM state, host calls, resource limits, output, or error behavior.

## 11. Turing completeness

Merzato Assembly can simulate a two-counter Minsky machine:

- counters are arbitrary-precision integers in registers or heap cells;
- increment uses `LOAD`, `PUSH 1`, `ADD`, and `STORE`;
- conditional decrement uses zero testing, subtraction, stores, and branches;
- labels and jumps provide arbitrary control flow.

The Merz speech profile exposes direct sentence forms for every one of those operations and deterministically compiles them to the same machine. Therefore both the canonical Assembly profile and the Merz speech profile are Turing complete at the abstract-machine level. `examples/two-counter.merz` is an executable witness.

Concrete executions remain resource-bounded.

## 12. Compatibility

Within 1.x, conforming releases must not change instruction stack effects, register count, interval mapping, ordered-SVG attribute meaning, standard MerzScript contracts, or documented public API behavior without an explicit opt-in profile. The Merz speech profile is an additive source syntax and does not alter existing Assembly, artwork, MIDI, or JavaScript behavior. Additions may be made compatibly. See `docs/STABILITY.md`.
