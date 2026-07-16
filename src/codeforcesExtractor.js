(function () {
  const normalizeSpace = (value) =>
    (value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const sectionTitle = (node) => {
    const title = node?.querySelector(".section-title");
    return normalizeSpace(title?.textContent || "");
  };

  const textFromNode = (node) => normalizeSpace(node?.innerText || node?.textContent || "");

  const cloneWithoutTitle = (node) => {
    if (!node) return "";
    const clone = node.cloneNode(true);
    clone.querySelector(".section-title")?.remove();
    return textFromNode(clone);
  };

  const collectStatementParagraphs = (statementNode) => {
    if (!statementNode) return "";

    const parts = [];
    Array.from(statementNode.children).forEach((child) => {
      if (child.classList.contains("header")) return;
      if (child.classList.contains("input-specification")) return;
      if (child.classList.contains("output-specification")) return;
      if (child.classList.contains("sample-tests")) return;
      if (child.classList.contains("note")) return;
      if (child.classList.contains("tutorial")) return;

      const text = textFromNode(child);
      if (text) parts.push(text);
    });

    return normalizeSpace(parts.join("\n\n"));
  };

  const collectExamples = (statementNode) => {
    const samples = statementNode?.querySelectorAll(".sample-tests .sample-test") || [];
    const examples = Array.from(samples).map((sample, index) => {
      const input = cloneWithoutTitle(sample.querySelector(".input"));
      const output = cloneWithoutTitle(sample.querySelector(".output"));
      return {
        index: index + 1,
        input,
        output
      };
    });

    if (examples.length > 0) return examples;

    const inputBlocks = statementNode?.querySelectorAll(".sample-tests .input") || [];
    const outputBlocks = statementNode?.querySelectorAll(".sample-tests .output") || [];

    return Array.from(inputBlocks).map((inputBlock, index) => ({
      index: index + 1,
      input: cloneWithoutTitle(inputBlock),
      output: cloneWithoutTitle(outputBlocks[index])
    }));
  };

  const collectConstraints = (statement) => {
    const candidates = [statement, statement.input, statement.output, statement.notes]
      .filter(Boolean)
      .join("\n");

    const lines = candidates
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const constraintHints = lines.filter((line) =>
      /(\d+\s*(<=|≤|<)|\b<=\b|≤|10\^|\bmod\b|memory limit|time limit)/i.test(line)
    );

    return Array.from(new Set(constraintHints)).slice(0, 12);
  };

  const parseMeta = (headerNode) => {
    const timeLimit = textFromNode(headerNode?.querySelector(".time-limit")).replace(/^time limit per test/i, "").trim();
    const memoryLimit = textFromNode(headerNode?.querySelector(".memory-limit")).replace(/^memory limit per test/i, "").trim();
    const inputFile = textFromNode(headerNode?.querySelector(".input-file")).replace(/^input/i, "").trim();
    const outputFile = textFromNode(headerNode?.querySelector(".output-file")).replace(/^output/i, "").trim();

    return { timeLimit, memoryLimit, inputFile, outputFile };
  };

  const extractCodeforcesProblem = (doc = document, url = window.location.href) => {
    const statementNode = doc.querySelector(".problem-statement");
    if (!statementNode) {
      return {
        ok: false,
        reason: "No Codeforces problem statement was found on this page."
      };
    }

    const headerNode = statementNode.querySelector(".header");
    const title = textFromNode(headerNode?.querySelector(".title")) || doc.title.replace(" - Codeforces", "");
    const inputNode = statementNode.querySelector(".input-specification");
    const outputNode = statementNode.querySelector(".output-specification");
    const noteNode = statementNode.querySelector(".note");

    const problem = {
      ok: true,
      platform: "Codeforces",
      title,
      url,
      statement: collectStatementParagraphs(statementNode),
      input: cloneWithoutTitle(inputNode),
      output: cloneWithoutTitle(outputNode),
      notes: cloneWithoutTitle(noteNode),
      examples: collectExamples(statementNode),
      meta: parseMeta(headerNode)
    };

    problem.constraints = collectConstraints(problem);
    return problem;
  };

  window.CPSidekick = window.CPSidekick || {};
  window.CPSidekick.extractCodeforcesProblem = extractCodeforcesProblem;
})();
