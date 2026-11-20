// AI assistants CP Sidekick can hand a prompt to.
//
// handoff "fill": open the chat page; providerContent.js fills in the chat box.
//   Selectors are tried in order; generic fallbacks cover small markup changes.
// handoff "url":  the prompt travels in the URL (no content script, no permission).
//   It always runs immediately, so auto-send doesn't apply; the prompt is the
//   compact form, capped at maxPromptChars.
(function () {
  const NS = (globalThis.CPSidekick = globalThis.CPSidekick || {});

  const PROVIDERS = {
    chatgpt: {
      id: "chatgpt",
      label: "ChatGPT",
      handoff: "fill",
      url: "https://chatgpt.com/",
      origins: ["https://chatgpt.com", "https://chat.openai.com"],
      composer: ["#prompt-textarea", "textarea[aria-label*='ChatGPT' i]", "form textarea"],
      send: ["button[data-testid='send-button']", "#composer-submit-button", "button[aria-label='Send message']"]
    },
    claude: {
      id: "claude",
      label: "Claude",
      handoff: "fill",
      url: "https://claude.ai/new",
      origins: ["https://claude.ai"],
      composer: ["[data-testid='chat-input'][contenteditable='true']", "div.ProseMirror[contenteditable='true']"],
      send: ["button[aria-label='Send message']", "button[aria-label='Send Message']"]
    },
    gemini: {
      id: "gemini",
      label: "Gemini",
      handoff: "fill",
      url: "https://gemini.google.com/app",
      origins: ["https://gemini.google.com"],
      composer: ["rich-textarea .ql-editor[contenteditable='true']", ".ql-editor[contenteditable='true']"],
      send: ["button[aria-label='Send message']", "button.send-button"]
    },
    google: {
      id: "google",
      label: "Google AI Mode",
      shortLabel: "Google",
      note: "Google Search's AI Mode. It runs right away, so auto-send doesn't apply.",
      handoff: "url",
      url: "https://www.google.com/search?udm=50",
      // Generous for typical statements while staying well inside URL length limits.
      maxPromptChars: 6000,
      buildUrl: (prompt) => `https://www.google.com/search?udm=50&q=${encodeURIComponent(prompt)}`,
      origins: []
    }
  };

  const DEFAULT_PROVIDER = "chatgpt";

  // Message types shared by the background script and content scripts.
  NS.MSG = Object.freeze({
    OPEN_CHAT: "CP_SIDEKICK_OPEN_CHAT",
    PEEK_PROMPT: "CP_SIDEKICK_PEEK_PROMPT",
    CLAIM_PROMPT: "CP_SIDEKICK_CLAIM_PROMPT",
    CONTEST_STATUS: "CP_SIDEKICK_CONTEST_STATUS"
  });

  // Promise wrapper for runtime messages. Resolves null on any failure
  // (e.g. the extension was reloaded and this page has not been refreshed).
  NS.sendMessage = (message) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          resolve(chrome.runtime.lastError ? null : response || null);
        });
      } catch (_error) {
        resolve(null);
      }
    });

  NS.providers = {
    all: PROVIDERS,
    DEFAULT_PROVIDER,
    get: (id) => PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER],
    isValid: (id) => Object.prototype.hasOwnProperty.call(PROVIDERS, id),
    // Name used on the page button ("Get a hint from Google").
    buttonName: (id) => {
      const provider = PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER];
      return provider.shortLabel || provider.label;
    },
    usesUrlHandoff: (id) => (PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER]).handoff === "url",
    byOrigin: (origin) => Object.values(PROVIDERS).find((p) => p.origins.includes(origin)) || null
  };

  if (typeof module !== "undefined") module.exports = NS.providers;
})();
