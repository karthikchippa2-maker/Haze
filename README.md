# haze

Black & white web proxy built on **Scramjet v2** — browse sites through an in-browser frame, with traffic carried over a wisp websocket by the libcurl transport.

## Run it

```
haze.bat          # one-click (reuses bundled Node, installs deps if missing)
```

or manually:

```
node server.js    # needs Node 18+
```

Opens at **http://localhost:8000**

## Stack (Scramjet v2)

| Package | Version | Role |
| ------- | ------- | ---- |
| `@mercuryworkshop/scramjet` | 2.0.67-alpha.2 | The rewriting engine + service worker runtime |
| `@mercuryworkshop/scramjet-controller` | 0.0.14 | Page-side `Controller` class + thin SW shim |
| `@mercuryworkshop/libcurl-transport` | 2.0.5 | Curl-over-wasm transport client |
| `@mercuryworkshop/wisp-js` | 0.4.1 | The websocket server that carries proxied traffic |

No more bare-mux / shared-worker transport — v2 wires the transport directly into the page-side controller.

## What's inside

| Path | Purpose |
| ---- | ------- |
| `server.js` | Express static server + wisp websocket endpoint |
| `public/` | The haze UI (sidebar, themes, games, cloud gaming) |
| `public/games.html` | haze games — embedded game library |
| `/scramjet/` | Scramjet v2 runtime (`scramjet.js`, `scramjet.wasm`) |
| `/controller/` | Controller API + service worker shim (`controller.api.js`, `controller.sw.js`) |
| `/libcurl/` | libcurl transport client files |
| `/wisp/` | The websocket endpoint proxied traffic flows through |

## How it works

1. Browser loads `index.html` — the haze home screen (sidebar: Home, haze games, Settings).
2. **haze games** embeds `games.html` natively (no proxy) — hundreds of browser games.
3. Settings persist locally: 6 themes (haze, galaxy, midnight, cream, rose, matrix), custom uploaded wallpaper, and search engine (Brave by default, switchable).
4. `index.js` registers `sw.js`, which is a thin shim that imports `controller.sw.js`.
3. The page-side `Controller` performs an RPC handshake with the service worker (registering its frame prefix), preloads `scramjet.wasm` itself, and wires the libcurl transport directly.
4. When you enter a URL, the controller creates a sandboxed frame under `/~/sj/<controller-id>/<frame-id>/…`; the SW routes requests for that prefix to the controller, which rewrites and proxies them through wisp.
5. The service worker may idle out and lose the controller registration; the SW broadcasts a revive message and the controller re-registers automatically.

Note: v2 preloads the wasm up front, so the v1 cold-start workaround (prewarm + retry-on-first-navigation) is gone.

## Config

- `PORT` env var (default `8000`)
- DNS servers + other wisp options at top of `server.js`
