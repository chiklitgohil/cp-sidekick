// Creates store-ready zips in dist/:
//   cp-sidekick-chrome-<version>.zip   Chrome Web Store and Edge Add-ons
//   cp-sidekick-firefox-<version>.zip  addons.mozilla.org
// Only extension files are included (no tests, node_modules, or docs).
// Uses a tiny built-in zip writer (deflate via zlib), so no dependencies.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { buildFirefox, EXTENSION_FILES } = require("./build-firefox.js");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

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

// Fixed timestamp (1980-01-01) so identical inputs give identical zips.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

const writeZip = (zipPath, files) => {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  fs.writeFileSync(zipPath, Buffer.concat([...locals, ...centrals, end]));
};

const collect = (base, entries) => {
  const files = [];
  const walk = (rel) => {
    const full = path.join(base, rel);
    if (fs.statSync(full).isDirectory()) {
      fs.readdirSync(full).sort().forEach((child) => walk(path.join(rel, child)));
    } else {
      files.push({ name: rel.split(path.sep).join("/"), data: fs.readFileSync(full) });
    }
  };
  entries.forEach(walk);
  return files;
};

fs.mkdirSync(dist, { recursive: true });

const chromeZip = path.join(dist, `cp-sidekick-chrome-${version}.zip`);
writeZip(chromeZip, collect(root, ["manifest.json", ...EXTENSION_FILES]));

const firefoxDir = buildFirefox();
const firefoxZip = path.join(dist, `cp-sidekick-firefox-${version}.zip`);
writeZip(firefoxZip, collect(firefoxDir, ["manifest.json", ...EXTENSION_FILES]));

for (const zip of [chromeZip, firefoxZip]) {
  console.log(`${path.relative(root, zip)}  (${(fs.statSync(zip).size / 1024).toFixed(1)} KB)`);
}
