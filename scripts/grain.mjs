import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

const WIDTH = 1512;
const HEIGHT = 950;
const PERIOD = 500;
const PEAKS = [20, 35, 51, 71, 91];
const MEAN = 0.909;
const SPREAD = 0.318;
const SEED = 0x41524353;

function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normals(count, seed) {
  const next = random(seed);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 2) {
    const r = Math.sqrt(-2 * Math.log(1 - next()));
    const a = 2 * Math.PI * next();
    out[i] = r * Math.cos(a);
    if (i + 1 < count) out[i + 1] = r * Math.sin(a);
  }
  return out;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function png(width, height, alpha) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 4;
  const stride = width * 2 + 1;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = y * stride + 1 + x * 2;
      raw[o] = 255;
      raw[o + 1] = alpha[y * width + x];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function tile(peak, noise) {
  const alpha = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const v = Math.min(1, Math.max(0, MEAN + SPREAD * noise[(y % PERIOD) * PERIOD + (x % PERIOD)]));
      alpha[y * WIDTH + x] = Math.round(v * peak);
    }
  }
  return alpha;
}

const dir = process.argv[2] ?? new URL("../mods/arc-space/grain/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const noise = normals(PERIOD * PERIOD, SEED);
PEAKS.forEach((peak, i) => {
  writeFileSync(join(dir, `grain-fine-${i + 1}.png`), png(WIDTH, HEIGHT, tile(peak, noise)));
});
