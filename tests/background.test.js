const assert = require("node:assert/strict");

global.chrome = {
  runtime: {
    onMessage: {
      addListener() {}
    }
  }
};

const {
  getProvider,
  isProviderTab,
  makeSessionKey,
  normalizeProblemUrl
} = require("../src/background.js");

assert.equal(getProvider("chatgpt"), "chatgpt");
assert.equal(getProvider("unknown"), "chatgpt");

assert.equal(
  normalizeProblemUrl("https://codeforces.com/contest/1/problem/A?locale=en#statement"),
  "https://codeforces.com/contest/1/problem/A"
);

assert.equal(
  makeSessionKey({
    provider: "claude",
    problemUrl: "https://codeforces.com/problemset/problem/1/A/"
  }),
  "cp-sidekick:claude:https://codeforces.com/problemset/problem/1/A"
);

assert.equal(isProviderTab({ id: 1, url: "https://chatgpt.com/c/abc" }, "chatgpt"), true);
assert.equal(isProviderTab({ id: 1, url: "https://chat.openai.com/c/abc" }, "chatgpt"), true);
assert.equal(isProviderTab({ id: 2, url: "https://example.com/" }, "chatgpt"), false);
assert.equal(isProviderTab({ id: 3, url: "https://claude.ai/chat/abc" }, "claude"), true);
assert.equal(isProviderTab({ id: 4, url: "https://gemini.google.com/app/abc" }, "gemini"), true);

console.log("background tests passed");
