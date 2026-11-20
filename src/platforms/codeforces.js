// Codeforces problem extractor. Requires domText.js.
//
// Platform interface (every judge registers one of these):
//   NS.platforms.<id> = {
//     id, name,
//     matches(url)            -> boolean: is this a problem page?
//     extract(doc, url)       -> Promise<problem | { ok: false, reason }>
//     liveContest(doc, url)   -> Promise<boolean>: is a contest for this problem running now?
//   }
// Add the file to the judge content_scripts entry in manifest.json.
(function () {
  const NS = (globalThis.CPSidekick = globalThis.CPSidekick || {});
  NS.platforms = NS.platforms || {};

  const PROBLEM_URL =
    /^https:\/\/([a-z0-9-]+\.)?codeforces\.com\/(problemset\/problem\/\d+\/[^/?#]+|contest\/\d+\/problem\/[^/?#]+|gym\/\d+\/problem\/[^/?#]+)/i;
  const CONTEST_ID = /codeforces\.com\/(?:problemset\/problem|contest|gym)\/(\d+)/i;

  const KNOWN_SECTIONS = {
    "input-specification": "input",
    "output-specification": "output",
    "note": "notes"
  };

  const sectionText = (node, baseUrl) => {
    if (!node) return { text: "", images: [] };
    const clone = node.cloneNode(true);
    clone.querySelectorAll(".section-title").forEach((el) => el.remove());
    return NS.domText.toText(clone, { baseUrl });
  };

  const headerValue = (headerNode, selector) => {
    const node = headerNode?.querySelector(selector);
    if (!node) return "";
    const clone = node.cloneNode(true);
    clone.querySelectorAll(".property-title").forEach((el) => el.remove());
    return NS.domText.toText(clone).text;
  };

  const collectExamples = (statementNode) => {
    // Only the <pre> is read, so the "Input / Copy" title row is never included.
    // Lines are either <div class="test-example-line"> children or <br>-separated text.
    const pre = (block) => NS.domText.toText(block?.querySelector("pre")).text;

    const inputs = Array.from(statementNode.querySelectorAll(".sample-tests .input"));
    const outputs = Array.from(statementNode.querySelectorAll(".sample-tests .output"));
    return inputs.map((input, index) => ({
      index: index + 1,
      input: pre(input),
      output: pre(outputs[index])
    }));
  };

  const extract = (doc = document, url = doc.location?.href || "") => {
    const statementNode = doc.querySelector(".problem-statement");
    if (!statementNode) {
      return {
        ok: false,
        reason: "No problem statement found on this page. Some gym problems are PDF-only."
      };
    }

    const headerNode = statementNode.querySelector(".header");
    const title =
      headerValue(headerNode, ".title") || (doc.title || "").replace(/\s*-\s*Codeforces\s*$/i, "").trim();

    const problem = {
      ok: true,
      platform: "Codeforces",
      title,
      url: url.split("#")[0],
      limits: {
        time: headerValue(headerNode, ".time-limit"),
        memory: headerValue(headerNode, ".memory-limit"),
        input: headerValue(headerNode, ".input-file"),
        output: headerValue(headerNode, ".output-file")
      },
      statement: "",
      input: "",
      output: "",
      notes: "",
      extraSections: [],
      examples: collectExamples(statementNode),
      images: [],
      interactive: false
    };

    const legend = [];
    Array.from(statementNode.children).forEach((child) => {
      if (child === headerNode || child.classList.contains("sample-tests")) return;

      const { text, images } = sectionText(child, url);
      problem.images.push(...images);
      if (!text) return;

      const known = Object.keys(KNOWN_SECTIONS).find((cls) => child.classList.contains(cls));
      if (known) {
        problem[KNOWN_SECTIONS[known]] = text;
        return;
      }

      const heading = NS.domText.toText(child.querySelector(".section-title")).text;
      if (heading) problem.extraSections.push({ title: heading, text });
      else legend.push(text);
    });

    problem.statement = legend.join("\n\n");
    problem.interactive =
      problem.extraSections.some((section) => /interaction/i.test(section.title)) ||
      /this is an interactive problem/i.test(problem.statement);

    return problem;
  };

  // Gym contests are not checked for a live round (they are practice-only for most users).
  const contestId = (url) => {
    const match = CONTEST_ID.exec(url || "");
    if (!match || /\/gym\//i.test(url)) return null;
    return Number(match[1]);
  };

  // The background script checks the public contest.list API (cached, fails open).
  const liveContest = async (_doc, url) => {
    const id = contestId(url);
    if (!id || !NS.sendMessage) return false;
    const status = await NS.sendMessage({ type: NS.MSG.CONTEST_STATUS, contestId: id });
    return Boolean(status?.live);
  };

  NS.platforms.codeforces = {
    id: "codeforces",
    name: "Codeforces",
    matches: (url) => PROBLEM_URL.test(url || ""),
    contestId,
    liveContest,
    extract: async (doc, url) => extract(doc, url)
  };

  if (typeof module !== "undefined") module.exports = NS.platforms.codeforces;
})();
