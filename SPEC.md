# Merzato 1.3 Language Specification

## 1. Status and identity

This document defines the normative **Merzato 1.3 stable profile**. Programs may be authored as:

1. **Merz speech (`.merz`)** — satirical German political rhetoric compiled to the canonical machine.
2. **Merzato Assembly (`.mza`)** — canonical low-level source.
3. **Ordered Merzato SVG (`.merz.svg`)** — Piet-style colour transitions select operations.
4. **Standard MIDI (`.mid`)** — Velato-inspired intervals select register operands.
5. **MerzScript phrases** — intentionally absurd phrases invoke explicitly enabled host capabilities.

The slogan is: **Paint it. Play it. Debate it like the Chancellor.**

The speech profile is fictional satire. It is not an impersonation, quotation system, official product, or endorsement by Friedrich Merz, the German Federal Government, the CDU, or any broadcaster. Recognised meme labels may be documented public motifs, derived satire, or community-submitted remixes; recognition does not assert that Friedrich Merz literally said or endorsed them.

Implementations claiming Merzato 1.3 compatibility must implement Assembly and the VM. Speech, SVG, MIDI, browser, and CLI support are profiles and must identify themselves when implemented.

## 2. Values and machine state

The Merzato Abstract Machine has 16 tagged registers `r0`–`r15`, an operand stack, an integer-addressed heap, a call stack, a program counter, arbitrary-precision signed integers, strings, host-defined opaque values, and synchronous or asynchronous syscalls.

The abstract model is unbounded. Concrete implementations may impose documented positive limits and must fail deterministically when a limit is reached. Registers begin at integer zero; stacks and heap begin empty; execution begins at `.entry` or instruction zero.

## 3. Assembly grammar

```text
program            := line*
line               := whitespace? (directive | label? instruction?) comment? newline
comment            := ";" text
label              := identifier ":"
directive          := ".entry" identifier | ".const" identifier literal
instruction        := opcode operand-list?
operand-list       := operand ((whitespace | ",") operand)*
operand             := integer | register | quoted-string | constant-reference | bare-symbol
constant-reference := "$" identifier
literal            := integer | register | quoted-string
register           := "r0" ... "r15"
identifier         := [A-Za-z_][A-Za-z0-9_.-]*
```

Instructions and directives are case-insensitive; labels and constants are case-sensitive. Double-quoted strings use JSON escapes. Single-quoted strings support `\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\0`, and `\uXXXX`.

`.const NAME literal` defines an integer, register, or quoted-string compile-time constant. `$NAME` references may precede their declarations. Constants are substituted before validation and do not exist in runtime state. `MERZ` is an alias for `SYS`.

## 4. Merz speech source profile

Merz speech is UTF-8 text using `.merz`. Each non-empty executable line is one complete sentence. Comments begin with `#`, `//`, or `;` outside quoted strings. Unknown sentences are source errors. Compiled instructions retain their original speech line.

### 4.1 Canonical sentence forms

| Speech pattern | Assembly |
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
| `Ich sage ganz klar: VALUE.` | `PUSH VALUE`, `MERZ "THE CRITIC SAYS"` |
| `Wir beenden diese Debatte.` | `HALT` |
| `Dazu sage ich heute nichts.` | `NOP` |

### 4.2 Functional meme aliases

The following aliases are normative additions in 1.3:

| Meme sentence | Assembly |
| --- | --- |
| `Gehobene Mittelschicht mit VALUE.` | `PUSH VALUE` |
| `Privatflieger liefert rN.` | `LOAD rN` |
| `BlackRock verwaltet rN.` | `STORE rN` |
| `Mimimi.` | `DUP` |
| `Rambo Zambo.` | `SWAP` |
| `Mehr arbeiten.` | `ADD` |
| `Leistung muss sich lohnen.` | `ADD` |
| `Bierdeckel-Steuer.` | `MOD` |
| `Brandmauer zu LABEL.` | `JMP LABEL` |
| `Im ersten Wahlgang gescheitert, weiter zu LABEL.` | `JZ LABEL` |
| `Im zweiten Wahlgang geht es zu LABEL.` | `JNZ LABEL` |
| `The Greatest Fritz ruft LABEL auf.` | `CALL LABEL` |
| `Fritze Merz kehrt zurück.` | `RET` |
| `Das iPad reagiert: VALUE.` | `PUSH VALUE`, `MERZ "THE CRITIC SAYS"` |
| `Der Bundeskanzler sagt: VALUE.` | `PUSH VALUE`, `MERZ "THE CRITIC SAYS"` |
| `Sosej Kanzler sagt: VALUE.` | `PUSH VALUE`, `MERZ "THE CRITIC SAYS"` |
| `Kalori Kanzler sagt: VALUE.` | `PUSH VALUE`, `MERZ "THE CRITIC SAYS"` |
| `Aber ohne Bubatz.` | `HALT` |

