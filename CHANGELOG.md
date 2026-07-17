# Changelog

All notable changes to Merzato are documented here. The project follows semantic versioning.

## [Unreleased]

## [1.3.0] - 2026-07-17

### Meme language

- Added more than thirty Friedrich-Merz meme aliases to the `.merz` speech compiler.
- Added functional aliases for values, registers, arithmetic, modulus, jumps, conditional branches, calls, returns, logging, and halting.
- Added non-mutating `NOP` markers for `Was ist Bubatz?`, `Merz leck Eier`, `Mehrzweckeier`, `Sosej Kanzler`, `Kalori Kanzler`, `Rambo Zambo`, iPad reactions, private-flight satire, and second-ballot satire.
- Exported `MERZ_MEME_RULES` with TypeScript declarations for tooling and editor integrations.

### Examples and validation

- Expanded `examples/merz-memes.merz` from five references to a thirty-item meme cabinet.
- Added execution tests proving the meme aliases perform real VM computation and preserve the Turing-complete canonical language.
- Updated the README, speech reference, and normative specification with the complete meme mapping and satire disclaimer.

### Compatibility

- Meme aliases are additive source syntax. Existing `.merz`, Assembly, SVG, MIDI, MerzScript, CLI, and JavaScript programs remain compatible.

## [1.2.0] - 2026-07-17

### Merz speech language

- Added the `.merz` source profile, where every executable statement is a complete German political-style sentence.
- Added deterministic mappings for the full stable VM instruction set, including arithmetic, memory, branching, calls, output, and MerzScript syscalls.
- Added `compileMerzSpeech`, `transpileMerzSpeech`, TypeScript declarations, and the `merzato-lang/speech` package export.
- Preserved originating speech line numbers in compiled instructions and runtime diagnostics.

### Tooling and examples

- Added the `merzato speech` command and automatic `.merz` detection in `run`, `check`, and `asm`.
- Made the speech dialect the primary browser-playground syntax while retaining an Assembly runner.
- Added a complete browser counter, a satire example, and a two-counter-machine-style program written in speech syntax.
- Added conformance, CLI, runtime, browser, and Turing-completeness coverage for the new profile.

### Compatibility

- The speech profile compiles to the unchanged stable VM; existing Assembly, SVG, MIDI, MerzScript, CLI, and JavaScript programs remain compatible.

## [1.1.0] - 2026-07-17

### Language

- Added named compile-time constants with `.const NAME literal` and `$NAME` references.
- Constants may contain arbitrary-precision integers, registers, or quoted strings and can be referenced before their declaration.
- Added deterministic diagnostics for unknown, duplicate, malformed, and non-literal constant definitions.

### Tooling

- Added `--trace` to `merzato run` and `merzato art`.
- Trace output reports the program counter, source line or artwork order, decoded instruction, and stack before every step without changing normal stdout output.
- Added a runnable constants example and automated coverage for constants and tracing.

## [1.0.1] - 2026-07-13

### Documentation and discoverability

- Added the complete Merzato Hello World source directly to the README.
- Added a prominent public playground link and GitHub Pages deployment.

### Validation

- Added a dependency-free Chrome DevTools Protocol end-to-end test.
- The browser test executes editable Assembly, verifies serialized counter clicks, runs the SVG + MIDI artwork, and checks the generated DOM result.
- Added the browser test as a required GitHub Actions job.

## [1.0.0] - 2026-07-13

### Stable language profile

- Declared stable 1.x contracts for Assembly, ordered SVG artwork, MIDI interval operands, MerzScript, CLI commands, and JavaScript exports.
- Added public TypeScript declarations and a complete package root export.
- Added strict program validation for opcodes, arity, registers, labels, targets, and syscall phrases.

### Runtime hardening

- Added configurable limits for instructions, stack depth, call depth, heap cells, strings, SVG bytes/blocks, MIDI bytes/tracks/events, and network responses.
- Added structured syntax, validation, runtime, and resource errors with source line, artwork block, and program-counter context.
- Added VM snapshots, reset, disposal, and atomic queued event arguments.
- Rejected invalid Unicode scalar output.

### Browser security

- Confined DOM access to a configured root element.
- Disabled network and prompt capabilities by default.
- Added explicit origin allowlists, HTTP(S)-only requests, credential omission, redirect rejection, request timeouts, and response-size limits.
- Added disposable event listeners and safe style-property handling.

### Compiler and parser hardening

- Replaced permissive assembly tokenization with deterministic quoted-string and directive parsing.
- Hardened executable SVG parsing, duplicate detection, XML declaration rejection, note validation, and JSON argument validation.
- Hardened Standard MIDI parsing with bounds checks, event limits, track selection, merged-track support, and structured errors.

### Tooling and release

- Added `--json`, stdin input, and `--max-steps` CLI support.
- Expanded automated coverage from 6 to 27 conformance, security, browser, and CLI tests.
- Added CodeQL analysis, release automation, checksum generation, and a CycloneDX SBOM.

## [0.1.0] - 2026-07-13

### Added

- Initial Merzato Assembly parser and stack/register virtual machine.
- Piet-style SVG colour-transition compiler.
- Velato-inspired MIDI interval mapping.
- MerzScript browser ABI, examples, tests, and playground.
