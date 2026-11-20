const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPrompt, MODES } = require("../src/promptBuilder.js");

const problem = {
  ok: true,
  platform: "Codeforces",
  title: "A. Sample Problem",
  url: "https://codeforces.com/contest/1/problem/A",
  limits: { time: "1 second", memory: "256 megabytes", input: "standard input", output: "standard output" },
  statement: "Find the answer for $n$.",
  input: "The first line contains $n$ ($1 \\le n \\le 10^5$).",
  output: "Print the answer.",
  notes: "",
  extraSections: [],
  examples: [{ index: 1, input: "3", output: "6" }],
  images: [],
  interactive: false
};

test("includes the mode instruction and the full problem", () => {
  const prompt = buildPrompt({ problem, mode: "hints" });
  assert.match(prompt, /hints only, one at a time/);
  assert.match(prompt, /Problem: A\. Sample Problem \(Codeforces\)/);
  assert.match(prompt, /https:\/\/codeforces\.com\/contest\/1\/problem\/A/);
  assert.match(prompt, /Limits: time limit 1 second, memory limit 256 megabytes\n/);
  assert.match(prompt, /Statement:\nFind the answer for \$n\$\./);
  assert.match(prompt, /Example 1 input:\n3\nExample 1 output:\n6/);
  assert.doesNotMatch(prompt, /Note:/, "empty sections are omitted");
  assert.doesNotMatch(prompt, /\n{3,}/);
});

