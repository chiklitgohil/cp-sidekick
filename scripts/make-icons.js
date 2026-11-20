// Generates the extension icons (icons/icon-<size>.png) with no dependencies:
// a white rubber duck with an amber beak on a teal rounded square (see BRAND.md),
// anti-aliased by supersampling. Placeholder only: icons/ now holds the designed logo,
// so this refuses to overwrite it unless run with --force (npm run icons -- --force).
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const SIZES = [16, 32, 48, 128];
const OUT = path.join(__dirname, "..", "icons");
const SAMPLES = 5; // 5x5 supersampling per pixel

const COLORS = {
  teal: [15, 118, 110], // #0F766E
  white: [255, 255, 255],
  amber: [245, 158, 11], // #F59E0B
  ink: [11, 18, 32] // #0B1220
};

// Shapes in a 0..1 coordinate space (y grows downward).
const roundedSquare = (x, y, r = 0.22) => {
  const dx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0);
  const dy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
  return Math.hypot(dx, dy) <= r;
};
const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const inTriangle = (x, y, [ax, ay], [bx, by], [cx, cy]) => {
  const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  const d1 = s(x, y, ax, ay, bx, by);
  const d2 = s(x, y, bx, by, cx, cy);
  const d3 = s(x, y, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

// Duck facing right: body, raised tail, head, beak, eye.
const duckColor = (x, y, size) => {
  if (size >= 48 && inEllipse(x, y, 0.655, 0.345, 0.03, 0.03)) return "ink";
  if (inEllipse(x, y, 0.815, 0.415, 0.095, 0.05)) return "amber";
  const head = inEllipse(x, y, 0.62, 0.38, 0.15, 0.15);
  const body = inEllipse(x, y, 0.47, 0.63, 0.29, 0.17);
  const tail = inTriangle(x, y, [0.15, 0.44], [0.33, 0.57], [0.19, 0.64]);
  if (head || body || tail) return "white";
  return null;
};

const render = (size) => {
  const rgba = Buffer.alloc(size * size * 4);
  const total = SAMPLES * SAMPLES;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      let covered = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES) / size;
          const y = (py + (sy + 0.5) / SAMPLES) / size;
          if (!roundedSquare(x, y)) continue;
          const color = COLORS[duckColor(x, y, size) || "teal"];
          for (let c = 0; c < 3; c++) sum[c] += color[c];
          covered++;
        }
      }
      const i = (py * size + px) * 4;
      if (covered) for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(sum[c] / covered);
      rgba[i + 3] = Math.round((covered / total) * 255);
    }
  }
  return rgba;
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const encodePng = (size, rgba) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
};

// The shipped icons are the final designed logo. Never overwrite them by accident.
const existing = SIZES.filter((size) => fs.existsSync(path.join(OUT, `icon-${size}.png`)));
if (existing.length && !process.argv.includes("--force")) {
  console.error(
    `icons/ already has the designed logo (${existing.join(", ")} px). ` +
      "This script only draws a placeholder. Run with --force to overwrite anyway."
  );
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
for (const size of SIZES) {
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), encodePng(size, render(size)));
}
console.log(`Icons written to ${path.relative(process.cwd(), OUT) || OUT}: ${SIZES.join(", ")} px`);
