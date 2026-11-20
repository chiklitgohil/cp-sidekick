// Page-theme detection for the on-page button, and the button's color contrast.
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

// Load content.js in "helpers only" mode: it exports its pure functions and stops
// before creating the button.
globalThis.CPSidekick = {
  _contentTestOnly: true,
  platforms: {},
  buildPrompt() {},
  settings: {},
  providers: {},
  sendMessage() {}
};
require("../src/content.js");
const { parseColor, luminance, detectPageTheme } = globalThis.CPSidekick._contentTest;

const page = (css, { prefersDark = false, behind = null } = {}) => {
  const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body><main id="m">x</main></body></html>`);
  const { window } = dom;
  window.matchMedia = (query) => ({ matches: prefersDark && /dark/.test(query) });
  if (behind) window.document.elementsFromPoint = () => [window.document.getElementById(behind)];
  return { doc: window.document, win: window };
};

test("parseColor handles rgb, rgba and transparent", () => {
  assert.deepEqual(parseColor("rgb(255, 255, 255)"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor("rgba(0, 0, 0, 0)"), { r: 0, g: 0, b: 0, a: 0 });
  assert.deepEqual(parseColor("rgb(10 20 30 / 50%)"), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.equal(parseColor("transparent"), null);
});

test("white page -> on-light", () => {
  const { doc, win } = page("body { background: #ffffff; }");
  assert.equal(detectPageTheme(doc, win), "on-light");
});

test("dark html with transparent body (typical dark mode) -> on-dark", () => {
  const { doc, win } = page("html { background: #1a1a1a; } body { background: transparent; }");
  assert.equal(detectPageTheme(doc, win), "on-dark");
});

test("the element actually behind the button wins over body", () => {
  const { doc, win } = page("body { background: #fff; } #m { background: rgb(26, 26, 26); }", { behind: "m" });
  assert.equal(detectPageTheme(doc, win), "on-dark");
});

test("no background anywhere -> follows the OS color scheme", () => {
  assert.equal(detectPageTheme(...Object.values(page("", { prefersDark: true }))), "on-dark");
  assert.equal(detectPageTheme(...Object.values(page("", { prefersDark: false }))), "on-light");
});

// WCAG contrast ratio between two colors.
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });

test("button text meets WCAG AA (4.5:1) in every state", () => {
  const pairs = {
    "light page": ["#ffffff", "#0f766e"],
    "light page hover": ["#ffffff", "#115e59"],
    "light page disabled": ["#334155", "#e2e8f0"],
    "dark page": ["#0b1220", "#2dd4bf"],
    "dark page hover": ["#0b1220", "#5eead4"],
    "dark page disabled": ["#cbd5e1", "#1e293b"]
  };
  for (const [state, [fg, bg]] of Object.entries(pairs)) {
    assert.ok(contrast(hex(fg), hex(bg)) >= 4.5, `${state}: ${contrast(hex(fg), hex(bg)).toFixed(2)}:1`);
  }
});

test("the button stands out from both page backgrounds (3:1 non-text contrast)", () => {
  assert.ok(contrast(hex("#0f766e"), hex("#ffffff")) >= 3, "teal button on white page");
  assert.ok(contrast(hex("#2dd4bf"), hex("#1a1a1a")) >= 3, "light-teal button on dark page");
});
