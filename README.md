# CP Sidekick

**Your rubber duck for competitive programming. Now it talks back.**

CP Sidekick is a small Chrome, Edge and Firefox extension. It adds one button to problem pages on **Codeforces**, **AtCoder** and **LeetCode**. One click reads the problem, builds a prompt for how you want to be helped, and opens **ChatGPT**, **Claude**, **Gemini** or **Google AI Mode** next to the problem with everything filled in.

It is not an AI solver. It's a fast, honest way to get hints, explanations and code reviews while practicing and upsolving. Like rubber-duck debugging, the point is that *you* find the answer.

## How it works

1. Open a problem.
2. Click the button in the bottom-right corner. Its short text shows the mode and the AI, for example **Hint · Claude** or **Debug · ChatGPT**. It adapts to the site's light or dark theme, so it's always readable.
3. Your AI opens in the next tab with the prompt filled in. Press Enter, or turn on auto-send.

There is no dialog. Everything is in **Settings**: click the CP Sidekick icon in the toolbar.

| Setting | Options |
|---|---|
| How should it help? | See the modes below |
| AI assistant | ChatGPT, Claude, Gemini, Google AI Mode |
| Send automatically | Off by default: the prompt is filled in and you press Enter. On: it's sent for you. (Debug and Refine never send; Google AI Mode always runs right away.) |

### Help modes

Ordered from "give away nothing" to "give away everything":

| Mode | Button | What the AI does |
|---|---|---|
| **Understand** | `Understand · AI` | Restates the problem simply and walks through the samples. No solution ideas. |
| **Hint** (default) | `Hint · AI` | Small nudges or guiding questions, one at a time, and waits for your reply. |
| **Intuition** | `Intuition · AI` | The key observations and how to discover the approach, without code. |
| **Debug** | `Debug · AI` | For code that fails (WA, TLE, RE): points to the bug, gives a test that breaks it, and lists edge cases. |
| **Refine** | `Refine · AI` | For code that already works: a better algorithm if one exists, cleaner structure and names, CP best practices, and *why* each change is better. |
| **Solution** | `Solution · AI` | The full approach, proof sketch, complexity and reference code, for after you've tried. |

**Debug** and **Refine** need your code. The prompt is filled in and ends with `My code:`, and the cursor waits there: paste your code and press Enter. They are never auto-sent.

**Google AI Mode** gets the prompt through the search URL, so it needs no extra permission. Long statements are shortened for the URL (first two samples, trimmed statement), but the full prompt is always in your clipboard.

### If something on the AI site changes

AI chat sites change their pages often, so CP Sidekick falls back step by step:

