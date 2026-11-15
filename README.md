<div align="center">

# Arc Space

*A layout for Herdr that makes your terminal look like the Arc browser*

![Herdr](https://img.shields.io/badge/Herdr-0.1.16%2B-4f8f5e?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-3b82f6?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-none-8b8f95?style=flat-square)
![Last commit](https://img.shields.io/github/last-commit/eznix86/herdr-arc-space?style=flat-square)

[Features](#features) · [Install](#install) · [Usage](#usage) · [Themes](#themes) · [Keys](#keys) · [Files](#files) · [Troubleshooting](#troubleshooting) · [Credits](#credits-and-license)

</div>

Arc made the sidebar the place tabs live: vertical, quiet, one colour per space, and the chrome out
of the way. Arc Space brings that to [Herdr](https://herdr.dev) — tabs move into a left sidebar, the
top tab strip disappears, and every space carries its own gradient so switching spaces *feels* like
switching contexts.

![Arc Space: tabs in a left sidebar, a green space gradient, two panes showing code and a document](preview.png)

It is a layout plus four mods, written in [gpui-kit](https://gpui-kit.com) — no build step, no
dependencies, no network. Copy the files into `~/.config/herdr-app/` and it is live.

## Features

- **Tabs in a sidebar** — one row per tab. A split tab shows one chip per pane: icon and title for
  two panes, icons only for three or more. The `×` appears on hover or focus.
- **A colour per space** — each space gets a three-layer gradient (two-colour gradient, a tint, and
  optional grain). Sidebar text picks its colour by contrast against that gradient, per space.
- **A theme picker** — a 316×300 colour wheel. Drag any dot and the group turns and scales together;
  `+` adds a triad (up to three dots), plus three preset sets, an intensity wave, and a noise dial
  that ticks under your fingers on a Mac trackpad.
- **Arc's context menus** — right-click a tab to separate, close a pane, add a split terminal from
  another tab, or rename; right-click a space to edit its theme, rename it, add a tab or close it.
- **Tooltips** — dark teal pills with a teardrop corner and 3D key caps, 450 ms delay, pinned inside
  the hovered control, and muted while a menu is open.
- **A sidebar that slides** — `cmd+s` animates 240 → 0 in 11 steps with the content pinned to the
  right edge; while collapsed, the top-left pane header grows a toggle.
- **Motion that says what happened** — new tabs grow in, closed tabs collapse through a ghost row,
  and changing space staggers the rows in from the side of the new space (130 ms each, 14 ms apart).
- **The `cmd+t` bar** — search tabs and agents, start an agent, or run a command, from one field.

## Install

Requires **Herdr 0.1.16 or newer**. Nothing else — Arc Space runs no build step and installs no
packages.

Ask your Herdr agent to add it:

```
herdr.dev/layouts/eznix86/herdr-arc-space
```

By hand, copy the layout and its four mods into Herdr's home:

```bash
git clone https://github.com/eznix86/herdr-arc-space.git
cd herdr-arc-space

cp layouts/arc-space.json       ~/.config/herdr-app/layouts/
cp -R mods/arc-space            ~/.config/herdr-app/mods/
cp -R mods/arc-space-pane       ~/.config/herdr-app/mods/
cp -R mods/terminals-launcher   ~/.config/herdr-app/mods/
cp -R mods/terminals-palette    ~/.config/herdr-app/mods/
```

Then merge the `layout:arc-space` section of [`keys.json`](keys.json) into
`~/.config/herdr-app/keys.json`, and switch to the layout:

```bash
herdr-app do layout.switch --name arc-space
```

> [!NOTE]
> Herdr redraws itself from these files while it runs, so no restart is needed. `ctrl-shift-l`
> switches back to any other layout, and deleting the files removes Arc Space. Your own layout,
> spaces and keys are never touched.

## Usage

### Keys

The bindings live in the `layout:arc-space` section, so other layouts keep their own keys.

| Key | Action |
|---|---|
| `cmd+t` | Toggle the launcher (search tabs and agents, start an agent, run a command) |
| `cmd+shift+p` | Command palette |
| `cmd+s` | Collapse or expand the sidebar |
| `cmd+w` | Close the focused pane (not the tab) |
| `cmd+1..9` | Select tab N (silent if it does not exist) |
| `ctrl+1..9` | Select space N (silent if it does not exist) |

### Tabs

| Gesture | Result |
|---|---|
| Click a row | Select that tab |
| Right-click a split tab | Separate All Tabs · Close Pane · Close Tab |
| Right-click a single-pane tab | Add Split Terminal… · Rename Tab… · Close Tab |
| Right-click the space chip, or empty sidebar | Edit Theme Color… · Rename Space… · New Tab · Close Space |
| `+ New Tab` | New tab in the current space |

`Add Split Terminal…` picks another tab of the space and merges it in as a split, so a tab can grow
from one terminal to a grid without leaving the sidebar.

## Themes

Themes are per space and stored in Herdr's shared state under `arc-space.themes`:

```json
{
  "dots": [{ "h": 137.5, "r": 0.318 }],
  "intensity": 0.81,
  "noise": 0,
  "mode": "dark"
}
```

| Field | Range | Meaning |
|---|---|---|
| `dots` | up to 3 | Swatches on the wheel: `h` is hue in degrees, `r` is 0..1 distance from the centre (vividness) |
| `intensity` | 0..1 | How strongly the dots tint the space's base colour |
| `noise` | 0..1 | Grain level; a tile appears above `0.02`, in five steps |
| `mode` | `auto`, `light`, `dark` | Which base to mix against |

A space with no saved theme gets the default above — the deep green in the screenshot, with no
grain. Editing a theme calls `layout.set`, so a theme change rewrites `layouts/arc-space.json`;
that file is the source of truth for the window.

## Files

| Path | What it is |
|---|---|
| `layouts/arc-space.json` | The window: root gradient → `tint` → `grain` (padding 8) → `sidebar` (240px) + `main` (the active tab, shadow `lg`, radius 12). Cloned from the shipped `terminals` layout. |
| `mods/arc-space/` | The sidebar, and every menu it draws as an overlay (`theme`, `menu`, `tab-menu`, `tab-pick` views). `main.js` sidebar and menus, `theme.js` colours and contrast, `picker.js` the wheel, `tip.js` tooltips, `dial/*.svg` handles and wave, `grain/grain-fine-1..5.png` tiles, `bin/haptic` the Swift helper. |
| `mods/arc-space-pane/` | The pane header: program icon, title, split/zoom/close buttons, tooltips, and the collapsed-sidebar toggle. Cloned from `terminals-pane`. |
| `mods/terminals-launcher/` | The `cmd+t` bar. |
| `mods/terminals-palette/` | A restyled copy of Herdr's command palette. |
| `keys.json` | The `layout:arc-space` bindings, ready to merge. |
| `RECIPE.md` | The brief another agent could rebuild this from, starting from an empty folder. |
| `preview.png` | The screenshot above, at 1600px. |

The theme code finds layout nodes by id — `tint`, `grain`, `sidebar`, `main`. Editing the layout is
fine; renaming those ids is not.

## What it runs

Extensions run with your permissions, so, plainly:

- `mods/arc-space/bin/haptic` — a compiled Swift helper, started by the picker **on macOS only**
  (source: `bin/haptic.swift`; rebuild with `xcrun swiftc -O bin/haptic.swift -o bin/haptic`). It
  polls a file in the mod's own folder every 10 ms and plays `NSHapticFeedbackManager.alignment` per
  change; it exits on `quit` or after 120 s idle.
- `exec("herdr-app", ["do", …])` — a few places need a command's reply, which `run()` cannot return.

Everything else is Herdr's own commands. Arc Space writes only inside `~/.config/herdr-app/` and
opens no network connections. The grain tiles were pre-tiled from the `grain` asset inside Arc.app;
the pane icons are copies of Herdr's shipped `pane` icons.

## Troubleshooting

```bash
herdr-app check ~/.config/herdr-app/mods/arc-space        # loads the mod once; prints the exact error
herdr-app check ~/.config/herdr-app/mods/arc-space-pane
herdr-app status | grep errors                            # must be []
herdr-app shot /tmp/x.png                                 # screenshots lag ~2 s after a change
```

| Symptom | Cause |
|---|---|
| A `*.error` file next to the layout, keys or a mod | That file did not load; the last good version stayed live. The file names the line. |
| Sidebar empty but `herdr-app check` passes | A stale mod copy. Save any file inside `mods/arc-space/` to hot-reload every copy. |
| The grain is missing | `noise` is at 0. Grain only appears above `0.02`. |
| Nothing happens on a key | Its `layout:arc-space` section was not merged into `~/.config/herdr-app/keys.json`. |
| The layout looks like plain Herdr | Another layout is shown: `herdr-app do layout.switch --name arc-space`. |

The escape hatch is always `ctrl-alt-shift-escape`: it sets the shown layout and `keys.json` aside
and returns to Herdr's default `main` layout.

## Development

Mods are plain JavaScript modules that describe GPUI elements; there is no build, no bundler and no
`node_modules`. Edit a file, save, and Herdr reloads every copy in place.

```bash
herdr-app commands                    # every app command and its arguments
herdr-app ls                          # spaces, tabs and terminals as JSON
herdr-app check mods/arc-space        # the check to run after every change
```

Test anything that creates, merges or closes tabs in a throwaway space, never in a real one:

```bash
herdr-app do space.new --name zz-test --focus false
herdr-app do space.close --id <id> --confirmed true
```

The full API is in `~/.config/herdr-app/AGENTS.md` and its type files; the type files are rewritten
by Herdr on every start, so they are the truth for the version you run. [`RECIPE.md`](RECIPE.md)
lists the traps this build hit — read it before changing the timer queue, the layout apply, or the
terminal-park-and-keep sequence.

## Contributing

Layouts are shared by topic, not by pull request: a public repo with the topic **`herdr-layout`** is
the submission to [herdr.dev/gallery](https://herdr.dev/gallery). Issues and improvements to this
layout are welcome here first.

If you fork it, rename the layout and the four mods (`arc-space`, `arc-space-pane`,
`terminals-launcher`, `terminals-palette`) together — `main.js`, `picker.js`, the layout JSON, the
keys section and the overlay `mod:` names all refer to those names.

## Credits and license

The layout is a clone of the `terminals` layout that ships with Herdr, and the pane header a clone of
its `terminals-pane` mod; those parts keep Herdr's **Apache-2.0** license, as do the `pane` icons
copied into `mods/arc-space-pane/icons/`. The grain tiles come from Arc.app's `ARC_AskArc.bundle` and
are not redistributed from upstream. Icons in `mods/arc-space/` are drawn for this build.

**Apache-2.0**, Copyright 2026 Bruno Bernard — see [LICENSE](LICENSE).

<div align="center">
<sub>Last reviewed: 2026-11-16 · Herdr 0.1.16 · built for macOS, runs anywhere Herdr does (haptics are macOS-only)</sub>
</div>
