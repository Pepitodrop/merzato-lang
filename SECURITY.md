# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| 0.x | No |

## Reporting a vulnerability

Use GitHub's private vulnerability reporting rather than opening a public issue:

`Security` → `Advisories` → `Report a vulnerability`

Include the affected component, reproduction steps, expected impact, and any suggested mitigation. Maintainers should acknowledge a valid report promptly and coordinate disclosure after a fix is available.

## Trust model

Merzato programs are executable code. They may consume CPU and memory, manipulate their permitted DOM subtree, register events, and—when explicitly enabled—use browser prompts or make network requests. The VM is a bounded interpreter, not a process or origin security sandbox.

### Default protections

- Programs are structurally validated before execution.
- VM instruction, stack, call, heap, and string resources are bounded.
- SVG and MIDI inputs have byte, block, track, and event limits.
- Browser DOM access is scoped to the configured root element.
- Network and prompt capabilities are disabled by default.
- Network access requires an explicit origin allowlist and uses no credentials.
- Network redirects are rejected and responses are size-limited.
- Browser event callbacks execute serially.

### Embedding guidance

- Run untrusted artwork in a separate origin or sandboxed iframe.
- Keep `network` and `prompt` disabled unless required.
- Use the narrowest possible `allowedOrigins` list; avoid `*` for untrusted programs.
- Apply a restrictive Content Security Policy at the hosting layer.
- Set resource limits lower than defaults for public multi-tenant services.
- Dispose the VM/host when removing an embedded program.
- Do not expose privileged custom host syscalls to untrusted programs.

## Dependency posture

Version 1.0.0 has no runtime dependencies. GitHub Actions dependencies are monitored through Dependabot and the repository runs CodeQL analysis.
