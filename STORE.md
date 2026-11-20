# Store submission notes

Everything needed to submit CP Sidekick to the Chrome Web Store, Microsoft Edge Add-ons, and Firefox Add-ons (AMO). Copy the text from here into the forms. The zip names below use the current version from `manifest.json` (1.1.0).

## Before you submit (checklist)

1. **Push to GitHub** (`main`), so the privacy-policy URL below works.
2. **Confirm the Firefox add-on id** `cp-sidekick@chiklitgohil.github.io` in `scripts/build-firefox.js`. It's permanent after the first upload.
3. ~~Final logo~~: done. The designed duck is in `icons/`.
4. **Create developer accounts:** Chrome (one-time fee), Edge (free), Firefox (free).
5. **Screenshots:** take them with the current (teal duck) design; see the shot list below. Optionally make the 440×280 promo tile.
6. **Test:** run [TESTING.md](TESTING.md) in Chrome, Firefox and Edge.
7. **Package and submit:** run `npm run package`, then fill in each store's form from this file.

## Build the packages

```sh
npm install
npm run package
```

| Store | Upload |
|---|---|
| Chrome Web Store | `dist/cp-sidekick-chrome-<version>.zip` |
| Microsoft Edge Add-ons | `dist/cp-sidekick-chrome-<version>.zip` (same file) |
| Firefox Add-ons | `dist/cp-sidekick-firefox-<version>.zip` |

Before every release: bump `version` in both `manifest.json` and `package.json` (`npm run check` enforces that they match), update `CHANGELOG.md`, run `npm run package`, and run the [TESTING.md](TESTING.md) checklist.

## Accounts (one-time)

- **Chrome Web Store:** <https://chrome.google.com/webstore/devconsole>. There's a one-time registration fee. Verify your contact email.
- **Edge Add-ons:** <https://partner.microsoft.com/dashboard/microsoftedge>. Free.
- **Firefox Add-ons:** <https://addons.mozilla.org/developers/>. Free. The add-on id is fixed in `scripts/build-firefox.js` (`cp-sidekick@chiklitgohil.github.io`) and can't change after the first upload.

## Listing

**Name:** CP Sidekick

**Summary (132 characters max):**
> Your rubber duck for Codeforces, AtCoder and LeetCode: one click to a hint or code review in ChatGPT, Claude, Gemini or Google.

**Category:** Education (Chrome, Edge), Other / Education (Firefox)

**Language:** English

**Description:**

> CP Sidekick turns any Codeforces, AtCoder or LeetCode problem into a ready-to-go AI chat in one click, built for learning rather than copying answers.
>
> HOW IT WORKS
> 1. Open a problem.
> 2. Click the button in the corner, for example "Hint · Claude".
> 3. Your AI opens next to the problem with the full problem already filled in.
>
> PICK HOW YOU WANT TO BE HELPED
> • Understand: the statement and samples explained, no solution ideas
> • Hint: small nudges or guiding questions, one at a time, no spoilers
> • Intuition: the key observations, no code
> • Debug: paste your failing code to find the bug and a test that breaks it
> • Refine: paste your working code for a better approach, cleaner code, and why
> • Solution: for when you've already tried
>
> WORKS WITH YOUR AI
> ChatGPT, Claude, Gemini or Google AI Mode. Choose once in settings; no dialogs on every click. The button text always tells you what will happen, and it adapts to light and dark sites.
>
> CLEAN PROMPTS
> Statements, input/output formats, constraints, samples and notes are extracted cleanly, with math kept as LaTeX. Problem tags and ratings are never included, so nothing is spoiled.
>
> RESPECTS CONTESTS
> The button turns itself off while a Codeforces, AtCoder or LeetCode contest is running.
>
> PRIVATE BY DESIGN
> No account, no API keys, no servers, no tracking. The problem text only goes to the AI site you choose, in a tab you can see.
>
> CP Sidekick is not affiliated with Codeforces, AtCoder, LeetCode, OpenAI, Anthropic or Google.

