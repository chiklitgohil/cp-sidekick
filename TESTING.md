# Manual test checklist

Automated tests (`npm test`) cover extraction, prompts, settings, the background script and the AI-site fallback chain against saved copies of each site's markup. This checklist covers what only a real browser can: the live sites, sign-ins, and the stores' builds.

## Which browsers

| Browser | Why | Depth |
|---|---|---|
| **Chrome** | Main store; also covers Brave, Opera, Vivaldi and Arc, which install from the Chrome Web Store | Full pass |
| **Firefox** | Separate build and store (AMO) | Full pass |
| **Edge** | Separate store, but same package as Chrome | Smoke test |
| Safari | Not supported (needs Xcode conversion and a paid Apple developer account) | Not tested |

Testing Brave, Opera and others is optional. If Chrome passes, they work.

## Setup

- **Chrome / Edge:** `chrome://extensions` (or `edge://extensions`), turn on **Developer mode**, click **Load unpacked**, and select the repo folder. After code changes, click the extension's reload icon and **refresh the problem tabs**.
- **Firefox:** `npm run build:firefox`, then `about:debugging#/runtime/this-firefox`, **Load Temporary Add-on**, and select `dist/firefox/manifest.json`. If prompted, allow site access in the add-on's Permissions tab.
- Sign in to ChatGPT, Claude and Gemini in that browser.

Test problems:
- Codeforces: <https://codeforces.com/problemset/problem/2000/D>
- AtCoder: <https://atcoder.jp/contests/abc300/tasks/abc300_b>
- LeetCode: <https://leetcode.com/problems/median-of-two-sorted-arrays/description/>

## 1. First run (each browser)

- [ ] Installing opens a welcome tab with settings.
- [ ] The toolbar icon shows the teal duck, and its popup shows the settings.
- [ ] The welcome tab and popup show a one-line explainer under every help mode.
- [ ] Defaults: ChatGPT, Hint, auto-send **off**. The preview reads "Hint · ChatGPT".
- [ ] The popup looks right in both OS light and dark mode.
- [ ] Upgrading from 1.0 with Socratic or Review saved: settings show Hint or Debug instead.

## 2. Settings and button text (Chrome, Firefox)

With a problem tab open next to the popup:
- [ ] Each of the 6 modes changes both the preview and the page button **without refreshing**: "Understand · …", "Hint · …", "Intuition · …", "Debug · …", "Refine · …", "Solution · …".
- [ ] Changing the AI changes the name in the button. With Google AI Mode it reads "… · Google", and the auto-send toggle is greyed out with "Google AI Mode always runs right away".
- [ ] With Debug or Refine selected, the auto-send toggle is greyed out with "… never sends: it waits for you to paste your code".
- [ ] Settings survive a browser restart.

## 2a. Debug and Refine (Chrome, each fill-type AI)

- [ ] Debug, with auto-send **on**: the chat box fills and ends with `My code:`, the cursor sits right after it, a note says to paste your code, and **nothing is sent**. Paste code and press Enter: the AI answers with the bug, a breaking test and edge cases.
- [ ] Refine: same flow. The answer covers a better approach (if any), cleaner names and structure, and best practices, each with a "why".
- [ ] LeetCode: no "Starter code" in Debug or Refine prompts.

## 2b. Button visibility (Chrome)

- [ ] Codeforces (light): a teal text-only button with white text, a thin border and a soft shadow.
- [ ] The button text is short (for example "Hint · Claude") and never wraps on a laptop-size window.
- [ ] LeetCode: switch the site between light and dark (avatar menu, then Appearance). Within about a second the button flips to light teal with dark text and back, with no refresh.
- [ ] With the Dark Reader extension on Codeforces, the button switches to the dark-page style.
- [ ] The button never covers the problem text in a way that blocks reading (bottom-right corner, no animation).

## 3. Judge × AI matrix, auto-send off

For each cell: click the button, then check that a new tab opens **right next to** the problem and the chat box contains the prompt (title, statement, samples, LaTeX like `$2 \cdot 10^5$`). Nothing is sent.

For **Google AI Mode** the search runs right away: check that AI Mode answers with the problem, and that the query isn't cut off mid-sentence. Long problems end with "…(truncated…)".

| | ChatGPT | Claude | Gemini | Google AI Mode |
|---|---|---|---|---|
| **Chrome** Codeforces | [ ] | [ ] | [ ] | [ ] |
| **Chrome** AtCoder | [ ] | [ ] | [ ] | [ ] |
| **Chrome** LeetCode | [ ] | [ ] | [ ] | [ ] |
| **Firefox** Codeforces | [ ] | [ ] | [ ] | [ ] |
| **Firefox** AtCoder | [ ] | [ ] | [ ] | [ ] |
| **Firefox** LeetCode | [ ] | [ ] | [ ] | [ ] |
| **Edge** Codeforces | [ ] | [ ] | [ ] | [ ] |

Also check, in any one cell per judge:
- [ ] Codeforces: samples are one value per line, and there's no "Copy" text.
- [ ] AtCoder: English statement, a "Constraints" section, and sample explanations.
- [ ] LeetCode: "(LeetCode, Hard)" in the heading, plus "Starter code (…)" matching the language selected in the editor.

## 4. Auto-send on (Chrome, Firefox)

Turn on **Send automatically**. Each check sends one real message.
- [ ] ChatGPT: the prompt is sent once, not twice.
- [ ] Claude: sent once.
- [ ] Gemini: sent once.

## 5. Fallbacks (Chrome)

- [ ] **Signed out:** sign out of Claude, then click the button. A note offers **Copy prompt**. Sign in within 5 minutes and the prompt fills in by itself.
- [ ] **Clipboard always has the prompt** after a click: paste into any text field. This is the last-resort fallback.
- The "couldn't fill the chat box" and "press Enter to send" paths can't be forced from DevTools, because the extension runs in an isolated script world. They're covered by `tests/providerContent.test.js`. If you ever see either note in real use, the AI site has changed: update its selectors in `src/shared/providers.js`.

## 6. Pages and edge cases (Chrome)

- [ ] LeetCode: navigate between problems without reloading (Next/Previous). The button stays, and the prompt is for the **current** problem.
- [ ] LeetCode: the problem list (`/problemset/`) and other non-problem pages show **no** button.
- [ ] LeetCode Premium problem (signed out of Premium): the button shows "This is a LeetCode Premium problem…".
- [ ] Codeforces interactive problem (for example <https://codeforces.com/problemset/problem/1807/E>): the prompt says "This is an interactive problem."
- [ ] Codeforces PDF-only gym problem: the button shows "No problem statement found…".
- [ ] AtCoder old Japanese-only task (for example <https://atcoder.jp/contests/abc001/tasks/abc001_1>): the prompt includes the Japanese statement and the "only available in Japanese" note.
- [ ] **Live contest:** during a real contest on any judge, the button shows "AI off: contest is live" and is disabled. (Hard to schedule, so check it when a round happens. Automated tests cover the logic.)
- [ ] Reload the extension while a problem tab is open, then click without refreshing. The button says "CP Sidekick was updated. Refresh this page." After refreshing, it works.

## 7. Store packages

- [ ] `npm run package` passes, and both zips are created in `dist/`.
- [ ] Chrome: drag `dist/cp-sidekick-chrome-<version>.zip` unpacked into a fresh profile (unzip, then Load unpacked) and repeat section 1 plus one matrix cell.
- [ ] Firefox: load `dist/firefox/manifest.json`. At install it lists "website content" data collection.
