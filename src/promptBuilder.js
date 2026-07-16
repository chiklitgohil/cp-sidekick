(function () {
  const MODES = {
    hints: {
      label: "Hints only",
      instruction:
        "Help me with hints only. Do not reveal the full solution or code unless I explicitly ask. Start with the smallest useful hint, then wait for my response."
    },
    socratic: {
      label: "Socratic mode",
      instruction:
        "Guide me Socratically. Ask one focused question at a time, adapt based on my answers, and avoid giving away the full solution unless I ask for it."
    },
    intuition: {
      label: "Explain intuition",
      instruction:
        "Explain the core intuition and the path to discovering the solution. Keep it beginner-friendly but rigorous, and separate intuition from implementation details."
    },
    review: {
      label: "Find bug in my solution",
      instruction:
        "Review my solution attempt. Look for logical bugs, missed edge cases, complexity problems, and implementation pitfalls. If I did not paste code yet, ask me to paste it before diagnosing."
    },
    optimal: {
      label: "Optimal solution after attempt",
      instruction:
        "Give the optimal approach now. Include the main idea, proof sketch, time and memory complexity, edge cases, and concise implementation guidance."
    }
  };

  const clean = (value) => (value || "").trim();

  const formatExamples = (examples) => {
    if (!examples || examples.length === 0) return "No samples extracted.";

    return examples
      .map((example) => {
        return [
          `Example ${example.index}:`,
          "Input:",
          clean(example.input) || "(empty)",
          "Output:",
          clean(example.output) || "(empty)"
        ].join("\n");
      })
      .join("\n\n");
  };

  const formatMeta = (meta = {}) => {
    const lines = [];
    if (meta.timeLimit) lines.push(`Time limit: ${meta.timeLimit}`);
    if (meta.memoryLimit) lines.push(`Memory limit: ${meta.memoryLimit}`);
    if (meta.inputFile) lines.push(`Input: ${meta.inputFile}`);
    if (meta.outputFile) lines.push(`Output: ${meta.outputFile}`);
    return lines.length ? lines.join("\n") : "No metadata extracted.";
  };

  const buildPrompt = ({ problem, mode = "hints", userCode = "" }) => {
    const modeConfig = MODES[mode] || MODES.hints;
    const constraints = problem.constraints?.length ? problem.constraints.join("\n") : "No constraints extracted separately.";

    return [
      `I am solving this ${problem.platform || "competitive programming"} problem.`,
      "",
      `Mode: ${modeConfig.label}`,
      modeConfig.instruction,
      "",
      "Please preserve the learning value. If the selected mode asks for hints or Socratic guidance, do not jump to the final answer.",
      "",
      "Problem:",
      `Title: ${clean(problem.title)}`,
      `URL: ${clean(problem.url)}`,
      "",
      "Metadata:",
      formatMeta(problem.meta),
      "",
      "Statement:",
      clean(problem.statement) || "No statement extracted.",
      "",
      "Input format:",
      clean(problem.input) || "No input format extracted.",
      "",
      "Output format:",
      clean(problem.output) || "No output format extracted.",
      "",
      "Constraints and useful limits:",
      constraints,
      "",
      "Examples:",
      formatExamples(problem.examples),
      problem.notes ? ["", "Notes:", clean(problem.notes)].join("\n") : "",
      userCode ? ["", "My current solution attempt:", "```", userCode.trim(), "```"].join("\n") : ""
    ]
      .filter((part) => part !== "")
      .join("\n");
  };

  window.CPSidekick = window.CPSidekick || {};
  window.CPSidekick.promptModes = MODES;
  window.CPSidekick.buildPrompt = buildPrompt;
})();
