// Tests the AI-site script's fallback chain in jsdom:
// fill -> (auto-send) -> "press Enter" -> "paste / Copy prompt".
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const PROMPT =
  "I'm practicing competitive programming. Give me hints only.\n\nProblem: A. Test (Codeforces)\nStatement:\nFind $n$.";

const CLAUDE_PAGE = `
  <div data-testid="chat-input" contenteditable="true" class="ProseMirror"></div>
  <button aria-label="Send message">Send</button>`;

const loadFresh = (file) => {
  const full = path.join(__dirname, "..", "src", file);
  delete require.cache[require.resolve(full)];
  require(full);
};

/**
 * Builds a fake AI page and runs providerContent.js against it.
 * options.insertWorks: whether execCommand("insertText") fills the editor
 * options.onSend: what clicking Send does ("clear" = message sent, "nothing" = broken)
 */
const setup = ({ html = CLAUDE_PAGE, url = "https://claude.ai/new", pending = true, autoSend = false,
  copied = true, waitForCode = false, insertWorks = true, onSend = "clear", onEnter = "nothing" } = {}) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url, pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;

  // jsdom has no layout: make everything "visible".
  window.Element.prototype.getBoundingClientRect = () => ({ width: 200, height: 40, top: 0, left: 0, right: 200, bottom: 40 });

  const stats = { sendClicks: 0, enters: 0, clipboard: null };

  document.execCommand = (command, _ui, value) => {
    if (command !== "insertText" || !insertWorks) return false;
    const el = document.activeElement;
    if (el.tagName === "TEXTAREA") el.value = value;
    else el.textContent = value;
    return true;
  };

  const composer = () => document.querySelector("[contenteditable='true'], textarea");
  const clear = () => {
    const el = composer();
    if (el.tagName === "TEXTAREA") el.value = "";
    else el.textContent = "";
  };

  document.querySelectorAll("button[aria-label='Send message']").forEach((button) =>
    button.addEventListener("click", () => {
      stats.sendClicks++;
      if (onSend === "clear") clear();
    })
  );
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    stats.enters++;
    if (onEnter === "clear") clear();
  });

  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText: async (text) => (stats.clipboard = text) },
    configurable: true
  });

  const messages = [];
  const record = { prompt: PROMPT, autoSend, waitForCode, copied };
  let claimed = false;
  const chrome = {
    runtime: {
      lastError: undefined,
      sendMessage(message, callback) {
        messages.push(message.type);
        if (message.type === "CP_SIDEKICK_PEEK_PROMPT") {
          callback(pending && !claimed ? { pending: true, prompt: PROMPT, copied } : { pending: false });
        } else if (message.type === "CP_SIDEKICK_CLAIM_PROMPT") {
          claimed = true;
          callback(pending ? { ...record } : { prompt: null });
        } else {
          callback(null);
        }
      }
    }
  };

  // Expose the jsdom window as the script's globals.
  const globals = {
    window, document, navigator: window.navigator, location: window.location, chrome,
    getComputedStyle: window.getComputedStyle.bind(window),
    HTMLTextAreaElement: window.HTMLTextAreaElement, HTMLInputElement: window.HTMLInputElement,
    Event: window.Event, KeyboardEvent: window.KeyboardEvent
  };
  // defineProperty: Node has a built-in read-only `navigator` global.
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }

  globalThis.CPSidekick = {
    _providerTest: {},
    _providerTiming: {
      composerTimeout: 300, poll: 5, settle: 10, sendButtonTimeout: 50,
      sendConfirm: 40, enterConfirm: 40, toastLife: 60000
    }
  };
  loadFresh("shared/providers.js");
  loadFresh("providerContent.js");

  return { run: globalThis.CPSidekick._providerTest.run, document, stats, messages, composer };
};

const toastText = (document) => document.getElementById("cp-sidekick-toast")?.textContent || "";

test("does nothing on a normal visit (no pending prompt)", async () => {
  const { run, document, messages } = setup({ pending: false });
  assert.equal(await run(), "idle");
  assert.deepEqual(messages, ["CP_SIDEKICK_PEEK_PROMPT"]);
  assert.equal(document.getElementById("cp-sidekick-toast"), null);
});

