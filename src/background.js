const LLM_PROVIDERS = {
  chatgpt: {
    url: "https://chatgpt.com/",
    origins: ["https://chatgpt.com", "https://chat.openai.com"]
  },
  claude: {
    url: "https://claude.ai/new",
    origins: ["https://claude.ai"]
  },
  gemini: {
    url: "https://gemini.google.com/app",
    origins: ["https://gemini.google.com"]
  }
};

const memorySessionStore = new Map();

const getProvider = (provider) => LLM_PROVIDERS[provider] ? provider : "chatgpt";

const normalizeProblemUrl = (value) => {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname}`.replace(/\/$/, "");
  } catch (_error) {
    return "unknown-problem";
  }
};

const makeSessionKey = ({ provider, problemUrl }) => {
  return `cp-sidekick:${provider}:${normalizeProblemUrl(problemUrl)}`;
};

const getSessionStorage = () => chrome.storage?.session;

const readSession = (key, callback) => {
  const storage = getSessionStorage();
  if (!storage?.get) {
    callback(memorySessionStore.get(key));
    return;
  }

  storage.get(key, (items) => {
    if (chrome.runtime.lastError) {
      callback(memorySessionStore.get(key));
      return;
    }
    callback(items?.[key]);
  });
};

const writeSession = (key, value, callback) => {
  memorySessionStore.set(key, value);
  const storage = getSessionStorage();
  if (!storage?.set) {
    callback();
    return;
  }

  storage.set({ [key]: value }, () => {
    callback();
  });
};

const getOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch (_error) {
    return "";
  }
};

const isProviderTab = (tab, provider) => {
  const expectedOrigins = LLM_PROVIDERS[provider].origins;
  return Boolean(tab?.id && expectedOrigins.includes(getOrigin(tab.url)));
};

const focusTab = (tab, sendResponse) => {
  chrome.tabs.update(tab.id, { active: true }, () => {
    if (tab.windowId === undefined) {
      sendResponse({ ok: true, reused: true, tabId: tab.id });
      return;
    }

    chrome.windows.update(tab.windowId, { focused: true }, () => {
      sendResponse({ ok: true, reused: true, tabId: tab.id });
    });
  });
};

const openNewProviderTab = ({ provider, problemUrl, key }, sendResponse) => {
  chrome.tabs.create({ url: LLM_PROVIDERS[provider].url }, (tab) => {
    const record = {
      tabId: tab?.id,
      provider,
      problemUrl: normalizeProblemUrl(problemUrl),
      createdAt: Date.now()
    };

    writeSession(key, record, () => {
      sendResponse({ ok: true, reused: false, tabId: tab?.id });
    });
  });
};

const openOrFocusProvider = (message, sendResponse) => {
  const provider = getProvider(message.provider);
  const problemUrl = message.problemUrl || "";
  const key = makeSessionKey({ provider, problemUrl });

  readSession(key, (record) => {
    if (!record?.tabId) {
      openNewProviderTab({ provider, problemUrl, key }, sendResponse);
      return;
    }

    chrome.tabs.get(record.tabId, (tab) => {
      if (!chrome.runtime.lastError && isProviderTab(tab, provider)) {
        focusTab(tab, sendResponse);
        return;
      }

      openNewProviderTab({ provider, problemUrl, key }, sendResponse);
    });
  });
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "CP_SIDEKICK_OPEN_LLM") return false;

  openOrFocusProvider(message, sendResponse);
  return true;
});

if (typeof module !== "undefined") {
  module.exports = {
    getProvider,
    isProviderTab,
    makeSessionKey,
    normalizeProblemUrl
  };
}
