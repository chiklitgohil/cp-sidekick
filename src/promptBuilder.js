// Builds the prompt sent to the AI chat, and the button text for each help mode.
// Plain text on purpose: rich chat inputs (ProseMirror, Quill) turn markdown such as
// "# " or triple backticks into formatting while text is inserted.
(function () {
  const NS = (globalThis.CPSidekick = globalThis.CPSidekick || {});

  // Ordered roughly by how much they give away.
  // needsCode: the prompt ends with "My code:" and is never auto-sent, so the user
  // can paste their code at the end of the same message first.
  const MODES = {
    understand: {
      label: "Understand",
      short: "Understand",
      description: "Explains the statement and samples. No solution ideas.",
      instruction:
        "Help me understand the problem only. Restate it in simple terms, explain the input and output format, and walk through the examples step by step. Do not hint at the solution, the approach, or the algorithm."
    },
    hints: {
      label: "Hint",
      short: "Hint",
      description: "Small nudges or guiding questions, one at a time. No spoilers.",
      instruction:
        "Give me hints only, one at a time, starting with the smallest useful nudge. A hint can be a guiding question. Do not reveal the full solution or write code unless I explicitly ask. After each hint, wait for my reply."
    },
    intuition: {
      label: "Intuition",
      short: "Intuition",
      description: "The key observations behind the solution, without code.",
      instruction:
        "Explain the key observations and how one would discover the solution. Keep intuition separate from implementation details. No full code unless I ask."
    },
    debug: {
      label: "Debug",
      short: "Debug",
      needsCode: true,
      description: "Paste your failing code: finds the bug and the test that breaks it.",
      instruction:
        "My solution gets Wrong Answer, Time Limit Exceeded or a runtime error. My code is at the end of this message. Find the bug: point to the exact lines, explain why they fail, and give a small test case that breaks them. Then list edge cases I should test. Don't rewrite the whole solution unless I ask. If my code is missing, ask me to paste it."
    },
    refine: {
      label: "Refine",
      short: "Refine",
      needsCode: true,
      description: "Paste your working code: better approach, cleaner code, and why.",
      instruction:
        "My solution works. My code is at the end of this message. Help me refine it: (1) a better algorithm or complexity if one exists, (2) cleaner structure and clearer names, (3) competitive programming best practices such as fast I/O, overflow safety and avoiding needless copies. For every suggestion, explain why it is better than what I did. Then show the refined version. If my code is missing, ask me to paste it."
    },
    solution: {
      label: "Solution",
      short: "Solution",
      description: "Full approach, proof and code, for after you've tried.",
      instruction:
        "I have already attempted this problem. Explain the optimal approach: main idea, proof sketch, time and memory complexity, edge cases, and a clean reference implementation."
    }
  };

  // Modes from earlier versions, mapped so saved settings keep working.
  const LEGACY_MODES = { socratic: "hints", review: "debug" };

  const DEFAULT_MODE = "hints";
  const clean = (value) => (value || "").trim();

  const resolveMode = (mode) => (MODES[mode] ? mode : LEGACY_MODES[mode] || DEFAULT_MODE);
  const modeFor = (mode) => MODES[resolveMode(mode)];
  // Short on purpose: "Hint · Claude". Sits in the corner of the problem page.
  const buttonLabel = (mode, aiLabel) => `${modeFor(mode).short} · ${aiLabel}`;
  const needsCode = (mode) => Boolean(modeFor(mode).needsCode);

  const section = (title, body) => (clean(body) ? `${title}:\n${clean(body)}` : "");

  const formatLimits = (limits = {}) => {
    const parts = [];
    if (limits.time) parts.push(`time limit ${limits.time}`);
    if (limits.memory) parts.push(`memory limit ${limits.memory}`);
    const io = [limits.input, limits.output].filter((v) => v && !/standard/i.test(v));
    if (io.length) parts.push(`files: ${io.join(" / ")}`);
    return parts.join(", ");
  };

  const formatExamples = (examples = []) =>
    examples
      .map((example) =>
        [
          `Example ${example.index} input:`,
          clean(example.input) || "(empty)",
          `Example ${example.index} output:`,
          clean(example.output) || "(empty)",
          ...(clean(example.explanation) ? [`Example ${example.index} explanation:`, clean(example.explanation)] : [])
        ].join("\n")
      )
      .join("\n\n");

  const TRUNCATION_NOTE = "...(truncated; the full statement is at the URL above)";
  const COMPACT_EXAMPLES = 2;

  // compact: for URL hand-off (Google AI Mode), where the prompt travels in the URL.
  // Keeps the first examples, drops extras, and fits the statement into maxChars.
  const buildPrompt = ({ problem, mode = DEFAULT_MODE, compact = false, maxChars = Infinity }) => {
    if (compact) {
      const slim = {
        ...problem,
        images: [],
        starterCode: null,
        examples: (problem.examples || []).slice(0, COMPACT_EXAMPLES).map((e) => ({ ...e, explanation: "" }))
      };
      let prompt = buildPrompt({ problem: slim, mode });
      const overflow = prompt.length - maxChars;
      if (overflow > 0 && slim.statement) {
        const keep = Math.max(0, slim.statement.length - overflow - TRUNCATION_NOTE.length - 1);
        slim.statement = `${slim.statement.slice(0, keep).trimEnd()}\n${TRUNCATION_NOTE}`;
        prompt = buildPrompt({ problem: slim, mode });
      }
      return prompt.length > maxChars ? prompt.slice(0, maxChars) : prompt;
    }

    const modeConfig = modeFor(mode);
    const limits = formatLimits(problem.limits);
    const extra = (problem.extraSections || []).map((s) => section(s.title, s.text));

    const remarks = [];
    if (problem.interactive) remarks.push("This is an interactive problem.");
    if (problem.language && problem.language !== "en") {
      remarks.push("The statement is only available in Japanese; please read it as such and answer in English.");
    }
    if (problem.images?.length) {
      remarks.push(
        `The statement contains ${problem.images.length} image(s) I could not include; they are marked as [image: URL].`
      );
    }

    const heading = [
      `Problem: ${clean(problem.title)} (${problem.platform || "Online judge"}`,
      problem.difficulty ? `, ${problem.difficulty}` : "",
      ")"
    ].join("");

    // Code modes: the user's own code replaces the starter code.
    const starter =
      problem.starterCode?.code && !modeConfig.needsCode
        ? section(`Starter code (${problem.starterCode.lang})`, problem.starterCode.code)
        : "";

    const prompt = [
      `I'm practicing competitive programming. ${modeConfig.instruction}`,
      "Math is written in LaTeX.",
      remarks.join(" "),
      "",
      heading,
      clean(problem.url),
      limits ? `Limits: ${limits}` : "",
      "",
      section("Statement", problem.statement),
      "",
      section("Constraints", problem.constraints),
      "",
      section("Input", problem.input),
      "",
      section("Output", problem.output),
      ...extra.flatMap((s) => ["", s]),
      "",
      section("Examples", formatExamples(problem.examples)),
      "",
      section("Note", problem.notes),
      "",
      starter
    ]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Ends where the user pastes their code; the cursor is left right here.
    return modeConfig.needsCode ? `${prompt}\n\nMy code:\n` : prompt;
  };

  NS.promptModes = MODES;
  NS.DEFAULT_MODE = DEFAULT_MODE;
  NS.resolveMode = resolveMode;
  NS.buildPrompt = buildPrompt;
  NS.buttonLabel = buttonLabel;
  NS.needsCode = needsCode;

  if (typeof module !== "undefined") {
    module.exports = { buildPrompt, buttonLabel, needsCode, resolveMode, MODES, LEGACY_MODES, DEFAULT_MODE };
  }
})();
