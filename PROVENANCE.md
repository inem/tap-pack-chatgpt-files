# Provenance

`chatgpt-ui.js` is copied byte-for-byte from
[`inem/chathpt-ui.js`](https://github.com/inem/chathpt-ui.js) at commit
`8b2118560f9e4b3421c0d923b4e1b8d681aa75f1`. Its SHA-256 is pinned in
`pack.json` and `tap-resource.json`.

`feature.js` and `handler.py` are the TAP pack integration. They replace the
legacy response-mutator implementation in `tap/mutators/chatgpt-reveal.py` with
the installed page-resource and local-handler contracts.
