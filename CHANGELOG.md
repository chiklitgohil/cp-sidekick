# Changelog

## 1.1.0 (2026-11-20)

First version submitted to the Chrome Web Store, Edge Add-ons and Firefox Add-ons.

### Added

- **Understand** mode: the statement and samples explained, with no solution ideas.
- **Refine** mode: paste working code and get a better algorithm if one exists, cleaner structure and names, and CP best practices, with the reasoning for each change.
- **Google AI Mode** as a fourth AI assistant. The prompt goes in the search URL, so no new permissions are needed. Long statements are shortened for the URL, and the clipboard keeps the full prompt.
- **Mode explainers:** every help mode has a one-line description in settings and on the welcome page.
- **Designed logo:** a rubber duck with a sparkle eye, on teal.

### Changed

- **New look: Teal Coach + rubber duck.** Teal brand colors and a refreshed settings page. See [BRAND.md](BRAND.md).
- **The page button is always visible.** It has a border and a subtle shadow, and it detects the site's light or dark theme (including LeetCode dark mode and Dark Reader) and switches style live. It's text-only and passes WCAG AA contrast in every state.
- **Shorter button text:** "Hint · Claude", "Debug · ChatGPT", and so on.
- **Help modes reworked:** Understand, Hint, Intuition, Debug, Refine, Solution. Hint now includes Socratic-style guiding questions, and Review is renamed **Debug**. Saved Socratic and Review settings move over automatically.
- **Debug and Refine wait for your code:** the prompt ends with "My code:" and the cursor waits there. They are never auto-sent, even with auto-send on.

### Removed

- The separate **Socratic** mode (merged into Hint).

### Developer

- `npm run icons` no longer overwrites the designed logo unless run with `--force`.
- `npm run check` also enforces the 132-character limit on the store description.
- New tests: page-theme detection, button contrast, the compact Google prompt, mode migration, and the Debug/Refine paste flow (67 tests in total).

## 1.0.0 (2026-11-20)

Not published; superseded by 1.1.0.

- **One click:** the problem goes straight into ChatGPT, Claude or Gemini in the next tab, with no dialog.
- **Judges:** Codeforces, AtCoder and LeetCode (including LeetCode's in-app navigation).
- **Settings page:** AI assistant, help mode (Hints only, Socratic, Explain the intuition, Review my code, Full solution), and auto-send (off by default).
- **Button text** follows your settings, for example "Get a hint from Claude" or "Review my code with ChatGPT".
- **Fallback chain on the AI site:** fill and send, then "press Enter", then paste from the clipboard, plus a **Copy prompt** button.
- **Clean extraction:** LaTeX from MathJax (Codeforces) and KaTeX (AtCoder), line-by-line samples, image links, interactive-problem note, LeetCode starter code for your editor's language. Tags and ratings are never included.
- **Live-contest guard** on all three judges.
- Welcome page on install, "Report a problem" link, icons, Firefox build, store packaging.
- Fewer permissions: `storage` and `clipboardWrite` only, plus the judge sites.

## 0.1.0

- Codeforces-only prompt builder with a dialog and copy-to-clipboard.
