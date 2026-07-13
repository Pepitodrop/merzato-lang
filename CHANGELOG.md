# Changelog

All notable changes to Merzato are documented here. The project follows semantic versioning.

## [Unreleased]

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
