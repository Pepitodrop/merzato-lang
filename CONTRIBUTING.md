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

Run the browser playground:

```bash
npm run serve
```

## Contribution workflow

1. Open an issue for substantial language-semantic changes.
2. Create a focused branch.
3. Add or update automated tests.
4. Update `SPEC.md` whenever observable language behavior changes.
5. Check `docs/STABILITY.md` for compatibility constraints.
6. Run `npm run ci` and `npm run test:coverage`.
7. Open a pull request using the repository template.

## Design principles

- **Art is source code.** Visual and musical choices should remain meaningful.
- **The VM stays small.** New opcodes need a clear computational purpose.
- **Jokes are an ABI.** MerzScript phrases may be absurd, but stack contracts are exact.
- **Determinism first.** The same inputs and capability policy produce the same instruction stream.
- **Secure by default.** New host powers require explicit capabilities and bounded resources.
- **Compatibility is explicit.** Existing 1.x behavior must not change silently.

## Code style

The codebase uses modern JavaScript modules, two-space indentation, semicolons, and Node's built-in test runner. Avoid runtime dependencies unless they materially improve correctness or security.

## Pull-request checklist

- `npm run ci` passes.
- Tests cover normal, malformed, and resource-limit behavior where relevant.
- Documentation and examples are updated.
- Language changes update the specification and changelog.
- Browser changes preserve root confinement and capability checks.

## Security

Do not open public issues for suspected vulnerabilities. Follow [`SECURITY.md`](./SECURITY.md).