### 4.3 Meme marker aliases

These exact sentences compile to `NOP`:

```text
Was ist Bubatz?
Merz leck Eier.
Mehrzweckeier.
Der Bundeskanzler.
Sosej Kanzler.
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

Marker aliases permit satirical performance cues without changing machine state. They are not factual assertions or quotations.

The reference API exposes `compileMerzSpeech`, `transpileMerzSpeech`, `MERZ_MEME_RULES`, and `MERZ_SPEECH_RULES`. The CLI auto-detects `.merz` and provides `speech` explicitly.

## 5. Instruction set

| Instruction | Operand | Stack effect / meaning |
| --- | --- | --- |
| `NOP` | — | no operation |
| `PUSH x` | value | `→ x` |
| `POP` | — | `x →` |
| `DUP` | — | `x → x x` |
| `SWAP` | — | `a b → b a` |
| `ADD`, `SUB`, `MUL`, `DIV`, `MOD` | — | integer arithmetic |
| `NOT`, `CMPGT` | — | boolean/comparison result as integer |
| `LOAD rN`, `STORE rN` | register | register access |
| `HLOAD`, `HSTORE` | — | integer-addressed heap access |
| `JMP`, `JZ`, `JNZ` | target | control flow |
| `CALL`, `RET` | target/— | function control flow |
| `TOSTR`, `CONCAT` | — | string operations |
| `OUTN`, `OUTC` | — | number or Unicode-scalar output |
| `SYS phrase` | string | host syscall |
| `HALT` | — | stop execution |

Division or modulus by zero is an error. `MOD` is non-negative relative to the absolute divisor. Invalid Unicode scalar output is an error. Jump targets may equal the instruction count, which halts at the next fetch.

## 6. Errors and deterministic limits

Implementations must distinguish source/validation errors from runtime errors and should attach source line, Assembly line, artwork order, and program counter when available. Implementations may bound instructions, stacks, heap cells, string size, source size, SVG blocks, MIDI tracks/events, and network responses. Reaching a limit is a resource error.

## 7. Ordered SVG and MIDI profiles

Executable SVG rectangles have unique non-negative `data-order`, a supported Piet palette `fill`, and a note from `data-note` or paired MIDI. Blocks execute in ascending order. Hue and lightness deltas select opcodes according to the stable ordered-SVG transition table. Optional attributes provide pushed values, labels, targets, syscalls, arguments, and destination registers.

Paired MIDI supports Standard MIDI formats 0, 1, and 2. For `LOAD` and `STORE` transitions:

```text
register = ((destination_note - source_note) mod 16 + 16) mod 16
```

DOCTYPE/ENTITY input, malformed MIDI, duplicate orders or labels, unsupported colours, invalid notes, and unresolved targets are compile-time errors.

## 8. MerzScript browser ABI

Stable phrases include `THIS IS NOT A BUTTON`, `THIS IS NOT A DIV`, `PUT IT IN THE MUSEUM`, `APPLAUD`, `DRESS IT LIKE CAPITALISM`, `WHEN THE AUDIENCE CLICKS`, `WHEN THE AUDIENCE TYPES`, `THE CRITIC SAYS`, `BORROW THE INTERNET`, `ASK THE AUDIENCE`, and `THE PERFORMANCE IS OVER`.

Browser events are serialized. DOM access is confined to the configured root. Network and prompt powers are disabled by default. Network access requires an explicit origin allowlist and bounded requests.

## 9. CLI tracing

`--trace` is supported for `run`, `speech`, and `art`. Trace records go to standard error and identify the current program counter, source line or artwork order, decoded instruction, and pre-execution stack. Tracing is observational and must not alter execution.

## 10. Turing completeness

Assembly can simulate a two-counter Minsky machine: counters use arbitrary-precision registers or heap cells; increment uses load, push, add, and store; conditional decrement uses zero testing, subtraction, stores, and branches; labels and jumps provide arbitrary control flow.

The canonical speech forms expose all of those primitives. The 1.3 meme aliases add shorthand for several of them without removing any operation. Therefore Assembly and Merz speech are Turing complete at the abstract-machine level. `examples/two-counter.merz` is an executable witness. Concrete runs remain resource-bounded.

## 11. Compatibility

Within 1.x, instruction stack effects, register count, MIDI mapping, ordered-SVG attributes, MerzScript contracts, and documented public APIs must not change without an explicit opt-in profile. Merz speech and meme aliases are additive source syntax and do not alter existing Assembly, artwork, MIDI, or JavaScript behaviour.
