// Problem-page content script: one button, one click.
// Click -> read the problem -> build the prompt from saved settings ->
// copy it (backup) -> open the AI chat, which fills itself in (providerContent.js),
// or for Google AI Mode, open it with the prompt in the URL.
//
// Works on single-page apps (LeetCode): the URL is watched, and the button is
// shown, hidden and re-checked whenever it changes.
//
// The button adapts to the site's theme: it reads the actual background color
// behind it, so it stays visible on light pages, dark modes and Dark Reader.
(function () {
  const NS = globalThis.CPSidekick;
  if (!NS?.platforms || !NS.buildPrompt || !NS.settings || !NS.providers || !NS.sendMessage) return;

  // ---- Page theme detection (pure helpers, exported for tests) ----

  const parseColor = (value) => {
    const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i.exec(value || "");
    if (!match) return null;
    let alpha = match[4] === undefined ? 1 : parseFloat(match[4]);
    if (String(match[4]).endsWith("%")) alpha /= 100;
    return { r: +match[1], g: +match[2], b: +match[3], a: alpha };
  };

  // WCAG relative luminance, 0 (black) .. 1 (white).
  const luminance = ({ r, g, b }) => {
    const channel = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const DARK_THRESHOLD = 0.4;

  // First mostly-opaque background color on el or its ancestors.
  const backgroundOf = (el, win) => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const color = parseColor(win.getComputedStyle(node).backgroundColor);
      if (color && color.a >= 0.5) return color;
    }
    return null;
  };

  const detectPageTheme = (doc = document, win = window, ownButton = null) => {
    let color = null;

    // What is actually painted where the button sits (bottom-right corner).
    if (typeof doc.elementsFromPoint === "function") {
      const x = Math.max(0, win.innerWidth - 60);
      const y = Math.max(0, win.innerHeight - 30);
      const behind = doc.elementsFromPoint(x, y).find((el) => el !== ownButton && !ownButton?.contains(el));
      if (behind) color = backgroundOf(behind, win);
    }
    if (!color) color = backgroundOf(doc.body, win) || backgroundOf(doc.documentElement, win);
    if (!color) {
      const prefersDark = win.matchMedia?.("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "on-dark" : "on-light";
    }
    return luminance(color) < DARK_THRESHOLD ? "on-dark" : "on-light";
  };

  NS._contentTest = { parseColor, luminance, detectPageTheme };
  if (NS._contentTestOnly) return;

  // ---- Button ----

  if (document.getElementById("cp-sidekick-button")) return;

  const MESSAGE_MS = 4000;
  const URL_POLL_MS = 1000;

  let settings = { ...NS.settings.DEFAULTS };
  let platform = null;
  let currentUrl = "";
  let liveContest = false;
  let busy = false;
  let messageTimer = null;

  const findPlatform = (url) => Object.values(NS.platforms).find((p) => p.matches(url)) || null;

  const button = document.createElement("button");
  button.id = "cp-sidekick-button";
  button.type = "button";
  button.dataset.theme = "on-light";

  const label = document.createElement("span");
  label.className = "cp-sidekick-label";
  button.appendChild(label);

  const aiName = () => NS.providers.buttonName(settings.provider);

  const render = () => {
    button.hidden = !platform;
    if (messageTimer) return;
    if (liveContest) {
      label.textContent = "AI off: contest is live";
      button.title = "CP Sidekick is disabled while this contest is running.";
      button.disabled = true;
      return;
    }
    button.disabled = false;
    label.textContent = NS.buttonLabel(settings.mode, aiName());
    button.title = "Change the AI or help mode from the CP Sidekick toolbar icon.";
  };

  const flash = (text) => {
    clearTimeout(messageTimer);
    label.textContent = text;
    messageTimer = setTimeout(() => {
      messageTimer = null;
      render();
    }, MESSAGE_MS);
  };

  let themeTimer = null;
  const updateTheme = () => {
    clearTimeout(themeTimer);
    themeTimer = setTimeout(() => {
      try {
        button.dataset.theme = detectPageTheme(document, window, button);
      } catch (_error) {
        // Keep the current theme.
      }
    }, 150);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (_err) {
        ok = false;
      }
      area.remove();
      return ok;
    }
  };

  const onClick = async () => {
    if (busy || liveContest || !platform) return;
    busy = true;
    try {
      await settingsReady;
      // Fast: extractors cache network results from the prefetch on page load.
      const problem = await platform.extract(document, location.href);
      if (!problem.ok) {
        flash(problem.reason);
        return;
      }

      const provider = NS.providers.get(settings.provider);
      const prompt = NS.buildPrompt({ problem, mode: settings.mode });
      // The clipboard always gets the full prompt, even when the URL gets a compact one.
      const copied = await copyToClipboard(prompt);
      const sentPrompt = NS.providers.usesUrlHandoff(provider.id)
        ? NS.buildPrompt({ problem, mode: settings.mode, compact: true, maxChars: provider.maxPromptChars })
        : prompt;

      // Debug / Refine end with "My code:": never auto-send, wait for the user's paste.
      const waitForCode = NS.needsCode(settings.mode);

      const result = await NS.sendMessage({
        type: NS.MSG.OPEN_CHAT,
        provider: provider.id,
        autoSend: settings.autoSend && !waitForCode,
        waitForCode,
        copied,
        prompt: sentPrompt
      });

      // After the extension is reloaded or updated, scripts in already-open pages lose
      // their connection to it (chrome.runtime.id becomes undefined).
      const disconnected = !globalThis.chrome?.runtime?.id;

      if (result?.ok) {
        flash(`Opened ${provider.label}`);
      } else if (disconnected) {
        flash(`CP Sidekick was updated. Refresh this page.${copied ? " (Prompt copied.)" : ""}`);
      } else if (copied) {
        flash("Couldn't open the chat. The prompt is copied, so paste it in manually.");
      } else {
        flash("Couldn't open the chat. Refresh the page and try again.");
      }
    } catch (error) {
      console.error("[CP Sidekick]", error);
      flash("Something went wrong. Refresh the page and try again.");
    } finally {
      busy = false;
    }
  };

  // Called on load and whenever the URL changes.
  const onUrlChange = () => {
    if (location.href === currentUrl) return;
    currentUrl = location.href;
    platform = findPlatform(currentUrl);
    liveContest = false;
    render();
    updateTheme();
    if (!platform) return;

    const checkedUrl = currentUrl;
    // Warm the extractor cache so the click itself is instant.
    Promise.resolve(platform.extract(document, checkedUrl)).catch(() => {});
    Promise.resolve(platform.liveContest?.(document, checkedUrl))
      .then((live) => {
        if (checkedUrl !== currentUrl) return;
        liveContest = Boolean(live);
        render();
      })
      .catch(() => {});
  };

  button.addEventListener("click", onClick);
  document.body.appendChild(button);

  const settingsReady = NS.settings.load().then((loaded) => {
    settings = loaded;
    render();
  });
  NS.settings.onChange((loaded) => {
    settings = loaded;
    render();
  });

  onUrlChange();
  window.addEventListener("popstate", onUrlChange);
  setInterval(onUrlChange, URL_POLL_MS);

  // Re-check the theme when the site switches theme (class/style/data attributes),
  // when stylesheets are added (e.g. Dark Reader), or when the OS theme changes.
  const observer = new MutationObserver(updateTheme);
  const watchAttributes = { attributes: true, attributeFilter: ["class", "style", "data-theme", "data-color-mode"] };
  observer.observe(document.documentElement, watchAttributes);
  observer.observe(document.body, watchAttributes);
  if (document.head) observer.observe(document.head, { childList: true });
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", updateTheme);
  window.addEventListener("load", updateTheme);
})();
