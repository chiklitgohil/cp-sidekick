// Builds a Firefox copy of the extension in dist/firefox.
// manifest.json in the repo root is the Chrome/Edge manifest. Firefox needs
// background.scripts (it has no extension service workers) and a gecko id,
// and Chrome warns about both, so they only exist in this build.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const out = path.join(root, "dist", "firefox");

// Permanent once published on addons.mozilla.org.
const GECKO_ID = "cp-sidekick@chiklitgohil.github.io";

const EXTENSION_FILES = ["src", "popup", "icons", "LICENSE", "NOTICE"];

const buildFirefox = () => {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  for (const entry of EXTENSION_FILES) {
    fs.cpSync(path.join(root, entry), path.join(out, entry), { recursive: true });
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  manifest.background = {
    scripts: ["src/shared/providers.js", manifest.background.service_worker]
  };
  manifest.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: "128.0",
      // The problem text (website content) is sent to the AI site the user picked.
      // That is the extension's core function, so it is declared as required.
      data_collection_permissions: { required: ["websiteContent"] }
    }
  };

  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return out;
};

if (require.main === module) {
  buildFirefox();
  console.log(`Firefox build written to ${path.relative(root, out)}`);
}

module.exports = { buildFirefox, EXTENSION_FILES, GECKO_ID };
