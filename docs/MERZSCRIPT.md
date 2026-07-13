# MerzScript browser ABI

MerzScript maps intentionally absurd phrases to precise host operations. Assembly uses `MERZ`, which is an alias for `SYS`.

## Phrase contracts

Stack arguments are listed in push order. The rightmost value is on top of the stack when the syscall runs.

| Phrase | Stack before | Result |
| --- | --- | --- |
| `THIS IS NOT A BUTTON` | `text, id` | Pushes a button element |
| `THIS IS NOT A DIV` | `id` | Pushes a div element |
| `PUT IT IN THE MUSEUM` | `child, parent` | Appends child to parent |
| `APPLAUD` | `text, target` | Sets target text content |
| `DRESS IT LIKE CAPITALISM` | `value, property, target` | Sets one inline style property |
| `WHEN THE AUDIENCE CLICKS` | `label, target` | Runs label after each click |
| `WHEN THE AUDIENCE TYPES` | `label, target` | Pushes input value and runs label |
| `THE CRITIC SAYS` | `value` | Logs a value |
| `BORROW THE INTERNET` | `url` | Fetches text and pushes it |
| `ASK THE AUDIENCE` | `prompt` | Pushes prompt result |
| `THE PERFORMANCE IS OVER` | — | Halts the VM |

## Example

```asm
push "Do not click"
push "artButton"
merz "THIS IS NOT A BUTTON"
store r0

load r0
push "#app"
merz "PUT IT IN THE MUSEUM"

push "clicked"
load r0
merz "WHEN THE AUDIENCE CLICKS"
halt

clicked:
  push "The artwork noticed you."
  load r0
  merz "APPLAUD"
  halt
```

Browser event handlers are serialized by the VM, so rapid input cannot execute two instruction streams concurrently.
