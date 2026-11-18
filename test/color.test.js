import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT, backgrounds, contrast, hexToHsl, hslToHex, textOn,
} from "../mods/arc-space/lib/color.js";

// A hex round-trip loses a little precision: 1 degree of hue, 0.01 of s/l.
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test("hslToHex and hexToHsl round-trip", () => {
  for (const h of [0, 15, 120, 240, 330, 359.9]) {
    for (const [s, l] of [[0.6, 0.5], [0.85, 0.72], [0.75, 0.35]]) {
      const back = hexToHsl(hslToHex(h, s, l));
      assert.ok(hueGap(back.h, h) <= 1, `hue ${h} -> ${back.h}`);
      assert.ok(near(back.s, s, 0.01), `s ${s} -> ${back.s}`);
      assert.ok(near(back.l, l, 0.01), `l ${l} -> ${back.l}`);
    }
  }
});

test("contrast", () => {
  assert.ok(near(contrast("#ffffff", "#000000"), 21, 1e-6));
  for (const c of ["#ffffff", "#000000", "#8a6f3c", "#2a6cbd"]) {
    assert.equal(contrast(c, c), 1);
  }
});

test("textOn picks the readable text", () => {
  assert.equal(textOn(["#101014"]), "light");
  assert.equal(textOn(["#f4f1ec"]), "dark");
  assert.equal(textOn(["#121216", "#1c1a22"]), "light");
});

test("menu text must contrast with the surface it sits on", () => {
  // The bug this locks out: palette()'s dark text (chosen for a light space
  // gradient) drawn on Herdr's dark popover is unreadable.
  assert.ok(contrast("#1b1c20", "#2a2b2f") < 4.5);

  // theme()'s own pairs: dark popover with light text, light popover with dark.
  assert.ok(contrast("#ecedef", "#2a2b2f") >= 4.5);
  assert.ok(contrast("#1b1c20", "#f4f2ef") >= 4.5);
});

test("backgrounds keeps grain above the 0.02 threshold", () => {
  const grainOf = (noise) => backgrounds({ ...DEFAULT, noise }).grain;

  assert.match(grainOf(0.5).image, /^mods\/arc-space\/grain\/grain-fine-[1-5]\.png$/);
  assert.equal(grainOf(1).image, "mods/arc-space/grain/grain-fine-5.png");
  assert.match(grainOf(0.021).image, /grain-fine-1\.png$/);

  assert.equal(grainOf(0), "#00000000");
  assert.equal(grainOf(0.02), "#00000000");
  assert.equal(grainOf(-1), "#00000000");
});

test("the default theme paints a gradient", () => {
  const { root, tint } = backgrounds(DEFAULT);
  assert.ok(Array.isArray(root.gradient));
  assert.equal(root.gradient.length, 2);
  assert.match(root.gradient[0], /^#[0-9a-f]{6}$/);
  assert.ok(tint.gradient.length > 0);
});
