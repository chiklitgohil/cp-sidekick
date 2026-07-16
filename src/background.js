const LLM_URLS = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
  gemini: "https://gemini.google.com/app"
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "CP_SIDEKICK_OPEN_LLM") return false;

  const url = LLM_URLS[message.provider] || LLM_URLS.chatgpt;
  chrome.tabs.create({ url }, (tab) => {
    sendResponse({ ok: true, tabId: tab?.id });
  });

  return true;
});
