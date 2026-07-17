# CP Sidekick

One-click AI help for competitive programming.

CP Sidekick is a lightweight Chrome/Edge extension that turns competitive programming problems into guided AI conversations without copy-pasting. V1 supports Codeforces problem pages and builds learning-first prompts that you can copy or open in ChatGPT, Claude, or Gemini.

CP Sidekick is not an AI solver. It is a prompt companion for practice, upsolving, debugging, and learning.

## Features

- Adds an Ask AI button to supported Codeforces problem pages.
- Extracts the problem statement, metadata, input/output format, constraints, samples, and notes.
- Builds an editable prompt preview before anything leaves the page.
- Copies prompts to your clipboard and can open ChatGPT, Claude, or Gemini.
- Supports five prompt modes:
  - Hints only
  - Socratic mode
  - Explain intuition
  - Find bug in my solution
  - Optimal solution after attempt

## Why Prompt-First?

CP Sidekick does not ask for API keys, run a backend, or send problem data to an AI provider by itself. You choose what to copy and which AI chat app to open.

That keeps the first version simple, transparent, and privacy-conscious.

## Supported Pages

V1 targets Codeforces:

- `https://codeforces.com/problemset/problem/*/*`
- `https://codeforces.com/contest/*/problem/*`
- `https://codeforces.com/gym/*/problem/*`

## Installation From Source

1. Clone or download this repository.
2. Open Chrome or Edge and go to the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select the repository folder.
6. Open a supported Codeforces problem page and click Ask AI.

## Development

Install dependencies if the project adds any in the future, then run:

```sh
npm run check
npm test
```

Current checks validate JavaScript syntax and prompt-building behavior.

## Learning-First Use

Competitive programming is about building problem-solving skill. CP Sidekick is designed for practice and upsolving, not for bypassing thinking during live contests.

Please follow the rules of Codeforces and any contest you participate in. If a contest, group, team, school, or platform forbids AI assistance, do not use CP Sidekick there.

## Roadmap

- Public-ready V1 docs and community files.
- Better prompt UX and provider handoff.
- Attempt-aware prompts for solution review.
- Live contest warning or practice-mode safeguards.
- Additional platforms after Codeforces support is solid.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

CP Sidekick is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Branding

CP Sidekick is the name of this project. Forks and modified versions are welcome under the license, but they must not imply they are official CP Sidekick releases or endorsed by the maintainers unless they have explicit written permission.

CP Sidekick is not affiliated with Codeforces, OpenAI, Anthropic, Google, Chrome, Edge, or any AI provider.
