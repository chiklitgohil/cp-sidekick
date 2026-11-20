# CP Sidekick brand

## Idea

**A rubber duck that talks back.**

Rubber-duck debugging is the oldest trick in programming: explain your problem to a duck and you find the answer yourself. CP Sidekick is that duck for competitive programming. It nudges, asks questions and explains, and only gives the full answer when you ask. The brand should feel like a calm, focused coach, never like a cheat tool.

## Palette: Teal Coach

| Token | Hex | Use |
|---|---|---|
| Teal 700 (primary) | `#0F766E` | Page button on light sites, links, selected states, icon background |
| Teal 800 | `#115E59` | Hover, borders on light sites |
| Teal 400 | `#2DD4BF` | Page button on dark sites (with ink text), primary color in dark UI |
| Ink | `#0B1220` | Text, text on Teal 400 |
| Amber (spark) | `#F59E0B` | The duck's beak, focus rings, one small accent per screen. Never large areas. |
| Surface light / dark | `#F8FAFC` / `#0F172A` | Settings page background |

**Why teal:** it reads as growth and calm focus. More practically, none of the sites CP Sidekick sits on use it:
- Codeforces is blue.
- LeetCode is orange.
- AtCoder is gray.
- ChatGPT is black and green.
- Claude is terracotta.
- Gemini is blue-violet.

So the button is recognizable everywhere without shouting.

**Contrast:** all button states meet WCAG AA (4.5:1 for text), checked in `tests/content.test.js`.

## Logo

A **white rubber duck in profile, facing right, with an amber beak and a sparkle for an eye**, on a **Teal 700 rounded square**. One flat shape with no gradients or outlines, recognizable at 16 px.

The designed logo is in `icons/icon-{16,32,48,128}.png`. `scripts/make-icons.js` only draws a rough placeholder and refuses to overwrite these files unless run with `--force`.

The logo appears in the toolbar, the store listing and the settings page. It's deliberately **not** on the page button, which stays text-only so it doesn't pull attention from the problem.

### The prompt used for the logo (Gemini / Nano Banana)

> Minimal flat app-icon logo: a rubber duck in side profile facing right, one solid white silhouette, amber (#F59E0B) beak, a tiny four-point sparkle as the eye, centered on a deep teal (#0F766E) rounded square. No text, no gradients, no outlines, thick simple shapes that remain recognizable at 16×16 px, generous padding.

Variations to try:
- the sparkle as the eye, or a small sparkle floating above the head ("an idea")
- the duck slightly tilted, as if listening

To update it, export square PNGs at **16, 32, 48 and 128 px** to `icons/icon-<size>.png`, and check the 16 px one still reads as a duck. `npm run check` verifies the files exist.

## Voice

- Short, plain, encouraging. "Hint · Claude", not "Unlock AI-powered solutions".
- Learning first: understand, hint, intuition. The full solution is a choice, never the default.
- Never imply cheating, and respect contest rules.

## Don'ts

- Don't use the logos or brand colors of Codeforces, AtCoder, LeetCode, OpenAI, Anthropic or Google. Name them only descriptively ("works with ChatGPT").
- Don't use amber for large areas or buttons; it's the spark, not the fill.
- Don't animate the page button. It should never pull attention away from the problem.
