// Runs on the AI chat sites. It does nothing unless this exact tab was opened
// by a CP Sidekick click and has a prompt waiting for it in the background script.
//
// Fallback chain, from best to worst:
//   1. Fill the chat box and (if auto-send is on) send it.
//      Debug / Refine never send: the cursor waits after "My code:" for the user's paste.
//   2. Auto-send failed  -> the prompt stays in the box; "press Enter to send".
//   3. Filling failed    -> "paste it" (it was copied on click) + a Copy prompt button.
//   4. No chat box found -> same message and Copy prompt button (e.g. sign-in page);
//                           the prompt stays pending, so it fills in after you sign in.
(function () {
  const NS = globalThis.CPSidekick;
  if (!NS?.providers || !NS.MSG || !NS.sendMessage) return;
  if (window.top !== window) return;

  const provider = NS.providers.byOrigin(location.origin);
  if (!provider) return;

  const timing = {
    composerTimeout: 20000,
    poll: 250,
    settle: 700,
    sendButtonTimeout: 6000,
    sendConfirm: 4000,
    enterConfirm: 3000,
    toastLife: 30000,
    ...(NS._providerTiming || {})
  };

  const GENERIC_COMPOSERS = [
    "textarea[aria-label]",
    "[contenteditable='true'][role='textbox']",
    "[contenteditable='true'][aria-label]",
    "textarea",
    "[contenteditable='true']"
  ];
  const GENERIC_SEND = ["button[aria-label='Send message']", "button[aria-label*='send' i]", "button[type='submit']"];

  const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
  const PASTE_KEYS = isMac ? "⌘V" : "Ctrl+V";

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isVisible = (el) => {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  };

  const isUsableComposer = (el) =>
    isVisible(el) && !el.closest(".ql-clipboard") && !el.disabled && !el.readOnly;

  const findFirst = (selectors, accept) => {
    for (const selector of selectors) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch (_error) {
        continue;
      }
      for (const node of nodes) if (accept(node)) return node;
    }
    return null;
  };

  const findComposer = () =>
    findFirst(provider.composer, isUsableComposer) || findFirst(GENERIC_COMPOSERS, isUsableComposer);

  const isEnabled = (button) =>
    isVisible(button) && !button.disabled && button.getAttribute("aria-disabled") !== "true";

  const findSendButton = () => findFirst(provider.send, isEnabled) || findFirst(GENERIC_SEND, isEnabled);

  const isTextField = (el) => el.tagName === "TEXTAREA" || el.tagName === "INPUT";
  const readText = (el) => (isTextField(el) ? el.value : el.innerText || el.textContent || "");

  // Compare letters and digits only: rich editors reshape whitespace and line breaks.
  const signature = (text) => (text || "").replace(/[^\p{L}\p{N}]+/gu, "");

  const containsPrompt = (el, prompt) => {
    const have = signature(readText(el));
    const want = signature(prompt);
    if (!want) return false;
    return have.includes(want.slice(0, 60)) && have.includes(want.slice(-60));
  };

  const selectAll = (el) => {
    el.focus();
    if (isTextField(el)) {
      el.select();
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const placeCaretAtEnd = (el) => {
    el.focus();
    if (isTextField(el)) {
      const end = el.value.length;
      el.setSelectionRange(end, end);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const setNativeValue = (el, value) => {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // execCommand("insertText") goes through the editor's normal input handling
  // (React, ProseMirror, Quill), so the site sees it like typed text.
  const insertPrompt = (el, prompt) => {
    selectAll(el);
    try {
      document.execCommand("insertText", false, prompt);
    } catch (_error) {
      // Fall through to the textarea fallback.
    }
    if (containsPrompt(el, prompt)) return true;

    if (isTextField(el)) {
      setNativeValue(el, prompt);
      return containsPrompt(el, prompt);
    }
    return false;
  };

  // Wait for a chat box that stays the same element for a moment,
  // so a re-render right after page load doesn't wipe the inserted text.
  const waitForStableComposer = async () => {
    const deadline = Date.now() + timing.composerTimeout;
    while (Date.now() < deadline) {
      const first = findComposer();
      if (first) {
        await sleep(timing.settle);
        const again = findComposer();
        if (again && again === first) return again;
      } else {
        await sleep(timing.poll);
      }
    }
    return null;
  };

  const pressEnter = (el) => {
    el.focus();
    const init = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    el.dispatchEvent(new KeyboardEvent("keydown", init));
    el.dispatchEvent(new KeyboardEvent("keyup", init));
  };

  const wasSent = (el, prompt) => !el.isConnected || !containsPrompt(el, prompt);

  const waitUntilSent = async (el, prompt, ms) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (wasSent(el, prompt)) return true;
      await sleep(timing.poll);
    }
    return wasSent(el, prompt);
  };

  const submit = async (el, prompt) => {
    const deadline = Date.now() + timing.sendButtonTimeout;
    let button = null;
    while (!button && Date.now() < deadline) {
      button = findSendButton();
      if (!button) await sleep(timing.poll);
    }

    if (button) {
      button.click();
      // Generous wait so a slow send is never followed by a second (Enter) send.
      if (await waitUntilSent(el, prompt, timing.sendConfirm)) return true;
    }

    pressEnter(el);
    return waitUntilSent(el, prompt, timing.enterConfirm);
  };

  // ---- On-page message ----

  let toastNode = null;
  const toast = (text, { copyText = null } = {}) => {
    toastNode?.remove();
    const box = document.createElement("div");
    box.id = "cp-sidekick-toast";
    box.setAttribute("role", "status");
    box.style.cssText = [
      "position:fixed", "right:16px", "bottom:16px", "z-index:2147483647", "max-width:380px",
      "padding:12px 36px 12px 14px", "border:1px solid #9ca3af", "border-radius:8px",
      "background:#ffffff", "color:#111827", "font:14px/1.4 system-ui,Arial,sans-serif",
      "box-shadow:0 4px 16px rgba(0,0,0,.2)"
    ].join(";");

    const message = document.createElement("div");
    message.textContent = `CP Sidekick: ${text}`;
    box.appendChild(message);

    if (copyText) {
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "cp-sidekick-copy";
      copy.textContent = "Copy prompt";
      copy.style.cssText =
        "margin-top:8px;padding:6px 10px;border:1px solid #1f2937;border-radius:6px;background:#111827;color:#fff;font:600 13px system-ui,Arial,sans-serif;cursor:pointer";
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(copyText);
          copy.textContent = `Copied. Paste with ${PASTE_KEYS}`;
        } catch (_error) {
          copy.textContent = "Copy failed. Go back to the problem tab and click again.";
        }
      });
      box.appendChild(copy);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Dismiss");
    close.style.cssText =
      "position:absolute;top:6px;right:8px;border:0;background:none;font-size:18px;cursor:pointer;color:#374151";
    close.addEventListener("click", () => box.remove());
    box.appendChild(close);

    document.body.appendChild(box);
    toastNode = box;
    setTimeout(() => box.remove(), timing.toastLife);
    return box;
  };

  const pasteHint = (copied) =>
    copied ? `The prompt is in your clipboard. Paste it with ${PASTE_KEYS}, or copy it again:` : "Copy the prompt and paste it into the chat:";

  // ---- Main flow ----

  const run = async () => {
    const peek = await NS.sendMessage({ type: NS.MSG.PEEK_PROMPT });
    if (!peek?.pending) return "idle";

    const composer = await waitForStableComposer();
    if (!composer) {
      toast(`couldn't find the chat box. Sign in if needed (the prompt fills in after). ${pasteHint(peek.copied)}`, {
        copyText: peek.prompt
      });
      return "no-composer";
    }

    const claim = await NS.sendMessage({ type: NS.MSG.CLAIM_PROMPT });
    if (!claim?.prompt) return "idle";

    if (!insertPrompt(composer, claim.prompt)) {
      toast(`couldn't fill the chat box. ${pasteHint(claim.copied)}`, { copyText: claim.prompt });
      return "fill-failed";
    }

    if (claim.waitForCode) {
      // Debug / Refine: the prompt ends with "My code:". Leave the cursor there.
      placeCaretAtEnd(composer);
      toast(`paste your code under "My code:" (${PASTE_KEYS}), then press Enter to send.`);
      return "awaiting-code";
    }

    if (!claim.autoSend) {
      composer.focus();
      return "filled";
    }

    if (await submit(composer, claim.prompt)) return "sent";
    toast("the prompt is filled in, but it couldn't be sent automatically. Press Enter to send it.");
    return "send-failed";
  };

  if (NS._providerTest) {
    NS._providerTest.run = run;
  } else {
    run().catch((error) => console.error("[CP Sidekick]", error));
  }
})();
