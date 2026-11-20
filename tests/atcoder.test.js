const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

require("../src/platforms/domText.js");
const atcoder = require("../src/platforms/atcoder.js");

const URL = "https://atcoder.jp/contests/abc300/tasks/abc300_b";
const html = fs.readFileSync(path.join(__dirname, "fixtures", "atcoder-task.html"), "utf8");
// Inline scripts are not executed (jsdom default); the extractor only reads their text.
const load = (source = html) => new JSDOM(source, { url: URL }).window.document;

test("matches task URLs only", () => {
  assert.ok(atcoder.matches("https://atcoder.jp/contests/abc300/tasks/abc300_b"));
  assert.ok(atcoder.matches("https://atcoder.jp/contests/arc170/tasks/arc170_a?lang=en"));
  assert.ok(!atcoder.matches("https://atcoder.jp/contests/abc300/tasks"));
  assert.ok(!atcoder.matches("https://atcoder.jp/contests/abc300"));
  assert.ok(!atcoder.matches("https://atcoder.jp.evil.com/contests/abc300/tasks/abc300_b"));
});

test("extracts English statement with TeX from KaTeX annotations", async () => {
  const problem = await atcoder.extract(load(), URL);
  assert.equal(problem.ok, true);
  assert.equal(problem.platform, "AtCoder");
  assert.equal(problem.title, "B - Same Map in the RPG World");
  assert.equal(problem.language, "en");
  assert.deepEqual(problem.limits, { time: "2 sec", memory: "1024 MiB" });
  assert.match(problem.statement, /grid with \$H\$ rows and cell \$A_\{i,j\}\$ is # or \.\./);
  assert.match(problem.statement, /Determine whether \$B\$ can be obtained\./, "un-rendered <var> becomes TeX");
  assert.doesNotMatch(problem.statement, /𝐻|日本語/u);
  assert.match(problem.constraints, /- \$2 \\leq H, W \\leq 30\$/);
});

test("input format keeps math bare inside <pre>", async () => {
  const problem = await atcoder.extract(load(), URL);
  assert.match(problem.input, /following format:\n\nH W\nA_\{1,1\}A_\{1,2\}\\dots A_\{1,W\}/);
  assert.equal(problem.output, "Print Yes or No.");
});

test("samples are paired by number, without Copy buttons, with explanations", async () => {
  const problem = await atcoder.extract(load(), URL);
  assert.deepEqual(problem.examples, [
    { index: 1, input: "4 3\n..#\n#..", output: "Yes", explanation: "Shift once vertically." },
    { index: 2, input: "2 2\n##", output: "No", explanation: "" }
  ]);
});

test("Japanese-only tasks fall back to the Japanese statement", async () => {
  const jaOnly = html.replace(/<span class="lang-en">[\s\S]*<\/span>\s*<\/span>\s*<\/div>/, "</span></div>");
  const problem = await atcoder.extract(load(jaOnly), URL);
  assert.equal(problem.ok, true);
  assert.equal(problem.language, "ja");
  assert.equal(problem.statement, "日本語の問題文");
});

test("missing statement fails with a readable reason", async () => {
  const doc = new JSDOM("<html><body></body></html>", { url: URL }).window.document;
  const result = await atcoder.extract(doc, URL);
  assert.equal(result.ok, false);
});

test("live contest window is read from the page scripts", () => {
  const window = atcoder.contestWindow(load());
  assert.equal(window.start, Date.parse("2023-04-29T21:00:00+09:00"));
  assert.equal(window.end, Date.parse("2023-04-29T22:40:00+09:00"));
  assert.equal(atcoder.isLive(window, Date.parse("2023-04-29T21:30:00+09:00")), true);
  assert.equal(atcoder.isLive(window, Date.parse("2023-04-29T22:40:00+09:00")), false);
  assert.equal(atcoder.isLive(window, Date.parse("2023-04-29T20:59:00+09:00")), false);
});

test("permanent practice contests (very long windows) never count as live", () => {
  const start = Date.parse("2020-01-01T00:00:00Z");
  const end = Date.parse("2099-01-01T00:00:00Z");
  assert.equal(atcoder.isLive({ start, end }, Date.parse("2026-01-01T00:00:00Z")), false);
  assert.equal(atcoder.isLive({ start: null, end: null }), false);
});