**Homepage:** <https://github.com/chiklitgohil/cp-sidekick>
**Support:** <https://github.com/chiklitgohil/cp-sidekick/issues>
**Privacy policy URL:** <https://github.com/chiklitgohil/cp-sidekick/blob/main/PRIVACY.md> (the file must be pushed to `main` first)

## Graphics

| Asset | Size | Source |
|---|---|---|
| Store icon | 128×128 | `icons/icon-128.png` |
| Screenshots (Chrome: 1–5, Edge: up to 10, Firefox: any) | 1280×800 (or 640×400) | Take them yourself; see the shot list below |
| Small promo tile (Chrome) | 440×280 | Optional but recommended: icon + "CP Sidekick" + "One click to a learning-first AI chat" |

**Screenshot shot list** (Chrome at 1280×800, signed in to the AI site):
1. A Codeforces problem with the teal "Hint · ChatGPT" button in the corner.
2. The ChatGPT tab right after the click, with the prompt filled in.
3. The settings popup open, showing help modes with their explainers, AI choice and the button preview.
4. An AtCoder task with "Understand · Claude".
5. A LeetCode problem **in dark mode** with "Refine · Gemini", showing the button adapting to the dark site.

## Chrome Web Store: Privacy practices tab

**Single purpose:**
> Send the competitive programming problem on the current page to the user's chosen AI assistant (ChatGPT, Claude, Gemini or Google AI Mode) as a learning-focused prompt, in one click.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `storage` | Saves the user's settings (AI assistant, help mode, auto-send) and briefly holds the prompt until the AI tab opened by the user's click picks it up. |
| `clipboardWrite` | Copies the prompt to the clipboard as a backup, so the user can paste it if the AI site's page has changed. |
| Host: `codeforces.com`, `*.codeforces.com` | Reads the problem statement on Codeforces problem pages, and checks the public Codeforces API so the button is disabled during live contests. |
| Host: `atcoder.jp` | Reads the task statement on AtCoder task pages, including the contest's start and end times for the live-contest check. |
| Host: `leetcode.com` | Reads the problem from LeetCode (the same API the page uses), and contest times for the live-contest check. LeetCode is a single-page app, so the script runs on the site and only shows its button on problem pages. |
| Content scripts on `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com` | Fill the prompt into the chat box of the tab opened by the user's click (and press Send if the user enabled auto-send). In any other tab on these sites the script does nothing, and it never reads conversations. |

**Remote code:** No, I am not using remote code. All JavaScript is in the package.

**Data usage:** check **Website content** only.
- The extension reads the problem text on the current page and, at the user's click, puts it into the AI site the user selected.

**Certifications:** check all three.
- Not sold to third parties.
- Not used for purposes unrelated to the single purpose.
- Not used to determine creditworthiness.

## Edge Add-ons

Upload the same Chrome zip and reuse the listing text above. Microsoft asks for:
- **Privacy policy URL:** the same link as above.
- **Notes for certification:**
  > Click the extension's button on a problem page such as https://codeforces.com/problemset/problem/2000/D. A ChatGPT tab opens with the prompt (Claude, Gemini and Google AI Mode can be chosen in settings). Settings are in the toolbar popup. A sign-in to the AI site is needed to see the prompt filled in.

## Firefox Add-ons (AMO)

- **Upload:** `dist/cp-sidekick-firefox-1.0.0.zip`. Choose **On this site** (listed).
- **Source code:** not required. The code isn't minified or bundled, so the uploaded files are the source.
- **Data collection:** declared in the manifest as `required: ["websiteContent"]`. Firefox shows this to the user at install.
- **Reviewer notes:** the same text as the Edge certification notes.
- **License:** Apache-2.0. **Privacy policy:** paste the text of `PRIVACY.md`.

## Review risk notes

- Reviewers may ask about the content scripts on AI sites. The answer is in the justification table above: they act only in the tab the user opened, and only to fill in the prompt.
- AI site names are used descriptively ("works with ChatGPT"), not as branding. Keep it that way in screenshots and promo tiles. Don't use their logos.
