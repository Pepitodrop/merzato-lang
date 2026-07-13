# Release process

Merzato uses semantic versioning and automated GitHub releases.

## Release criteria

Before changing the version:

1. All language changes are reflected in `SPEC.md`.
2. Compatibility implications are documented.
3. `CHANGELOG.md` contains the release section.
4. `package.json` and `src/version.js` contain the same semantic version.
5. `npm run ci` passes on supported Node.js versions.
6. CodeQL has no unresolved high-severity finding attributable to the release.

## Automated GitHub release

When a commit reaches `main`, `.github/workflows/release.yml` reads the package version. If tag `v<version>` does not exist, the workflow:

- performs a clean install and complete validation;
- creates the npm package tarball;
- creates a SHA-256 checksum;
- generates a CycloneDX SBOM;
- creates the Git tag and GitHub release;
- attaches the tarball, checksum, and SBOM.

A version must therefore only be merged to `main` when it is intended for release.

## npm registry publication

The GitHub release tarball is the canonical 1.0 release artifact. Publishing to npm additionally requires the repository owner to configure npm trusted publishing or an `NPM_TOKEN`. After that setup, `npm publish --provenance --access public` can be added as an approved release step.

## Emergency correction

Do not move or overwrite a published tag. Fix the issue, increment the patch version, update the changelog, and publish a new release.
