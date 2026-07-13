# Getting started

## Requirements

- Node.js 20 or newer
- Python 3 only for the zero-dependency static playground server

## Install from source

```bash
git clone https://github.com/Pepitodrop/merzato-lang.git
cd merzato-lang
npm ci
npm test
```

You can also run the CLI without installing it globally:

```bash
node src/cli.js --help
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

## Validate source

```bash
node src/cli.js check examples/hello.mza
node src/cli.js check examples/hello.merz.svg examples/hello.mid
```

## Run an artwork

```bash
node src/cli.js art examples/hello.merz.svg examples/hello.mid
```

The SVG chooses operations through colour transitions. The MIDI score contributes interval-derived operands.

## Run the web playground

```bash
npm run serve
```

Open `http://localhost:8080/web/`. The playground can execute editable assembly or the bundled SVG + MIDI button artwork.

## Use as a JavaScript library

```js
import { assemble } from 'merzato-lang/assembler';
import { ConsoleHost, MerzatoVM } from 'merzato-lang';

const program = assemble('push 42\noutn\nhalt');
const host = new ConsoleHost({ write: false });
await new MerzatoVM(program, host).run();
console.log(host.outputText); // 42
```
