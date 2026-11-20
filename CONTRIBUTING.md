# Contributing to CP Sidekick

Thanks for helping improve CP Sidekick. This project aims to be a small, transparent, learning-first browser extension for competitive programmers.

## Project Direction

CP Sidekick is a prompt bridge, not an in-extension AI solver. Contributions should preserve these principles:

- Keep the user in control: nothing happens without a click, and auto-send stays opt-in.
- Prefer learning-first prompts over answer-first automation.
- Avoid collecting data, storing API keys, or adding a backend without a clear project decision.
- Keep permissions narrow and explain any new permission in the pull request.
- Respect Codeforces and contest rules.

## Good First Contributions

- Improve extraction reliability on Codeforces, AtCoder or LeetCode (add a fixture under `tests/fixtures/`).
- Update AI-site selectors in `src/shared/providers.js` when ChatGPT, Claude or Gemini change their pages.
- Add tests for prompt formatting and edge cases.
- Improve prompt wording for learning value.
- Improve accessibility and keyboard usability.
- Improve documentation and install instructions.

## Before Opening a Pull Request

Run:

```sh
npm install
npm run check
npm test
```

For changes that touch a live site (extraction, AI-site filling), also run the relevant part of [TESTING.md](TESTING.md).

If a check cannot run, mention that in the pull request.

## Pull Request Guidelines

- Keep changes focused.
- Explain the user-facing behavior change.
- Include tests for prompt builder changes when practical.
- Include screenshots or short recordings for visible UI changes when practical.
- Do not introduce unrelated formatting churn.

## Adding Platform Support

New platform support should be added only when the extraction behavior is reliable and scoped. A platform contribution should include:

- A file in `src/platforms/` implementing `{ id, name, matches(url), extract(doc, url), liveContest(doc, url) }` (see the top of `codeforces.js`), using `domText.toText` for text.
- URL patterns and host permissions in `manifest.json`. `npm run check` fails if the file isn't wired up.
- A fixture test under `tests/` built from the site's real markup.
- A live-contest check if the platform runs contests, plus notes about its AI-assistance rules.

## Community Standards

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
