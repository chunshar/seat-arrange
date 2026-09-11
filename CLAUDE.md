# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- 応答は日本語で行ってください
- git pushを行ったあと、使用コンテキストとコンテキスト残量を通知してください

## What this is

A single-page seating-chart app (座席表作成アプリ). No build step, no package manager, no framework — plain HTML/CSS/JS. Open `index.html` directly in a browser to run it.

Development follows a spec-driven workflow: `Spec.md` (requirements) → `Design.md` (technical design) → `Tasks.md` (implementation checklist) were written before the code, and code changes should stay consistent with these documents (update them when behavior changes).

## Commands

- Run the unit tests: `node test/logic.test.js` (plain Node `assert`-based test runner, no test framework/dependencies).
- Serve locally for manual/browser testing: `python3 -m http.server 8765` from the repo root, then open `http://localhost:8765/index.html`.
- There is no build, lint, or package.json — nothing to install.

## Architecture

- `js/state.js` — all state/business logic (tables, seats, members) and localStorage persistence. Written as a dual-environment module: it attaches itself to `window.SeatState` in the browser (loaded via plain `<script>`, not ES modules, so `index.html` can be opened via `file://` without CORS issues) and exports via `module.exports` under Node (so `test/logic.test.js` can `require()` it directly). Functions mutate the passed-in `state` object in place. Core limits are enforced here (`MAX_TABLES = 6`, `MAX_SEATS = 8`), not just in the UI, so invalid states can't be reached even by bypassing the DOM layer.
- `js/app.js` — all DOM rendering and event handling. Reads/writes the same `state` object via `SeatState.*` functions, then calls `SeatState.saveState(state)` + full re-render (`render()`) after every mutation. No virtual DOM: `render()` rebuilds `#venue`'s children from scratch each time.
- `index.html` / `css/style.css` — markup and styling, including the two modals (add/edit table, assign/edit member).

Data model (see `Design.md` §3 for the authoritative version):
```
State = { tables: Table[] }
Table = { id, name, x, y, seats: Seat[] }
Seat  = { id, member: Member | null }
Member = { name, xId }
```

Key implementation details worth knowing before touching table/seat rendering:
- Each table is drawn as a wrapper (`.table`, absolutely positioned in `#venue`) containing a `.table-toolbar` (rename/seat +−/delete controls) and a `.table-stage` (a `position: relative` box sized to fit the table circle plus the seat orbit). Seats are laid out in a circle around the table center using trigonometry in `seatPosition()` in `js/app.js`; the stage/table/seat pixel sizes are read at render time from the `--table-size` / `--seat-size` CSS custom properties (so the responsive breakpoint in `style.css` and the JS layout math stay in sync automatically — don't hardcode these sizes in JS).
- `.table-stage` has `pointer-events: none` with `pointer-events: auto` re-enabled on `.table-circle` and `.seat` — this is intentional so a table's transparent bounding box never blocks clicks on whatever is layered beneath it when tables are dragged close together.
- New tables are placed at one of 6 preset non-overlapping default positions (`DEFAULT_POSITIONS` in `js/state.js`, a 2-row-by-3-column grid) rather than a single fixed default — this was a deliberate fix for tables all landing on top of each other and making lower tables' controls unclickable.
- Table dragging is implemented with Pointer Events (`pointerdown`/`pointermove`/`pointerup` delegated on `#venue`, listening for drags starting on `.table-circle` only) so mouse and touch share one code path; position is clamped to `#venue`'s bounds and only committed to `state` (via `SeatState.moveTable`) on pointerup.
- User-supplied text (table name, member name, member X ID) is rendered via `innerHTML` in a few places and must go through the local `escapeHtml()` helper in `js/app.js` — do not interpolate raw user input into HTML strings.
