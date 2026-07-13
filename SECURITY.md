# Security Policy

## Supported versions

Merzato is currently an experimental `0.x` project. Security fixes are applied to the latest release and the `main` branch.

| Version | Supported |
| --- | --- |
| Latest `0.x` | Yes |
| Older versions | No |

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository rather than opening a public issue:

`Security` → `Advisories` → `Report a vulnerability`

Include the affected component, reproduction steps, expected impact, and any suggested mitigation. Allow reasonable time for investigation before public disclosure.

## Runtime trust model

Merzato programs are code. They can consume CPU and memory, and browser-hosted programs may manipulate the DOM or make network requests through enabled MerzScript syscalls. Do not execute untrusted programs outside an appropriately sandboxed environment.
