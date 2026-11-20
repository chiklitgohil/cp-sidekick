const test = require("node:test");
const assert = require("node:assert/strict");

// Minimal chrome mock: no storage.session, so the background uses its in-memory store.
let nextTabId = 100;
const createdTabs = [];
global.chrome = {
  runtime: { onMessage: { addListener() {} }, lastError: undefined },
  tabs: {
    create(props, callback) {
      const tab = { id: nextTabId++, ...props };
      createdTabs.push(tab);
      callback(tab);
    },
    onRemoved: { addListener() {} }
  },
  storage: {}
};

require("../src/shared/providers.js");
const { MSG, handleMessage, parseLiveContestIds, PENDING_TTL_MS, _memory } = require("../src/background.js");

const codeforcesTab = { tab: { id: 1, index: 3, url: "https://codeforces.com/contest/1/problem/A" } };
const senderFor = (tabId, url) => ({ tab: { id: tabId, url }, url });

test("open -> peek -> claim hands the prompt to the opened tab exactly once", async () => {
  const opened = await handleMessage(
    { type: MSG.OPEN_CHAT, provider: "claude", prompt: "hello", autoSend: true, copied: true },
    codeforcesTab
  );
  assert.equal(opened.ok, true);
  const tab = createdTabs.at(-1);
  assert.equal(tab.url, "https://claude.ai/new");
  assert.equal(tab.index, 4, "opens right next to the problem tab");
  assert.equal(tab.openerTabId, 1);

  const sender = senderFor(opened.tabId, "https://claude.ai/new");
  // Peek returns the prompt too, for the "Copy prompt" fallback button.
  assert.deepEqual(await handleMessage({ type: MSG.PEEK_PROMPT }, sender), {
    pending: true,
    prompt: "hello",
    copied: true
  });
  assert.deepEqual(await handleMessage({ type: MSG.CLAIM_PROMPT }, sender), {
    prompt: "hello",
    autoSend: true,
    waitForCode: false,
    copied: true
  });
  assert.deepEqual(await handleMessage({ type: MSG.PEEK_PROMPT }, sender), { pending: false });
  assert.deepEqual(await handleMessage({ type: MSG.CLAIM_PROMPT }, sender), { prompt: null });
});

test("Debug / Refine (waitForCode) are never auto-sent, even with auto-send on", async () => {
  const opened = await handleMessage(
    { type: MSG.OPEN_CHAT, provider: "claude", prompt: "p\n\nMy code:\n", autoSend: true, waitForCode: true },
    codeforcesTab
  );
  const claim = await handleMessage({ type: MSG.CLAIM_PROMPT }, senderFor(opened.tabId, "https://claude.ai/new"));
  assert.equal(claim.autoSend, false);
  assert.equal(claim.waitForCode, true);
});

test("a prompt is never handed to another tab or another site", async () => {
  const opened = await handleMessage({ type: MSG.OPEN_CHAT, provider: "chatgpt", prompt: "secret" }, codeforcesTab);

  const otherTab = senderFor(opened.tabId + 999, "https://chatgpt.com/");
  assert.deepEqual(await handleMessage({ type: MSG.CLAIM_PROMPT }, otherTab), { prompt: null });

  const wrongSite = senderFor(opened.tabId, "https://gemini.google.com/app");
  assert.deepEqual(await handleMessage({ type: MSG.PEEK_PROMPT }, wrongSite), { pending: false });

  const right = senderFor(opened.tabId, "https://chatgpt.com/");
  assert.equal((await handleMessage({ type: MSG.CLAIM_PROMPT }, right)).prompt, "secret");
});

test("auto-send and copied are opt-in flags", async () => {
  const opened = await handleMessage({ type: MSG.OPEN_CHAT, provider: "claude", prompt: "p" }, codeforcesTab);
  const claim = await handleMessage({ type: MSG.CLAIM_PROMPT }, senderFor(opened.tabId, "https://claude.ai/new"));
  assert.equal(claim.autoSend, false);
  assert.equal(claim.copied, false);
});

test("expired prompts are discarded", async () => {
  const opened = await handleMessage({ type: MSG.OPEN_CHAT, provider: "gemini", prompt: "old" }, codeforcesTab);
  const record = _memory.get(`pending:${opened.tabId}`);
  record.createdAt -= PENDING_TTL_MS + 1;
  const sender = senderFor(opened.tabId, "https://gemini.google.com/app");
  assert.deepEqual(await handleMessage({ type: MSG.CLAIM_PROMPT }, sender), { prompt: null });
});

test("unknown provider falls back to ChatGPT; empty prompt is rejected", async () => {
  const opened = await handleMessage({ type: MSG.OPEN_CHAT, provider: "nope", prompt: "x" }, codeforcesTab);
  assert.equal(opened.provider, "chatgpt");
  assert.deepEqual(await handleMessage({ type: MSG.OPEN_CHAT, provider: "claude", prompt: "" }, codeforcesTab), {
    ok: false,
    error: "empty-prompt"
  });
});

test("unrelated messages are ignored", () => {
  assert.equal(handleMessage({ type: "SOMETHING_ELSE" }, codeforcesTab), null);
  assert.equal(handleMessage(undefined, codeforcesTab), null);
});

test("parseLiveContestIds picks contests in the CODING phase", () => {
  assert.deepEqual(
    parseLiveContestIds({
      status: "OK",
      result: [
        { id: 1, phase: "FINISHED" },
        { id: 2, phase: "CODING" },
        { id: 3, phase: "BEFORE" }
      ]
    }),
    [2]
  );
  assert.equal(parseLiveContestIds({ status: "FAILED" }), null);
});

test("contest status: live, not live, and fail-open on network error", async () => {
  const realFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ status: "OK", result: [{ id: 2001, phase: "CODING" }] }) };
  };
  try {
    assert.deepEqual(await handleMessage({ type: MSG.CONTEST_STATUS, contestId: 2001 }), { live: true, known: true });
    assert.deepEqual(await handleMessage({ type: MSG.CONTEST_STATUS, contestId: 2000 }), { live: false, known: true });
    assert.equal(calls, 1, "contest list is cached");

    _memory.delete("contests:live");
    global.fetch = async () => {
      throw new Error("offline");
    };
    assert.deepEqual(await handleMessage({ type: MSG.CONTEST_STATUS, contestId: 2001 }), { live: false, known: false });
  } finally {
    global.fetch = realFetch;
  }
});

test("Google AI Mode: prompt goes in the URL, nothing is left pending", async () => {
  const opened = await handleMessage(
    { type: MSG.OPEN_CHAT, provider: "google", prompt: "Give me a hint: 1 <= n & m", autoSend: false },
    codeforcesTab
  );
  assert.equal(opened.ok, true);
  assert.equal(opened.provider, "google");
  const tab = createdTabs.at(-1);
  const url = new URL(tab.url);
  assert.equal(url.origin + url.pathname, "https://www.google.com/search");
  assert.equal(url.searchParams.get("udm"), "50");
  assert.equal(url.searchParams.get("q"), "Give me a hint: 1 <= n & m");
  assert.equal(tab.index, 4);
  assert.equal(_memory.has(`pending:${opened.tabId}`), false);
});

test("Google AI Mode: an over-long prompt is capped", async () => {
  const google = globalThis.CPSidekick.providers.get("google");
  await handleMessage({ type: MSG.OPEN_CHAT, provider: "google", prompt: "x".repeat(google.maxPromptChars + 500) }, codeforcesTab);
  const q = new URL(createdTabs.at(-1).url).searchParams.get("q");
  assert.equal(q.length, google.maxPromptChars);
});
