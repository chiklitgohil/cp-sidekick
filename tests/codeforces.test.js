const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

require("../src/platforms/domText.js");
const codeforces = require("../src/platforms/codeforces.js");

const load = (name, url) => {
  const html = fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
  return new JSDOM(html, { url }).window.document;
};

const RENDERED_URL = "https://codeforces.com/problemset/problem/2000/D";
const RAW_URL = "https://codeforces.com/contest/1/problem/A";

test("matches supported problem URLs only", () => {
  assert.ok(codeforces.matches("https://codeforces.com/problemset/problem/2000/D"));
  assert.ok(codeforces.matches("https://codeforces.com/contest/1980/problem/F2?locale=en"));
  assert.ok(codeforces.matches("https://codeforces.com/gym/104114/problem/B"));
  assert.ok(codeforces.matches("https://m1.codeforces.com/contest/1/problem/A"));
  assert.ok(!codeforces.matches("https://codeforces.com/contest/1980"));
  assert.ok(!codeforces.matches("https://codeforces.com/blog/entry/1"));
  assert.ok(!codeforces.matches("https://evilcodeforces.com/contest/1/problem/A"));
});

test("contestId reads the contest from the URL and skips gym", () => {
  assert.equal(codeforces.contestId("https://codeforces.com/problemset/problem/2000/D"), 2000);
  assert.equal(codeforces.contestId("https://codeforces.com/contest/1980/problem/F2"), 1980);
  assert.equal(codeforces.contestId("https://codeforces.com/gym/104114/problem/B"), null);
});

test("rendered MathJax page: TeX is kept, glyph soup is dropped", async () => {
  const problem = await codeforces.extract(load("codeforces-rendered.html", RENDERED_URL), RENDERED_URL);
  assert.equal(problem.ok, true);
  assert.equal(problem.title, "D. Right Left Wrong");
  assert.match(problem.statement, /There is a strip of \$n\$ cells, cell \$i\$ holds \$a_i\$\./);
  assert.match(problem.statement, /\$\$\\sum_\{i=l\}\^\{r\} a_i\$\$/);
  assert.match(problem.input, /\$1 \\le t \\le 10\^4\$/);
  assert.match(problem.input, /\$2 \\le n \\le 2 \\cdot 10\^5\$/);
  for (const text of [problem.statement, problem.input, problem.notes]) {
    assert.doesNotMatch(text, /[𝑎𝑖𝑡∑⋅≤]/u, "rendered MathJax glyphs must not leak");
  }
  assert.doesNotMatch(problem.input, /^Input/, "section title is removed");
  assert.equal(problem.notes, "In the first test case, choose $l = 1$ first.");
});

test("rendered page: header limits and paragraphs", async () => {
  const problem = await codeforces.extract(load("codeforces-rendered.html", RENDERED_URL), RENDERED_URL);
  assert.deepEqual(problem.limits, {
    time: "2 seconds",
    memory: "256 megabytes",
    input: "standard input",
    output: "standard output"
  });
  assert.match(problem.statement, /a_i\$\.\n\nFind the maximum score:/);
});

test("samples keep one line per row and exclude the Copy button", async () => {
  const problem = await codeforces.extract(load("codeforces-rendered.html", RENDERED_URL), RENDERED_URL);
  assert.equal(problem.examples.length, 1);
  assert.equal(problem.examples[0].input, "2\n6\n3 5 1 4 3 2\nLRLLLR\n2\n2 8\nLR");
  assert.equal(problem.examples[0].output, "18\n10");
});

test("images are reported with absolute URLs", async () => {
  const problem = await codeforces.extract(load("codeforces-rendered.html", RENDERED_URL), RENDERED_URL);
  assert.deepEqual(problem.images, ["https://codeforces.com/predownloaded/aa/bb/strip.png"]);
  assert.match(problem.statement, /\[image: https:\/\/codeforces\.com\/predownloaded\/aa\/bb\/strip\.png\]/);
});

test("raw $$$ TeX, <br> samples, multiple samples, interaction section", async () => {
  const problem = await codeforces.extract(load("codeforces-raw.html", RAW_URL), RAW_URL);
  assert.equal(problem.ok, true);
  assert.match(problem.statement, /hidden number \$x\$ with \$1 \\le x \\le 10\^9\$\./);
  assert.match(problem.statement, /Display: \$\$x\^2 \+ 1\$\$/);
  assert.equal(problem.input, "The first line contains $n$.");
  assert.equal(problem.interactive, true);
  assert.deepEqual(problem.extraSections, [{ title: "Interaction", text: "Print ? y and flush." }]);
  assert.deepEqual(
    problem.examples.map((e) => [e.input, e.output]),
    [
      ["3\n1 2 3", "6"],
      ["1\n  5", "5"]
    ]
  );
});

test("page without a statement fails with a readable reason", async () => {
  const doc = new JSDOM("<html><body><p>PDF statement</p></body></html>").window.document;
  const result = await codeforces.extract(doc, "https://codeforces.com/gym/1/problem/A");
  assert.equal(result.ok, false);
  assert.match(result.reason, /No problem statement/);
});
