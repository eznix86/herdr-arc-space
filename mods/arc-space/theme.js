import { shared, setShared, settings } from "herdr";

export const KEY = "arc-space.themes";
export const PRESET_SETS = [
  ["#fdfbfb", "#f6e6ef", "#e8d3ea", "#f3c9cf", "#f7dfd2", "#fdf5df", "#ddf5e2", "#ddeef6", "#c2c6e2"],
  ["#f1ece6", "#e8a0bf", "#9b72a0", "#e05d6a", "#f08a5d", "#f2d264", "#6ee59a", "#7ab8d9", "#61637f"],
  ["#3b2a45", "#6b2c4f", "#8d3a32", "#b5703a", "#d9b25a", "#d3d3a8", "#8cb88a", "#2e5e3c", "#2b4470"],
];
export const EMPTY = { dark: ["#1c1128", "#3a2741"], light: ["#ece4f0", "#f7f2f5"] };
export const MAX_DOTS = 3;
const L_TOP = 0.85;
const L_BOTTOM = 0.3;
const BASE = { dark: "#15161b", light: "#f3f1ed" };
const DEFAULT = { dots: [{ h: 137.5, r: 0.318 }], intensity: 0.81, noise: 0, mode: "dark" };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
}

export function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export function mix(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function dotHex(dot) {
  return hslToHex(dot.h, 0.12 + dot.r * 0.7, 0.8 - dot.r * 0.22);
}

export function themeFor(spaceId) {
  const t = (shared(KEY) ?? {})[spaceId];
  if (!t) return DEFAULT;
  const dots = (t.dots ?? []).map((d) => (d.r === undefined ? { h: d.h, r: clamp((L_TOP - d.l) / (L_TOP - L_BOTTOM), 0, 1) } : d));
  return { ...DEFAULT, ...t, dots };
}

export function saveTheme(spaceId, theme) {
  setShared(KEY, { ...(shared(KEY) ?? {}), [spaceId]: theme });
}

export function isDark(theme) {
  return theme.mode === "dark" || (theme.mode === "auto" && settings().dark !== false);
}

export function colors(theme) {
  if (!theme.dots.length) return isDark(theme) ? EMPTY.dark : EMPTY.light;
  const base = isDark(theme) ? BASE.dark : BASE.light;
  const strength = 0.12 + theme.intensity * 0.78;
  return theme.dots.map((d) => mix(base, dotHex(d), strength));
}

const LIGHT_TEXT = "#f2f3f5";
const DARK_TEXT = "#1b1c20";

export function textOn(backgrounds) {
  const worst = (text) => Math.min(...backgrounds.map((bg) => contrast(text, bg)));
  return worst(LIGHT_TEXT) >= worst(DARK_TEXT) ? "light" : "dark";
}

export function palette(theme) {
  const cs = colors(theme);
  if (textOn(cs) === "light") {
    return {
      selected: "#ffffff24", selectedEdge: "#ffffff1f", split: "#ffffff0f", chip: "#ffffff0d",
      hover: "#ffffff12", rule: "#ffffff1a", text: LIGHT_TEXT, soft: "#d2d4d8", dim: "#ffffff8c",
      dot: cs[0], pressed: "#00000033",
    };
  }
  return {
    selected: "#ffffffb8", selectedEdge: "#ffffffcc", split: "#ffffff4d", chip: "#ffffff40",
    hover: "#0000000f", rule: "#0000001a", text: DARK_TEXT, soft: "#2f3137", dim: "#0000008c",
    dot: cs[0], pressed: "#0000001f",
  };
}

export function backgrounds(theme) {
  const cs = colors(theme);
  const level = theme.noise > 0.02 ? Math.max(1, Math.round(clamp(theme.noise, 0, 1) * 5)) : 0;
  const lead = theme.dots[0];
  return {
    focus: lead ? hslToHex(lead.h, 0.78, 0.72) : "#b9a4e8",
    root: { gradient: [cs[0], cs[1] ?? mix(cs[0], isDark(theme) ? "#000000" : "#ffffff", 0.25)], angle: theme.dots.length ? 165 : 100 },
    tint: { gradient: [cs[2] ? cs[2] + "d9" : "#00000000", "#00000000"], angle: 30 },
    grain: level ? { image: `mods/arc-space/grain/grain-fine-${level}.png`, fit: "cover" } : "#00000000",
  };
}

export function find(node, id) {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = find(c, id);
    if (hit) return hit;
  }
  return null;
}

export function apply(tree, theme, sidebarPx) {
  const bg = backgrounds(theme);
  const next = JSON.parse(JSON.stringify(tree));
  next.background = bg.root;
  const tint = next.children.find((c) => c.id === "tint");
  tint.background = bg.tint;
  tint.children.find((c) => c.id === "grain").background = bg.grain;
  find(next, "sidebar").size = { px: sidebarPx };
  find(next, "main").content.pane.focus = { width: 2, color: bg.focus };
  return next;
}

export function radiusOf(hex) {
  const { s } = hexToHsl(hex);
  return clamp((s - 0.12) / 0.7, 0.15, 1);
}

export function moveDots(dots, index, h, r) {
  const d = dots[index];
  const dh = h - d.h;
  const scale = d.r > 0.02 ? r / d.r : null;
  return dots.map((p, i) => ({
    h: (((i === index ? h : p.h + dh) % 360) + 360) % 360,
    r: clamp(i === index ? r : scale === null ? r : p.r * scale, 0, 1),
  }));
}
