# Changelog

## 0.1.0, 2026-11-18

First published version.

### Added

- Sidebar tabs, one row per tab, with a chip per pane.
- Per-space gradients and a theme picker with colour wheel, presets, intensity and haptic noise ticks.
- Arc style context menus for tabs and spaces, and tooltips.
- Collapsing sidebar with a slide animation and a toggle in the pane header.
- `cmd+t` launcher for tabs, panes, terminals, splits, spaces, agents and commands.
- `cmd+l` pane switcher that cycles by recent focus.
- `cmd+shift+t` reopen for the last closed tab or pane.
- Confirm dialogs for closing a space or a tab's last pane.
- Toast mod for Herdr notifications.
- `RECIPE.md`, the brief to rebuild the layout from scratch.

### Fixed

- A stranded job left sidebar rows invisible.
- Grain tiles and pane icons lived outside the mod folder; they now ship with it.
- The haptic helper ran on non-macOS systems.
- Menus did not follow the theme.
