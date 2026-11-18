# Improvements

Working list, ordered so each item is independently shippable. Remove a line when it lands.

Live files are `~/.config/herdr-app/`; this repo mirrors them. Every item ends with
`herdr-app check` on the touched mods, `herdr-app status` showing `errors: []`, a short commit,
a push, and this file ticked.

## Phase 1, correctness

- [x] **Menus follow the theme.** `mods/arc-space/main.js` hardcodes `#3a3b40` and `#2a2b2f` in
  `menuPanel`, so context menus stay dark on a light theme. Use the palette instead.
- [x] **Palette per instance.** `C` is module-level and mutated in `render` by
  `Object.assign(C, palette(th))`, so every mod copy (sidebar, menus, picker) shares one object.
  Two spaces with different hues can paint each other. Make it per instance and pass it down.
- [x] **One tooltip module.** `tip.js` exists twice and has drifted: the sidebar copy takes a
  `muted` callback, the pane copy does not. Keep one implementation with `muted` optional.
- [x] **No swallowed errors.** `applyTheme` and `reopen.js` have empty `catch {}` blocks. Log and
  notify instead, so a failed layout write is visible.
- [x] **Ignore generated files.** `.gitignore`: `jsconfig.json`, `*.d.ts`, `*.error`.

## Phase 2, structure and tests

- [ ] **`lib/state.js`.** One exported constant per shared-state key, replacing string literals in
  `arc-space`, `terminals-launcher` and `reopen.js`.
- [ ] **`views/menu.js`.** Move `tabMenu`, `spaceMenu`, `menuPanel` and `menuItem` out of
  `main.js`.
- [ ] **`lib/herdr.js`, `lib/jobqueue.js`.** Extract the `exec("herdr-app", ...)` helper and the
  job pump. Target: `main.js` under 300 lines.
- [ ] **Tests.** `node --test` over the pure modules: `hexToHsl`, `contrast`, `palette`,
  `backgrounds` (including the 0.02 grain threshold) and the shared-key names.
- [ ] **`scripts/verify.mjs`.** JSON lint for layouts, keys and `mod.json`; asset references exist;
  no `/Users/`, no committed `gpui-kit.d.ts`, no `backgrounds/` paths. Plus `scripts/check.sh` for
  the local `herdr-app check` loop.
- [ ] **CI.** GitHub Actions: `node --test` and `scripts/verify.mjs` on push and pull request.

## Phase 3, performance and packaging

- [ ] **Index panes once per render** instead of `all.filter(...)` per tab.
- [ ] **Event-driven reopen.** Drive `reopen.js` from the render cycle; drop the 1.5 s timer.
- [ ] **Debounce theme writes.** One `layout.set` per ~150 ms while the dial or wheel is dragged.
- [ ] **Cache the `--help` probe** with a TTL instead of forever, so a cold reopen cannot stall.
- [ ] **Shrink the assets.** Five grain tiles are 2.5 MB of an 8.4 MB repo; compress them or ship
  three levels.
- [ ] **`CHANGELOG.md`** and a first version tag.
