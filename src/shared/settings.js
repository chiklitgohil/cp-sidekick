// User settings, stored in chrome.storage.sync. Requires providers.js and promptBuilder.js.
(function () {
  const NS = (globalThis.CPSidekick = globalThis.CPSidekick || {});

  const DEFAULTS = Object.freeze({
    provider: "chatgpt",
    mode: "hints",
    // Off by default: the prompt is filled in and the user presses Enter.
    autoSend: false
  });

  const sanitize = (raw = {}) => ({
    provider: NS.providers?.isValid(raw.provider) ? raw.provider : DEFAULTS.provider,
    // resolveMode also maps modes from older versions (socratic -> hints, review -> debug).
    mode: NS.resolveMode ? NS.resolveMode(raw.mode) : DEFAULTS.mode,
    autoSend: typeof raw.autoSend === "boolean" ? raw.autoSend : DEFAULTS.autoSend
  });

  const load = () =>
    new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ ...DEFAULTS }, (items) => {
          resolve(sanitize(chrome.runtime.lastError ? {} : items));
        });
      } catch (_error) {
        resolve(sanitize({}));
      }
    });

  const save = (patch) =>
    new Promise((resolve) => {
      try {
        chrome.storage.sync.set(patch, () => resolve(!chrome.runtime.lastError));
      } catch (_error) {
        resolve(false);
      }
    });

  const onChange = (callback) => {
    try {
      chrome.storage.onChanged.addListener((_changes, area) => {
        if (area === "sync") load().then(callback);
      });
    } catch (_error) {
      // Settings changes will apply on next page load.
    }
  };

  NS.settings = { DEFAULTS, sanitize, load, save, onChange };

  if (typeof module !== "undefined") module.exports = NS.settings;
})();
