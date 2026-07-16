const statusNode = document.querySelector("#status");

const setStatus = (message) => {
  statusNode.textContent = message;
};

document.querySelector("#openPrompt").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab found.");
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/codeforcesExtractor.js", "src/promptBuilder.js", "src/content.js"]
    });
    setStatus("Look for the Ask AI button on the page.");
  } catch (error) {
    setStatus("This works on Codeforces problem pages.");
  }
});
