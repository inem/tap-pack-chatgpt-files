# ChatGPT Files pack for TAP

Adds the two local-file actions from legacy TAP beside ChatGPT's Share control:

- **📂 md** reveals the current conversation's readable Markdown in Finder;
- **📋 path** copies its absolute local Markdown path.

`chatgpt.sessions` owns the captured JSON and readable projection. This pack only addresses that material when it exists. The page script owns ChatGPT DOM meaning, the handler owns local filesystem/Finder/clipboard grounding, and TAP Core transports the opaque request without interpreting either action.

The artifact vendors the reusable [`chatgpt.ui`](https://github.com/inem/chathpt-ui.js) classic-script resource and declares it before the feature resource. Both resources are immutable and self-contained at runtime.

## Validate

```sh
python3 -m unittest discover -s tests
PLAYWRIGHT_PATH=/path/to/playwright node tests/browser.cjs
PYTHONPATH=/path/to/tap-core python3 -m tap_core.packs .
```
