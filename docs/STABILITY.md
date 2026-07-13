# Stability and compatibility

Merzato 1.0 is the first stable language and runtime profile.

## Guaranteed throughout 1.x

- Assembly instruction names, operand counts, arithmetic order, and stack effects.
- Sixteen registers named `r0` through `r15`.
- Label, call, heap, output, and zero-testing behavior.
- Ordered SVG transition table and documented `data-*` attributes.
- Signed MIDI interval modulo-16 register mapping.
- Standard MerzScript phrase names and stack contracts.
- CLI commands `run`, `art`, `asm`, and `check`.
- Root package exports and documented JavaScript classes/functions.
- Structured error `code` fields for documented error classes.

## Compatible additions

A minor release may add optional CLI flags, new exported helpers, new host phrases, new opt-in source profiles, or additional metadata. Existing valid 1.x programs must continue to behave the same under default settings.

## Breaking changes

Changes requiring 2.0 include altering an opcode stack effect, changing register count, changing colour-transition semantics, changing interval mapping, reinterpreting an existing SVG attribute, changing a standard MerzScript stack contract, or removing a public export.

## Ordered SVG and spatial Piet

The 1.x visual profile deliberately uses `data-order`. Full Direction Pointer/Codel Chooser traversal is planned as a separately selected profile. It will not silently replace ordered traversal.

## Deprecation policy

A public feature should be documented as deprecated for at least one minor release before removal in the next major release. Security fixes may disable unsafe behavior immediately when preserving it would expose users to material risk.
