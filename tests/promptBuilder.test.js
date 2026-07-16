const assert = require("node:assert/strict");

global.window = { CPSidekick: {} };
require("../src/promptBuilder.js");

const problem = {
  platform: "Codeforces",
  title: "A. Sample Problem",
  url: "https://codeforces.com/contest/1/problem/A",
  statement: "Find the answer.",
  input: "The first line contains n.",
  output: "Print the answer.",
  constraints: ["1 <= n <= 100000"],
  examples: [
    {
      index: 1,
      input: "3",
      output: "6"
    }
  ],
  meta: {
    timeLimit: "1 second",
    memoryLimit: "256 megabytes"
  }
};

const hintsPrompt = window.CPSidekick.buildPrompt({ problem, mode: "hints" });
assert.match(hintsPrompt, /Hints only/);
assert.match(hintsPrompt, /Do not reveal the full solution/);
assert.match(hintsPrompt, /A\. Sample Problem/);
assert.match(hintsPrompt, /1 <= n <= 100000/);
assert.match(hintsPrompt, /Example 1/);

const reviewPrompt = window.CPSidekick.buildPrompt({
  problem,
  mode: "review",
  userCode: "int main() { return 0; }"
});
assert.match(reviewPrompt, /Find bug in my solution/);
assert.match(reviewPrompt, /My current solution attempt/);
assert.match(reviewPrompt, /int main/);

const modeLabels = Object.values(window.CPSidekick.promptModes).map((mode) => mode.label);
assert.deepEqual(modeLabels, [
  "Hints only",
  "Socratic mode",
  "Explain intuition",
  "Find bug in my solution",
  "Optimal solution after attempt"
]);

console.log("promptBuilder tests passed");
