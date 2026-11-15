<div align="center">

# Arc Space

*A layout for Herdr that makes your terminal look like the Arc browser*

![Herdr](https://img.shields.io/badge/Herdr-0.1.16%2B-4f8f5e?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-3b82f6?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-none-8b8f95?style=flat-square)
![Last commit](https://img.shields.io/github/last-commit/eznix86/herdr-arc-space?style=flat-square)

[Features](#features) · [Install](#install) · [Usage](#usage) · [Themes](#themes) · [Files](#files) · [Troubleshooting](#troubleshooting)

</div>

Arc put tabs in a sidebar: vertical, quiet, one colour per space. Arc Space brings that to
[Herdr](https://herdr.dev). Tabs move to the left, the top strip goes away, and each space carries
its own gradient, so switching spaces feels like switching contexts.

![Arc Space: tabs in a left sidebar, a green space gradient, two panes showing code and a document](preview.png)

One layout and four mods, written in gpui-kit. No build step, no dependencies, no network. Copy the
files into `~/.config/herdr-app/` and it is live.

## Features

- **Sidebar tabs.** Tabs live in a left sidebar, one row each; a split tab shows one chip per pane.
- **A colour per space.** Each space gets its own gradient, optional grain, and text coloured to
  contrast with it.
- **Theme picker.** Colour wheel, presets, intensity, and a noise dial with haptic ticks.
- **Arc menus.** Right-click a tab or a space to split, rename, recolour or close.
- **Collapsing sidebar.** `cmd+s` slides it away and leaves a toggle in the pane header.
- **Launcher.** `cmd+t` finds any tab or pane, and starts a terminal, a split, a space, an agent or
  a command.

## Install

Needs **Herdr 0.1.16 or newer**. Nothing else.

```bash
git clone https://github.com/eznix86/herdr-arc-space.git
cd herdr-arc-space

cp layouts/arc-space.json     ~/.config/herdr-app/layouts/
cp -R mods/arc-space          ~/.config/herdr-app/mods/
cp -R mods/arc-space-pane     ~/.config/herdr-app/mods/
cp -R mods/terminals-launcher ~/.config/herdr-app/mods/
cp -R mods/terminals-palette  ~/.config/herdr-app/mods/
```

Merge the `layout:arc-space` section of [`keys.json`](keys.json) into `~/.config/herdr-app/keys.json`,
then switch to it:

```bash
herdr-app do layout.switch --name arc-space
```

> [!NOTE]
> Herdr reloads these files while it runs, so no restart is needed. `ctrl-shift-l` switches back,
> and deleting the files removes Arc Space. Your own layout, spaces and keys stay untouched.

## Usage

Keys live in `layout:arc-space`, so other layouts keep their own.

| Key | Action |
|---|---|
| `cmd+t` | Toggle the launcher |
| `cmd+shift+p` | Command palette |
| `cmd+s` | Collapse or expand the sidebar |
| `cmd+w` | Close the focused pane (not the tab) |
| `cmd+1..9` | Select tab N (silent if missing) |
| `ctrl+1..9` | Select space N (silent if missing) |

| Gesture | Result |
|---|---|
| Click a row | Select that tab |
| Right-click a split tab | Separate All Tabs, Close Pane, Close Tab |
| Right-click a single-pane tab | Add Split Terminal, Rename Tab, Close Tab |
| Right-click the space chip or empty sidebar | Edit Theme Color, Rename Space, New Tab, Close Space |

`Add Split Terminal` takes another tab of the space and merges it in as a split, so a tab can grow
into a grid without leaving the sidebar.

## Themes

Themes are per space, stored in Herdr's shared state under `arc-space.themes`:

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
| `dots` | up to 3 | Swatches: `h` is hue, `r` is 0..1 distance from the centre |
| `intensity` | 0..1 | How strongly the dots tint the base colour |
| `noise` | 0..1 | Grain level; a tile appears above `0.02`, in five steps |
| `mode` | `auto`, `light`, `dark` | Which base to mix against |

A space with no saved theme gets the default above: the deep green in the screenshot, no grain.
Editing a theme calls `layout.set`, so a theme change rewrites `layouts/arc-space.json`.

## Files

| Path | What it is |
|---|---|
| `layouts/arc-space.json` | The window: gradient, `tint`, `grain`, then `sidebar` (240px) and `main` (the active tab). Cloned from the shipped `terminals` layout. |
| `mods/arc-space/` | Sidebar and its menus: `main.js`, `theme.js`, `picker.js`, `tip.js`, `dial/`, `grain/`, `bin/haptic`. |
| `mods/arc-space-pane/` | Pane header: icon, title, split, zoom, close, and the collapse toggle. Cloned from `terminals-pane`. |
| `mods/terminals-launcher/` | The `cmd+t` bar. |
| `mods/terminals-palette/` | Restyled copy of Herdr's command palette. |
| `keys.json` | The `layout:arc-space` bindings, ready to merge. |
| `RECIPE.md` | The brief another agent could rebuild this from. |

The theme code finds nodes by id: `tint`, `grain`, `sidebar`, `main`. Editing the layout is fine,
renaming those ids is not.

## What it runs

- `mods/arc-space/bin/haptic`, a compiled Swift helper started by the picker **on macOS only**
  (source `bin/haptic.swift`). It watches a file in the mod's folder and plays trackpad haptics, then
  exits on `quit` or after 120 s idle.
- `exec("herdr-app", ["do", ...])` in a few places that need a command's reply.

Everything else is Herdr's own commands. Arc Space writes only inside `~/.config/herdr-app/` and makes
no network calls. The grain comes from Arc.app's `grain` asset; the pane icons are copies of Herdr's.

## Troubleshooting

```bash
herdr-app check ~/.config/herdr-app/mods/arc-space
herdr-app status | grep errors        # must be []
herdr-app shot /tmp/x.png             # lags ~2 s after a change
```

| Symptom | Cause |
|---|---|
| A `.error` file next to a layout, key or mod | That file did not load; the last good version stayed live. |
| Sidebar empty but `check` passes | Stale mod copy. Save any file in `mods/arc-space/` to reload. |
| No grain | `noise` is at 0. Grain starts above `0.02`. |
| A key does nothing | Its `layout:arc-space` section is missing from your `keys.json`. |
| Looks like plain Herdr | Another layout is shown: `herdr-app do layout.switch --name arc-space`. |

Escape hatch: `ctrl-alt-shift-escape` sets the layout and keys aside and returns to `main`.

## Development

Mods are plain JS modules describing GPUI elements. No build, no bundler. Save a file and Herdr
reloads every copy in place.

```bash
herdr-app commands                 # every app command and its arguments
herdr-app check mods/arc-space     # run this after every change
herdr-app do space.new --name zz-test --focus false   # test tabs in a throwaway space
```

The API lives in `~/.config/herdr-app/AGENTS.md` and its type files, which Herdr rewrites on every
start. [`RECIPE.md`](RECIPE.md) lists the traps this build hit; read it before touching the timer
queue, the layout apply, or the terminal park and keep sequence.

## Contributing

Issues and pull requests are welcome. To share a fork, see
[Herdr's gallery](https://herdr.dev/gallery), which documents how layouts are published.

## Credits and license

Cloned from Herdr's `terminals` layout and `terminals-pane` mod, so those parts keep Herdr's
Apache-2.0 license, along with the `pane` icons copied into `mods/arc-space-pane/icons/`. All other
icons are drawn for this build.

**Apache-2.0**, Copyright 2026 Bruno Bernard. See [LICENSE](LICENSE).