1. **Auto-send fails:** the prompt stays in the chat box, and a note asks you to press Enter.
2. **Filling the chat box fails:** the prompt was already copied when you clicked, so just paste it. A **Copy prompt** button is also shown.
3. **No chat box found** (for example, you're signed out): sign in, and the prompt fills in on its own for the next few minutes. **Copy prompt** is offered too.

## What it extracts

| | Codeforces | AtCoder | LeetCode |
|---|---|---|---|
| Statement, input, output, notes | ✓ | ✓ (English, or Japanese when no English exists) | ✓ (statement with inline examples and constraints) |
| Samples | ✓ line by line | ✓ with explanations | inline in the statement |
| Math | LaTeX source from MathJax | LaTeX source from KaTeX | HTML (`10^6`) |
| Limits / difficulty | time, memory, file I/O | time, memory | difficulty |
| Extras | interactive-problem note, image links | constraints section | starter code in your editor's language |

Problem tags and ratings are never included, so they can't spoil the problem.

## Live contests

While a contest is running, the button is disabled on that contest's problems ("AI off: contest is live"):

- **Codeforces:** rounds in the coding phase, from the public `contest.list` API, cached for 10 minutes.
- **AtCoder:** the contest's start and end times on the task page. Permanent practice contests are ignored.
- **LeetCode:** weekly and biweekly contest problem pages, from LeetCode's contest info.

If a check can't be completed (network error), the button stays enabled. Gym and virtual participation are not detected. Please follow the rules of every contest, platform and school you take part in.

## Privacy

- No backend, no account, no API keys, no analytics.
- Problem text goes only to the AI site you choose, in a tab you can see.
- On ChatGPT, Claude and Gemini pages the extension does nothing unless that exact tab was opened by your click. It never reads your conversations.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Supported pages

- Codeforces: `codeforces.com/problemset/problem/*`, `/contest/*/problem/*`, `/gym/*/problem/*` (not PDF-only statements), and mirror subdomains
- AtCoder: `atcoder.jp/contests/*/tasks/*`
- LeetCode: `leetcode.com/problems/*` and `leetcode.com/contest/*/problems/*` (not Premium problems you can't open, and not leetcode.cn)

## Install from source

### Chrome or Edge

1. Clone this repository.
2. Go to `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.
4. Refresh any problem tabs that were already open.

### Firefox (temporary)

1. Run `npm run build:firefox`. This writes `dist/firefox`.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select `dist/firefox/manifest.json`.

## Development

```sh
npm install            # dev dependency: jsdom (tests only; the extension has no dependencies)
npm run check          # syntax, manifest references, icons, judge and AI wiring
npm test               # extractors, prompt, fallback chain, background
npm run icons          # regenerate icons/ (pure Node)
npm run build:firefox  # dist/firefox
npm run package        # check + test + store zips in dist/
```

Store submission notes are in [STORE.md](STORE.md). The manual test checklist is in [TESTING.md](TESTING.md). Colors, logo and voice are in [BRAND.md](BRAND.md).

### Project layout

| File | Role |
|---|---|
| `src/platforms/domText.js` | DOM to plain text: keeps TeX (MathJax and KaTeX), sample lines, image links |
| `src/platforms/codeforces.js`, `atcoder.js`, `leetcode.js` | One file per judge: URL matching, extraction, live-contest check |
| `src/promptBuilder.js` | Help modes, button text, the prompt template (plain text, no markdown) |
| `src/content.js` | The button on problem pages (follows navigation inside single-page apps) |
| `src/background.js` | Opens the chat tab, holds the prompt for that tab, Codeforces contest check, welcome page |
| `src/providerContent.js` | On the AI site: wait for the chat box, fill it, send it, fall back |
| `src/shared/providers.js` | AI assistants: URL, and chat-box and send-button selectors, or URL hand-off (Google) |
| `src/shared/settings.js` | Settings defaults and storage |
| `popup/` | Settings page (toolbar popup, options page, welcome tab) |
| `manifest.json` | Chrome/Edge manifest; `scripts/build-firefox.js` derives the Firefox one |

### Adding a judge

Create `src/platforms/<judge>.js` that registers `CPSidekick.platforms.<id> = { id, name, matches(url), extract(doc, url), liveContest(doc, url) }` (see the comment at the top of `codeforces.js`). Add it, and its URL patterns, to the first `content_scripts` entry in `manifest.json`, add host permissions, and add a fixture test. `npm run check` fails if a platform file isn't wired up.

### Adding an AI site

Add an entry to `src/shared/providers.js`. There are two kinds:

- **`handoff: "fill"`** (ChatGPT, Claude, Gemini): give the URL, origins, and chat-box and send-button selectors, and add the origins to the second `content_scripts` entry. `npm run check` fails if an origin isn't wired up.
- **`handoff: "url"`** (Google AI Mode): give `buildUrl(prompt)` and `maxPromptChars`. No content script or permission is needed.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

CP Sidekick is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Branding

CP Sidekick is the name of this project. Forks and modified versions are welcome under the license, but they must not imply they are official CP Sidekick releases or endorsed by the maintainers unless they have explicit written permission.

CP Sidekick is not affiliated with Codeforces, AtCoder, LeetCode, OpenAI, Anthropic, Google, Chrome, Edge, Mozilla, or any AI provider.
