// Background script: opens the AI chat tab, holds the prompt until that tab
// picks it up, and answers "is this contest live?" checks.
if (typeof importScripts === "function" && !globalThis.CPSidekick?.providers) {
  // Chrome/Edge service worker. Firefox loads providers.js via manifest background.scripts.
  importScripts("shared/providers.js");
}

const MSG = globalThis.CPSidekick.MSG;

// A pending prompt waits this long for its tab (covers a login redirect).
const PENDING_TTL_MS = 5 * 60 * 1000;
const CONTEST_CACHE_TTL_MS = 10 * 60 * 1000;
const CONTEST_FETCH_TIMEOUT_MS = 6000;
const CONTEST_LIST_URL = "https://codeforces.com/api/contest.list?gym=false";

const providers = () => globalThis.CPSidekick.providers;

// In-memory copy plus storage.session, so a restarted service worker still knows.
const memory = new Map();

const sessionStore = () => {
  try {
    return chrome.storage?.session || null;
  } catch (_error) {
    return null;
  }
};

const storeGet = (key) =>
  new Promise((resolve) => {
    if (memory.has(key)) return resolve(memory.get(key));
    const store = sessionStore();
    if (!store) return resolve(undefined);
    store.get(key, (items) => resolve(chrome.runtime.lastError ? undefined : items?.[key]));
  });

const storeSet = (key, value) =>
  new Promise((resolve) => {
    memory.set(key, value);
    const store = sessionStore();
    if (!store) return resolve();
    store.set({ [key]: value }, () => resolve());
  });

const storeRemove = (key) =>
  new Promise((resolve) => {
    memory.delete(key);
    const store = sessionStore();
    if (!store) return resolve();
    store.remove(key, () => resolve());
  });

const pendingKey = (tabId) => `pending:${tabId}`;

const originOf = (url) => {
  try {
    return new URL(url).origin;
  } catch (_error) {
    return "";
  }
};

const createTab = (props) =>
  new Promise((resolve) => {
    chrome.tabs.create(props, (tab) => resolve(chrome.runtime.lastError ? null : tab));
  });

const openChat = async (message, sender) => {
  const prompt = typeof message.prompt === "string" ? message.prompt : "";
  if (!prompt) return { ok: false, error: "empty-prompt" };

  const provider = providers().get(message.provider);
  // URL hand-off (Google AI Mode): the prompt is in the URL, nothing waits for the tab.
  const urlHandoff = provider.handoff === "url";
  const url = urlHandoff ? provider.buildUrl(prompt.slice(0, provider.maxPromptChars)) : provider.url;

  const props = { url, active: true };
  if (sender?.tab?.id !== undefined) {
    props.openerTabId = sender.tab.id;
    if (typeof sender.tab.index === "number") props.index = sender.tab.index + 1;
  }

  let tab = await createTab(props);
  if (!tab && props.openerTabId !== undefined) {
    // Some browsers reject openerTabId/index in edge cases; retry plainly.
    tab = await createTab({ url, active: true });
  }
  if (typeof tab?.id !== "number") return { ok: false, error: "tab-failed" };

  if (urlHandoff) return { ok: true, tabId: tab.id, provider: provider.id };

  await storeSet(pendingKey(tab.id), {
    prompt,
    provider: provider.id,
    // Opt-in, and never for modes that wait for the user to paste their code.
    autoSend: message.autoSend === true && message.waitForCode !== true,
    waitForCode: message.waitForCode === true,
    copied: message.copied === true,
    createdAt: Date.now()
  });
  return { ok: true, tabId: tab.id, provider: provider.id };
};

// Returns the pending record for the sender's tab if it is fresh and the tab is on the right site.
const findPending = async (sender) => {
  const tabId = sender?.tab?.id;
  if (tabId === undefined) return null;
  const record = await storeGet(pendingKey(tabId));
  if (!record) return null;

  if (Date.now() - record.createdAt > PENDING_TTL_MS) {
    await storeRemove(pendingKey(tabId));
    return null;
  }
  const site = providers().byOrigin(originOf(sender.url || sender.tab.url || ""));
  if (!site || site.id !== record.provider) return null;
  return record;
};

// Peek also returns the prompt, so the AI page can offer a "Copy prompt" button
// even when it never finds a chat box to claim it into.
const peekPrompt = async (sender) => {
  const record = await findPending(sender);
  return record ? { pending: true, prompt: record.prompt, copied: record.copied } : { pending: false };
};

const claimPrompt = async (sender) => {
  const record = await findPending(sender);
  if (!record) return { prompt: null };
  await storeRemove(pendingKey(sender.tab.id));
  return { prompt: record.prompt, autoSend: record.autoSend, waitForCode: record.waitForCode, copied: record.copied };
};

// ---- Live contest check (Codeforces) ----

const parseLiveContestIds = (json) => {
  if (json?.status !== "OK" || !Array.isArray(json.result)) return null;
  return json.result.filter((c) => c.phase === "CODING").map((c) => c.id);
};

const fetchLiveContestIds = async () => {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), CONTEST_FETCH_TIMEOUT_MS) : null;
  try {
    const response = await fetch(CONTEST_LIST_URL, {
      credentials: "omit",
      signal: controller?.signal
    });
    if (!response.ok) return null;
    return parseLiveContestIds(await response.json());
  } catch (_error) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const contestStatus = async (message) => {
  const contestId = Number(message.contestId);
  if (!Number.isFinite(contestId)) return { live: false, known: false };

  let cache = await storeGet("contests:live");
  if (!cache || Date.now() - cache.fetchedAt > CONTEST_CACHE_TTL_MS) {
    const ids = await fetchLiveContestIds();
    if (!ids) return { live: false, known: false }; // fail open: never block on a network error
    cache = { ids, fetchedAt: Date.now() };
    await storeSet("contests:live", cache);
  }
  return { live: cache.ids.includes(contestId), known: true };
};

const handleMessage = (message, sender) => {
  switch (message?.type) {
    case MSG.OPEN_CHAT:
      return openChat(message, sender);
    case MSG.PEEK_PROMPT:
      return peekPrompt(sender);
    case MSG.CLAIM_PROMPT:
      return claimPrompt(sender);
    case MSG.CONTEST_STATUS:
      return contestStatus(message);
    default:
      return null;
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const result = handleMessage(message, sender);
  if (!result) return false;
  result.then(sendResponse, () => sendResponse({ ok: false, error: "internal" }));
  return true;
});

// First install: open the settings page with a short welcome.
chrome.runtime.onInstalled?.addListener((details) => {
  if (details?.reason !== "install") return;
  try {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup/popup.html?welcome=1") });
  } catch (_error) {
    // Not critical.
  }
});

chrome.tabs?.onRemoved?.addListener((tabId) => {
  storeRemove(pendingKey(tabId));
});

if (typeof module !== "undefined") {
  module.exports = { MSG, handleMessage, parseLiveContestIds, PENDING_TTL_MS, _memory: memory };
}
