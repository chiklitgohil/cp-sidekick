# Contributing to CP Sidekick

Thanks for helping improve CP Sidekick. This project aims to be a small, transparent, learning-first browser extension for competitive programmers.

## Project Direction

CP Sidekick is a prompt bridge, not an in-extension AI solver. Contributions should preserve these principles:

- Keep the user in control of what is copied or opened.
- Prefer learning-first prompts over answer-first automation.
- Avoid collecting data, storing API keys, or adding a backend without a clear project decision.
- Keep permissions narrow and explain any new permission in the pull request.
- Respect Codeforces and contest rules.

## Good First Contributions

- Improve Codeforces problem extraction reliability.
- Add tests for prompt formatting and edge cases.
- Improve prompt wording for learning value.
- Improve accessibility and keyboard usability.
- Improve documentation and install instructions.

## Before Opening a Pull Request

Run:

```sh
npm run check
npm test
```

If a check cannot run, mention that in the pull request.

## Pull Request Guidelines

- Keep changes focused.
- Explain the user-facing behavior change.
- Include tests for prompt builder changes when practical.
- Include screenshots or short recordings for visible UI changes when practical.
- Do not introduce unrelated formatting churn.

## Adding Platform Support

New platform support should be added only when the extraction behavior is reliable and scoped. A platform contribution should include:

- URL patterns.
- A dedicated extractor or clearly separated extraction logic.
- Tests or documented manual test cases.
- Notes about platform-specific contest or AI-assistance rules if relevant.

## Community Standards

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