test("auto-send off (default): fills the box and does not send", async () => {
  const { run, stats, composer } = setup({ autoSend: false });
  assert.equal(await run(), "filled");
  assert.equal(composer().textContent, PROMPT);
  assert.equal(stats.sendClicks, 0);
  assert.equal(stats.enters, 0);
});

test("auto-send on: clicks Send once and confirms the box emptied", async () => {
  const { run, stats } = setup({ autoSend: true });
  assert.equal(await run(), "sent");
  assert.equal(stats.sendClicks, 1);
  assert.equal(stats.enters, 0, "no Enter after a successful click (no double send)");
});

test("Send button broken: falls back to Enter", async () => {
  const { run, stats } = setup({ autoSend: true, onSend: "nothing", onEnter: "clear" });
  assert.equal(await run(), "sent");
  assert.equal(stats.sendClicks, 1);
  assert.equal(stats.enters, 1);
});

test("sending fails entirely: prompt stays in the box and the user is told to press Enter", async () => {
  const { run, document, composer } = setup({ autoSend: true, onSend: "nothing", onEnter: "nothing" });
  assert.equal(await run(), "send-failed");
  assert.equal(composer().textContent, PROMPT);
  assert.match(toastText(document), /filled in.*Press Enter/);
});

test("filling fails: paste hint plus a working Copy prompt button", async () => {
  const { run, document, stats } = setup({ insertWorks: false });
  assert.equal(await run(), "fill-failed");
  assert.match(toastText(document), /in your clipboard/);
  document.querySelector(".cp-sidekick-copy").click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(stats.clipboard, PROMPT);
});

test("filling fails and the first copy also failed: no false clipboard claim", async () => {
  const { run, document } = setup({ insertWorks: false, copied: false });
  assert.equal(await run(), "fill-failed");
  assert.doesNotMatch(toastText(document), /in your clipboard/);
  assert.ok(document.querySelector(".cp-sidekick-copy"));
});

test("textarea composers (ChatGPT) use the native value fallback when insertText fails", async () => {
  const { run, composer } = setup({
    url: "https://chatgpt.com/",
    html: '<form><textarea aria-label="Chat with ChatGPT"></textarea><button aria-label="Send message">Send</button></form>',
    insertWorks: false
  });
  assert.equal(await run(), "filled");
  assert.equal(composer().value, PROMPT);
});

test("no chat box (e.g. sign-in page): prompt stays pending, Copy prompt offered", async () => {
  const { run, document, messages } = setup({ html: "<p>Please sign in</p>" });
  assert.equal(await run(), "no-composer");
  assert.ok(!messages.includes("CP_SIDEKICK_CLAIM_PROMPT"), "prompt is not consumed");
  assert.match(toastText(document), /Sign in/);
  assert.ok(document.querySelector(".cp-sidekick-copy"));
});

test("Gemini: the hidden Quill clipboard editor is never used as the chat box", async () => {
  const { run, document } = setup({
    url: "https://gemini.google.com/app",
    html: `<rich-textarea><div class="ql-editor" contenteditable="true"></div><div class="ql-clipboard" contenteditable="true"></div></rich-textarea>`
  });
  assert.equal(await run(), "filled");
  assert.equal(document.querySelector(".ql-editor").textContent, PROMPT);
  assert.equal(document.querySelector(".ql-clipboard").textContent, "");
});

test("Debug / Refine: fills, never sends, and asks for the code to be pasted", async () => {
  const { run, document, stats, composer } = setup({ autoSend: true, waitForCode: true });
  assert.equal(await run(), "awaiting-code");
  assert.equal(composer().textContent, PROMPT);
  assert.equal(stats.sendClicks, 0);
  assert.equal(stats.enters, 0);
  assert.match(toastText(document), /paste your code under "My code:"/);
  assert.equal(document.activeElement, composer(), "cursor is in the chat box");
});
