# Getting started

## Requirements

- Node.js 20 or newer
- Python 3 only for the optional zero-dependency playground server

## Install from source

```bash
git clone https://github.com/Pepitodrop/merzato-lang.git
cd merzato-lang
npm ci
npm run ci
```

## Run assembly

```bash
node src/cli.js run examples/hello.mza
```

A minimal program:

```asm
.entry main
main:
  push 77
  outc
  push 101
  outc
  push 114
  outc
  push 122
  outc
  halt
```

Use standard input:

```bash
printf 'push 65\noutc\nhalt\n' | node src/cli.js run -
```

Apply an execution bound:

```bash
node src/cli.js run program.mza --max-steps 100000
```

## Validate source

```bash
node src/cli.js check examples/hello.mza
node src/cli.js check examples/hello.merz.svg examples/hello.mid
```

Use `--json` for machine-readable output.

## Run artwork

```bash
node src/cli.js art examples/hello.merz.svg examples/hello.mid
```

The SVG chooses operations through colour transitions. The MIDI score contributes interval-derived operands.

## Browser playground

```bash
npm run serve
```

Open `http://localhost:8080/web/`.

## Library usage

```js
import { assemble, ConsoleHost, MerzatoVM } from 'merzato-lang';

const program = assemble('push 42\noutn\nhalt');
const host = new ConsoleHost({ write: false });
await new MerzatoVM(program, host).run();
console.log(host.outputText);
```

For untrusted browser programs, read `SECURITY.md` before enabling optional capabilities.
