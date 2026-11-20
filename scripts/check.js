// Static checks: JS syntax, and that every file the manifest/popup references exists.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const failures = [];

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const jsFiles = ["src", "popup", "scripts"].flatMap((dir) => walk(path.join(root, dir))).filter((f) => f.endsWith(".js"));
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    failures.push(`Syntax error in ${path.relative(root, file)}:\n${error.stderr}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (manifest.version !== pkg.version) {
  failures.push(`Version mismatch: manifest ${manifest.version} vs package.json ${pkg.version}`);
}

for (const key of ["browser_specific_settings"]) {
  if (manifest[key]) failures.push(`manifest.json is the Chrome manifest; move ${key} to scripts/build-firefox.js`);
}
if (manifest.background.scripts) failures.push("manifest.json must not use background.scripts (Chrome MV3); Firefox gets it from scripts/build-firefox.js");

const referenced = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_ui.page,
  ...manifest.content_scripts.flatMap((cs) => [...(cs.js || []), ...(cs.css || [])]),
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action.default_icon || {})
];

if (!manifest.icons?.["128"]) failures.push("manifest.icons must include a 128px icon (store requirement)");
if ((manifest.description || "").length > 132) {
  failures.push(`manifest.description is ${manifest.description.length} characters; the Chrome Web Store limit is 132`);
}

// Every judge file must be loaded, and every AI site must have its content script.
const judgeScripts = manifest.content_scripts[0].js;
for (const file of fs.readdirSync(path.join(root, "src", "platforms"))) {
  if (!judgeScripts.includes(`src/platforms/${file}`)) failures.push(`src/platforms/${file} is not in the judge content script`);
}
globalThis.CPSidekick = {};
require(path.join(root, "src", "shared", "providers.js"));
const aiMatches = manifest.content_scripts.flatMap((cs) => cs.matches);
for (const provider of Object.values(globalThis.CPSidekick.providers.all)) {
  for (const origin of provider.origins) {
    if (!aiMatches.includes(`${origin}/*`)) failures.push(`No content script match for ${origin}/*`);
  }
}

const popupHtml = fs.readFileSync(path.join(root, manifest.action.default_popup), "utf8");
for (const match of popupHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^https?:/.test(match[1])) continue;
  referenced.push(path.posix.join(path.posix.dirname(manifest.action.default_popup), match[1]));
}

// The service worker imports providers.js relative to itself.
const sw = fs.readFileSync(path.join(root, manifest.background.service_worker), "utf8");
for (const match of sw.matchAll(/importScripts\("([^"]+)"\)/g)) {
  referenced.push(path.posix.join(path.posix.dirname(manifest.background.service_worker), match[1]));
}

for (const file of new Set(referenced)) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing file referenced by extension: ${file}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`check passed (${jsFiles.length} JS files, ${new Set(referenced).size} referenced files)`);
