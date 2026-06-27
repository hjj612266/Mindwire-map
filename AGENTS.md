# Mindwire — 思维导图系统

## Tech stack & startup

HTML5 + CSS3 + Vanilla JS (ES6+), Canvas 2D + SVG, Express backend (port 4010).

```bash
start.bat              # auto-installs server deps, starts server, opens browser
# or manual:
cd server && npm install && node server.js
# then open http://localhost:4010
```

## Critical conventions

- **Zero build** — plain `<script>` tags, no npm/bundler/lint/test/CI.
- **Script load order** (index.html:108-114): `store.js → canvas.js → card.js → connection.js → particles.js → map-manager.js → app.js`. Each defines a `const` global. Never reorder.
- **Persistence: localStorage only** — Express `/api/maps/*` CRUD exists but frontend never calls it. Data key: `mindwire_data`. If adding API sync, keep localStorage as primary source.
- **Verify by opening in browser** — no test runner.

## Architecture

- `App.init()` calls: `Store.init() → CanvasSystem.init() → CardSystem.init() → ConnectionSystem.init() → ParticleSystem.init() → MapManager.init()`
- `Store.save()` debounced 500ms; `saveImmediate()` skips debounce. Call `saveImmediate()` before switching maps.
- `CardSystem.resetState()` must be called when switching maps to clear drag/selection state and recalculate `nextId`.
- Coordinates: world space (card x/y) vs screen space. `CanvasSystem.screenToWorld()` / `worldToScreen()` for conversion. Offset + zoom via CSS `transform` on `#canvasInner`.
- SVG connections rendered as child of `#canvasContainer`, NOT inside `#canvasInner`. `ConnectionSystem.updateSvgTransform()` syncs SVG `transform` with canvas offset/zoom.

## Data model

```
Store._data = { maps: Map[], nextMapId: number }
Map: { id, name, createdAt, updatedAt, cards: Card[], connections: Connection[], settings: {} }
Card: { id, title, description, x, y, width:220, height:null, color:null, zIndex, collapsed:false }
Connection: { id, fromCardId, fromAnchor, toCardId, toAnchor, style:'solid', label:'' }
```

- Card limit: 100 per map. Card ID: `max(existing ids, nextId) + 1`.
- Connection dedup: prevents duplicate A↔B pairs (regardless of direction).
- `card.height` starts `null`; DOM reads `el.offsetHeight` as fallback.

## Theme & accent

- `<html data-theme="dark"|"light">`, persisted in `localStorage.mindwire_theme`.
- `<html data-accent="">` (empty=green, or orange/blue/white/purple/red), persisted in `localStorage.mindwire_accent`.
- Light mode disables `backdrop-filter` blur (layout.css:28-31, 184-187).
- Global CSS transition on `[data-theme] *` (effects.css:98-104) — can cause slow initial page load.
- Accent vars in `variables.css` override `--primary-rgb`, `--primary`, `--primary-light`.

## Module overview

| File | Global | Role |
|------|--------|------|
| `store.js` | `Store` | localStorage CRUD, save debounce, status bar messages |
| `canvas.js` | `CanvasSystem` | Infinite pan canvas, dot background (`DOT_SPACING=28`, `DOT_RADIUS=0.9`, max 5000 dots), coordinate transforms |
| `card.js` | `CardSystem` | Card CRUD, drag, resize (`CARD_WIDTH=220`, `CARD_MIN_HEIGHT=120`, `CARD_MIN_WIDTH=160`, `CARD_MIN_RESIZE_HEIGHT=80`), collapse, 8-color picker, anchor drag-to-connect |
| `connection.js` | `ConnectionSystem` | SVG bezier paths, obstacle avoidance (40 sample points), style popup (7 styles: solid/dashed/dotted/A->B/B->A/none/breathing; flow anim for arrow styles; hit area 14px) |
| `particles.js` | `ParticleSystem` | Brownian particles (count=55, 40% in light mode, speed=0.35, connect dist=130px, repulse radius=90px) |
| `map-manager.js` | `MapManager` | Multi-map drawer (left sidebar), switch/rename/delete, at-least-one-map guard |
| `app.js` | `App` | Bootstrap, theme/accent toggle, `updateDataInfo()`, keyboard shortcut stubs |

## Common gotchas

- **Zoom NOT implemented** — `MIN_ZOOM=0.15`, `MAX_ZOOM=4` constants exist but no zoom handler. Scroll wheel pans vertically only. No pinch-to-zoom.
- **No keyboard shortcuts** — PLAN.md mentions Ctrl+N/S/Delete/Z but none are wired. All interactions are mouse-only.
- `ConnectionSystem.computePath()` calls `getAnchorWorldPos()` which reads `el.offsetHeight` from DOM — connections won't render until cards are in DOM.
- `ParticleSystem.updateColor()` reads `--primary` at init only. Accent changes after init won't update particle color.
- Deleting a card auto-removes associated connections in Store AND DOM.
- Card dirty tracking triggers a "save" button appearance (`.dirty` class) and glow-ring animation on save.
- Adding/removing cards/connections programmatically → call `App.updateDataInfo()` to refresh status bar.
- Custom scrollbar: thin (6px), rectangular (no border-radius), on effects.css:1-17.
- SVG `<marker>` arrowheads use `var(--line-color)` — color changes with theme/accent transitions.
- `CardSystem.updateCardHeights()` called after resize ends to sync DOM height back to store.
