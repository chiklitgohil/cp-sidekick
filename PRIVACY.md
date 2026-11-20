# CP Sidekick Privacy Policy

_Last updated: November 20, 2026 (v1.1.0)_

CP Sidekick is a browser extension that turns a competitive programming problem into a prompt for an AI chat you choose. This policy explains what data the extension handles.

## Summary

- CP Sidekick has **no server**. The developer receives **no data** of any kind.
- There are **no accounts, analytics, tracking, ads, or API keys**.
- When **you click** the CP Sidekick button, the text of the problem on that page is sent to the AI site **you selected** (ChatGPT, Claude, Gemini or Google AI Mode), in a browser tab you can see.

## What the extension reads

| Data | Where | Why |
|---|---|---|
| Problem statement, samples, limits, title and URL | The problem page you're on (codeforces.com, atcoder.jp, leetcode.com) | To build the prompt when you click the button |
| Contest schedule | The Codeforces public API, the AtCoder task page, the LeetCode contest info API | To disable the button while a contest for that problem is running |
| The name of the language selected in LeetCode's code editor | The LeetCode problem page | To include matching starter code |

The extension does **not** read your code, submissions, account details, browsing history, or anything on other websites.

## Where data goes

- **To the AI site you chose.** On your click, the prompt is placed in that site's chat box (and sent, if you turned on auto-send). For **Google AI Mode**, the prompt is instead sent as the search query in the Google Search URL, and the search runs immediately. That site's own privacy policy then applies:
  - [OpenAI](https://openai.com/policies/privacy-policy) (ChatGPT)
  - [Anthropic](https://www.anthropic.com/legal/privacy) (Claude)
  - [Google](https://policies.google.com/privacy) (Gemini, Google AI Mode)
- **To your clipboard**, as a backup copy of the prompt.
- **Nowhere else.** Nothing is sent to the developer or any other third party.

On ChatGPT, Claude and Gemini pages, the extension only acts in a tab that was opened by your click, to fill in the prompt. It never reads your conversations.

## What is stored

| Data | Storage | Lifetime |
|---|---|---|
| Your settings (AI assistant, help mode, auto-send) | `chrome.storage.sync`, synced by your browser if you have browser sync on | Until you uninstall or change them |
| The prompt waiting to be filled into the newly opened AI tab | `chrome.storage.session` (memory) | Removed once it's filled in, when the tab closes, after 5 minutes, or when the browser closes |
| The list of live Codeforces contests | `chrome.storage.session` (memory) | 10 minutes |

## Permissions

- `storage`: your settings and the prompt waiting for its tab.
- `clipboardWrite`: the backup copy of the prompt.
- Access to codeforces.com, atcoder.jp and leetcode.com: reading the problem and contest status.
- Content scripts on chatgpt.com, chat.openai.com, claude.ai and gemini.google.com: filling in the prompt in the tab you opened.

## Children

CP Sidekick is not directed at children under 13 and does not knowingly collect any personal information.

## Changes

Changes to this policy are published in this file in the project's repository, with an updated date.

## Contact

Open an issue at <https://github.com/chiklitgohil/cp-sidekick/issues>.
