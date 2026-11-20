// AtCoder task extractor. Requires domText.js. See codeforces.js for the platform interface.
//
// Markup (observed on atcoder.jp, Nov 2026):
//   #task-statement > span.lang > span.lang-en | span.lang-ja
//     div.part > section > h3 "Problem Statement" | "Constraints" | "Input" | "Output" |
//                          "Sample Input 1" | "Sample Output 1" ...   (+ <pre> for samples)
//   Math: <var> containing KaTeX, TeX kept in <annotation encoding="application/x-tex">.
//   Contest window: inline script `var startTime = moment("...")`, `var endTime = moment("...")`.
(function () {
  const NS = (globalThis.CPSidekick = globalThis.CPSidekick || {});
  NS.platforms = NS.platforms || {};

  const TASK_URL = /^https:\/\/atcoder\.jp\/contests\/[^/?#]+\/tasks\/[^/?#]+/i;
  const MAX_LIVE_CONTEST_MS = 30 * 24 * 60 * 60 * 1000; // longer = permanent practice contest

  const SECTION_PATTERNS = [
    { key: "statement", re: /^(problem statement|問題文)$/i },
    { key: "constraints", re: /^(constraints|制約)$/i },
    { key: "input", re: /^(input|入力)$/i },
    { key: "output", re: /^(output|出力)$/i },
    { key: "sampleInput", re: /^(?:sample input|入力例)\s*(\d+)$/i },
    { key: "sampleOutput", re: /^(?:sample output|出力例)\s*(\d+)$/i }
  ];

  const toText = (node, baseUrl) => NS.domText.toText(node, { baseUrl });
  const plain = (node, baseUrl) => toText(node, baseUrl).text;

  const withoutSelectors = (node, selectors) => {
    const clone = node.cloneNode(true);
    selectors.forEach((selector) => clone.querySelectorAll(selector).forEach((el) => el.remove()));
    return clone;
  };

  const classify = (heading) => {
    for (const { key, re } of SECTION_PATTERNS) {
      const match = re.exec(heading);
      if (match) return { key, index: match[1] ? Number(match[1]) : 0 };
    }
    return { key: "other", index: 0 };
  };

  const readLimits = (doc) => {
    const line = Array.from(doc.querySelectorAll("#main-container p, .col-sm-12 > p"))
      .map((p) => (p.textContent || "").replace(/\s+/g, " ").trim())
      .find((t) => /(Time Limit|実行時間制限)/i.test(t));
    if (!line) return {};
    const match = /(?:Time Limit|実行時間制限)\s*:\s*([^/]+?)\s*\/\s*(?:Memory Limit|メモリ制限)\s*:\s*(.+)$/i.exec(line);
    return match ? { time: match[1], memory: match[2] } : {};
  };

  const extract = (doc = document, url = doc.location?.href || "") => {
    const root = doc.querySelector("#task-statement");
    if (!root) return { ok: false, reason: "No task statement found on this page." };

    const english = root.querySelector(".lang-en");
    const japanese = root.querySelector(".lang-ja");
    const statementRoot = english || japanese || root;
    const language = english ? "en" : japanese ? "ja" : "en";

    const titleNode = doc.querySelector("span.h2");
    const title = titleNode
      ? plain(withoutSelectors(titleNode, ["a", ".btn"])).replace(/\s+/g, " ").trim()
      : (doc.title || "").trim();

    const problem = {
      ok: true,
      platform: "AtCoder",
      title,
      url: url.split("#")[0],
      language,
      limits: readLimits(doc),
      statement: "",
      constraints: "",
      input: "",
      output: "",
      notes: "",
      extraSections: [],
      examples: [],
      images: [],
      interactive: false
    };

    const samples = new Map();
    const sample = (index) => {
      if (!samples.has(index)) samples.set(index, { index, input: "", output: "", explanation: "" });
      return samples.get(index);
    };

    statementRoot.querySelectorAll("section").forEach((sectionNode) => {
      const h3 = sectionNode.querySelector("h3");
      if (!h3) return;
      const heading = plain(h3).replace(/\s+/g, " ").trim();
      const { key, index } = classify(heading);

      if (key === "sampleInput" || key === "sampleOutput") {
        const entry = sample(index);
        const pre = sectionNode.querySelector("pre");
        entry[key === "sampleInput" ? "input" : "output"] = plain(pre);
        if (key === "sampleOutput") {
          entry.explanation = plain(withoutSelectors(sectionNode, ["h3", "pre", ".div-btn-copy"]), url);
        }
        return;
      }

      const body = toText(withoutSelectors(sectionNode, ["h3"]), url);
      problem.images.push(...body.images);
      if (!body.text) return;
      if (key === "other") problem.extraSections.push({ title: heading, text: body.text });
      else problem[key] = body.text;
    });

    problem.examples = Array.from(samples.values()).sort((a, b) => a.index - b.index);

    problem.interactive =
      problem.extraSections.some((s) => /interaction|入出力/i.test(s.title)) ||
      /this is an interactive (problem|task)/i.test(problem.statement);

    if (!problem.statement && !problem.examples.length) {
      return { ok: false, reason: "Could not read this task statement." };
    }
    return problem;
  };

  // Reads the contest window from the page's inline scripts. No network needed.
  const contestWindow = (doc) => {
    const source = Array.from(doc.querySelectorAll("script:not([src])"))
      .map((s) => s.textContent || "")
      .join("\n");
    const read = (name) => {
      const match = new RegExp(`var\\s+${name}\\s*=\\s*moment\\(\\s*"([^"]+)"`).exec(source);
      const time = match ? Date.parse(match[1]) : NaN;
      return Number.isFinite(time) ? time : null;
    };
    return { start: read("startTime"), end: read("endTime") };
  };

  const isLive = ({ start, end }, now = Date.now()) =>
    start !== null && end !== null && end - start <= MAX_LIVE_CONTEST_MS && now >= start && now < end;

  NS.platforms.atcoder = {
    id: "atcoder",
    name: "AtCoder",
    matches: (url) => TASK_URL.test(url || ""),
    extract: async (doc, url) => extract(doc, url),
    liveContest: async (doc) => isLive(contestWindow(doc || document)),
    contestWindow,
    isLive
  };

  if (typeof module !== "undefined") module.exports = NS.platforms.atcoder;
})();
