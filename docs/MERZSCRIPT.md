# MerzScript browser ABI

MerzScript maps intentionally absurd phrases to precise host operations. Assembly uses `MERZ`, an alias for `SYS`.

Stack arguments are shown in push order; the rightmost item is on top when the syscall begins.

| Phrase | Stack before | Capability | Result |
| --- | --- | --- | --- |
| `THIS IS NOT A BUTTON` | `text, id` | `dom` | Push button element |
| `THIS IS NOT A DIV` | `id` | `dom` | Push div element |
| `PUT IT IN THE MUSEUM` | `child, parent` | `dom` | Append child inside root |
| `APPLAUD` | `text, target` | `dom` | Set target `textContent` |
| `DRESS IT LIKE CAPITALISM` | `value, property, target` | `style` | Set one style property |
| `WHEN THE AUDIENCE CLICKS` | `label, target` | `events` | Queue label on click |
| `WHEN THE AUDIENCE TYPES` | `label, target` | `events` | Capture value, push it, queue label |
| `THE CRITIC SAYS` | `value` | `log` | Log value |
| `BORROW THE INTERNET` | `url` | `network` | Fetch text and push it |
| `ASK THE AUDIENCE` | `prompt` | `prompt` | Push prompt result |
| `THE PERFORMANCE IS OVER` | — | — | Halt VM |

## Default capability policy

```js
{
  dom: true,
  events: true,
  style: true,
  log: true,
  network: false,
  prompt: false
}
```

The browser host confines element lookup and mutation to its root. Created detached elements may be appended into the root, but existing elements outside the root cannot be targeted.

## Network policy

Enabling `network` is not sufficient by itself; an origin must also be allowed:

```js
new BrowserHost({
  root,
  capabilities: { network: true },
  allowedOrigins: ['https://api.example.com'],
  requestTimeoutMs: 5000,
  maxResponseBytes: 250000
});
```

Only HTTP and HTTPS are accepted. Requests omit credentials and reject redirects.

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