test("avoids markdown that rich chat inputs reformat", () => {
  const prompt = buildPrompt({ problem, mode: "solution" });
  assert.doesNotMatch(prompt, /```/);
  assert.doesNotMatch(prompt, /^#/m);
  assert.doesNotMatch(prompt, /^- /m);
});

test("unknown mode falls back to hints", () => {
  assert.equal(buildPrompt({ problem, mode: "nope" }), buildPrompt({ problem, mode: "hints" }));
});

test("every mode produces a distinct prompt", () => {
  const prompts = Object.keys(MODES).map((mode) => buildPrompt({ problem, mode }));
  assert.equal(new Set(prompts).size, Object.keys(MODES).length);
});

test("interactive problems, images, file I/O and extra sections are called out", () => {
  const prompt = buildPrompt({
    problem: {
      ...problem,
      interactive: true,
      images: ["https://codeforces.com/a.png"],
      limits: { ...problem.limits, input: "input.txt", output: "output.txt" },
      extraSections: [{ title: "Interaction", text: "Flush after each query." }]
    }
  });
  assert.match(prompt, /This is an interactive problem\./);
  assert.match(prompt, /1 image\(s\)/);
  assert.match(prompt, /files: input\.txt \/ output\.txt/);
  assert.match(prompt, /Interaction:\nFlush after each query\./);
});

test("modes: Understand, Hint, Intuition, Debug, Refine, Solution", () => {
  assert.deepEqual(
    Object.values(MODES).map((m) => m.label),
    ["Understand", "Hint", "Intuition", "Debug", "Refine", "Solution"]
  );
});

test("button text is short: 'Mode · AI'", () => {
  const { buttonLabel } = require("../src/promptBuilder.js");
  assert.equal(buttonLabel("understand", "ChatGPT"), "Understand · ChatGPT");
  assert.equal(buttonLabel("hints", "Claude"), "Hint · Claude");
  assert.equal(buttonLabel("intuition", "Gemini"), "Intuition · Gemini");
  assert.equal(buttonLabel("debug", "Claude"), "Debug · Claude");
  assert.equal(buttonLabel("refine", "Google"), "Refine · Google");
  assert.equal(buttonLabel("solution", "ChatGPT"), "Solution · ChatGPT");
  assert.equal(buttonLabel("unknown", "Gemini"), "Hint · Gemini");
  for (const id of Object.keys(MODES)) {
    assert.ok(buttonLabel(id, "ChatGPT").length <= 20, `${id} label stays short`);
  }
});

test("modes from older versions map to their replacements", () => {
  const { resolveMode, buttonLabel } = require("../src/promptBuilder.js");
  assert.equal(resolveMode("socratic"), "hints");
  assert.equal(resolveMode("review"), "debug");
  assert.equal(resolveMode("refine"), "refine");
  assert.equal(resolveMode(undefined), "hints");
  assert.equal(buttonLabel("review", "Claude"), "Debug · Claude");
});

test("Understand explains the problem without solution hints", () => {
  const prompt = buildPrompt({ problem, mode: "understand" });
  assert.match(prompt, /understand the problem only/);
  assert.match(prompt, /walk through the examples/);
  assert.match(prompt, /Do not hint at the solution/);
});

test("Debug and Refine end at 'My code:' so the user can paste, and drop starter code", () => {
  const { needsCode } = require("../src/promptBuilder.js");
  const withStarter = { ...problem, starterCode: { lang: "C++", code: "class Solution {};" } };
  for (const mode of ["debug", "refine"]) {
    assert.equal(needsCode(mode), true);
    const prompt = buildPrompt({ problem: withStarter, mode });
    assert.ok(prompt.endsWith("\n\nMy code:\n"), `${mode} ends with My code:`);
    assert.doesNotMatch(prompt, /Starter code/);
    assert.match(prompt, /If my code is missing, ask me to paste it/);
  }
  assert.match(buildPrompt({ problem, mode: "refine" }), /explain why it is better than what I did/);
  assert.match(buildPrompt({ problem, mode: "debug" }), /small test case that breaks/);
  for (const mode of ["understand", "hints", "intuition", "solution"]) {
    assert.equal(needsCode(mode), false);
    assert.doesNotMatch(buildPrompt({ problem, mode }), /My code:/);
  }
});

test("LeetCode and AtCoder extras: difficulty, constraints, starter code, sample explanations, Japanese", () => {
  const prompt = buildPrompt({
    problem: {
      ...problem,
      platform: "LeetCode",
      difficulty: "Hard",
      language: "ja",
      constraints: "- $1 \\le n \\le 10$",
      examples: [{ index: 1, input: "3", output: "6", explanation: "Because 3 * 2 = 6." }],
      starterCode: { lang: "C++", code: "class Solution {};" }
    }
  });
  assert.match(prompt, /Problem: A\. Sample Problem \(LeetCode, Hard\)/);
  assert.match(prompt, /only available in Japanese/);
  assert.match(prompt, /Constraints:\n- \$1 \\le n \\le 10\$/);
  assert.match(prompt, /Example 1 explanation:\nBecause 3 \* 2 = 6\./);
  assert.match(prompt, /Starter code \(C\+\+\):\nclass Solution \{\};$/);
});

test("auto-send is off by default", () => {
  globalThis.CPSidekick = globalThis.CPSidekick || {};
  require("../src/shared/providers.js");
  const settings = require("../src/shared/settings.js");
  assert.equal(settings.DEFAULTS.autoSend, false);
  assert.equal(settings.sanitize({}).autoSend, false);
  assert.equal(settings.sanitize({ autoSend: true }).autoSend, true);
  assert.equal(settings.sanitize({ provider: "bogus", mode: "bogus" }).provider, "chatgpt");
});

test("every mode has a short explainer for settings and onboarding", () => {
  for (const [id, mode] of Object.entries(MODES)) {
    assert.ok(mode.description && mode.description.length <= 70, `${id} description`);
  }
});

test("compact prompt (Google AI Mode URL): first 2 examples, no extras, within the limit", () => {
  const big = {
    ...problem,
    statement: "word ".repeat(3000).trim(),
    images: ["https://x/y.png"],
    starterCode: { lang: "C++", code: "class Solution {};" },
    examples: [1, 2, 3].map((i) => ({ index: i, input: String(i), output: String(i * 2), explanation: "why" }))
  };
  const prompt = buildPrompt({ problem: big, mode: "hints", compact: true, maxChars: 2000 });
  assert.ok(prompt.length <= 2000, `length ${prompt.length}`);
  assert.match(prompt, /truncated; the full statement is at the URL above/);
  assert.match(prompt, /Example 2 input/);
  assert.doesNotMatch(prompt, /Example 3 input/);
  assert.doesNotMatch(prompt, /explanation|Starter code|image\(s\)/);
  assert.match(prompt, /hints only, one at a time/, "mode instruction is kept");

  const small = buildPrompt({ problem, mode: "hints", compact: true, maxChars: 6000 });
  assert.doesNotMatch(small, /truncated/);
});
