# Contributing to Merzato

Merzato welcomes contributions from programmers, musicians, visual artists, language designers, and people with unusually strong opinions about buttons.

## Development setup

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/Pepitodrop/merzato-lang.git
cd merzato-lang
npm ci
npm run ci
```

Run the browser playground with:

```bash
npm run serve
```

Then open `http://localhost:8080/web/`.

## Contribution workflow

1. Open an issue for substantial language-semantic changes.
2. Create a focused branch.
3. Add or update automated tests.
4. Update `SPEC.md` whenever observable language behaviour changes.
5. Run `npm run ci` and `npm pack --dry-run`.
6. Open a pull request using the repository template.

## Design principles

- **Art is source code.** Visual and musical choices should remain meaningful rather than becoming decorative wrappers.
- **The VM stays small.** New opcodes need a clear computational purpose.
- **Jokes are an ABI.** MerzScript phrases may be absurd, but their stack contracts must be exact and documented.
- **Determinism first.** The same source, score, and host inputs should produce the same instruction stream.
- **Compatibility is explicit.** Breaking changes require a specification update and release note.

## Code style

The codebase uses modern JavaScript modules, two-space indentation, semicolons, and Node's built-in test runner. Avoid dependencies unless they materially improve the language implementation.

## Reporting security problems

Do not open public issues for suspected vulnerabilities. Follow [`SECURITY.md`](./SECURITY.md).
