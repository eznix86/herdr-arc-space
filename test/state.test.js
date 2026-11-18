import test from "node:test";
import assert from "node:assert/strict";
import * as arc from "../mods/arc-space/lib/state.js";
import * as launcher from "../mods/terminals-launcher/lib/state.js";

// These strings live in shared.json: renaming one drops the user's state.
const ARC_EXPECTED = {
  THEMES: "arc-space.themes",
  JOB: "arc-space.job",
  MENU_OPEN: "arc-space.menu-open",
  COLLAPSED: "arc-space.collapsed",
  WIDTH: "arc-space.width",
  RECENT_PANES: "arc-space.recent-panes",
  CLOSED: "arc-space.closed",
  LAUNCHER_OPEN: "terminals-launcher.open",
  LAUNCHER_MODE: "terminals-launcher.mode",
  LAUNCHER_STEP: "terminals-launcher.step",
  LAYOUT: "layout",
};

const LAUNCHER_EXPECTED = {
  OPEN: "terminals-launcher.open",
  MODE: "terminals-launcher.mode",
  STEP: "terminals-launcher.step",
  NEW_MENU_AGENTS: "new-menu.agents",
  RECENT_PANES: "arc-space.recent-panes",
};

test("arc-space key constants keep their values", () => {
  assert.deepEqual(Object.keys(arc).sort(), Object.keys(ARC_EXPECTED).sort());
  for (const [name, value] of Object.entries(ARC_EXPECTED)) {
    assert.equal(arc[name], value, name);
  }
});

test("terminals-launcher key constants keep their values", () => {
  assert.deepEqual(Object.keys(launcher).sort(), Object.keys(LAUNCHER_EXPECTED).sort());
  for (const [name, value] of Object.entries(LAUNCHER_EXPECTED)) {
    assert.equal(launcher[name], value, name);
  }
});

test("a name defined in both files has the same value in both", () => {
  const common = Object.keys(launcher).filter((name) => name in arc);
  assert.ok(common.includes("RECENT_PANES"), "the two files should pair at least RECENT_PANES");
  for (const name of common) {
    assert.equal(launcher[name], arc[name], name);
  }
});

test("arc-space's launcher aliases point at the same shared keys", () => {
  assert.equal(arc.LAUNCHER_OPEN, launcher.OPEN);
  assert.equal(arc.LAUNCHER_MODE, launcher.MODE);
  assert.equal(arc.LAUNCHER_STEP, launcher.STEP);
  assert.equal(arc.RECENT_PANES, launcher.RECENT_PANES);
});
