// Converts a DOM subtree into clean plain text for prompts.
//
// Why not innerText: on rendered MathJax pages innerText returns the visual
// glyphs (e.g. "a_i" comes out as "a\ni\n𝑎\n𝑖"), and on detached clones it
// drops all line breaks. This walker keeps the original TeX instead
// (from <script type="math/tex">) and adds line breaks for block elements.
(function () {
  const NS = (globalThis.CPSidekick = globalThis.CPSidekick || {});

  const BLOCK_TAGS = new Set([
    "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "CENTER", "DD", "DIV", "DL", "DT",
    "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR",
    "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TBODY", "THEAD",
    "TFOOT", "TR", "UL"
  ]);
  const PARAGRAPH_TAGS = new Set(["P", "PRE", "TABLE", "UL", "OL", "BLOCKQUOTE", "CENTER"]);
  const SKIP_TAGS = new Set(["STYLE", "NOSCRIPT", "BUTTON", "TEMPLATE", "SVG", "MJX-CONTAINER"]);
  // Rendered MathJax output; the TeX source lives in the sibling <script>.
  const SKIP_CLASSES = [
    "MathJax", "MathJax_Preview", "MathJax_Display", "MathJax_SVG", "MathJax_SVG_Display",
    "MathJax_CHTML", "MJX_Assistive_MathML", "input-output-copier",
    // KaTeX visual output (the TeX source is read from its <annotation>) and copy buttons.
    "katex-html", "katex-mathml", "btn-copy", "div-btn-copy"
  ];

  const NBSP = / /g;
  const INLINE_WS = /[\s ]+/g;

  // Codeforces source text uses $$$x$$$ (inline) and $$$$$$x$$$$$$ (display),
  // which is what remains if MathJax has not rendered yet.
  const normalizeRawTex = (text) =>
    text
      .replace(/\${6}([\s\S]+?)\${6}/g, (_m, tex) => "$$" + tex.trim() + "$$")
      .replace(/\${3}([\s\S]+?)\${3}/g, (_m, tex) => "$" + tex.trim() + "$");

  const hasSkipClass = (el) => {
    const list = el.classList;
    if (!list) return false;
    return SKIP_CLASSES.some((name) => list.contains(name));
  };

  const toText = (root, { baseUrl = "" } = {}) => {
    const images = [];
    let out = "";

    const endsWith = (suffix) => out.endsWith(suffix);
    const ensureNewline = () => {
      if (out && !endsWith("\n")) out += "\n";
    };
    const ensureBlankLine = () => {
      if (!out) return;
      ensureNewline();
      if (!endsWith("\n\n")) out += "\n";
    };

    const absolute = (src) => {
      try {
        return new URL(src, baseUrl || undefined).href;
      } catch (_error) {
        return src;
      }
    };

    const walk = (node, inPre) => {
      if (node.nodeType === 3) {
        const raw = node.nodeValue || "";
        if (inPre) {
          out += raw.replace(NBSP, " ").replace(/\r\n?/g, "\n");
          return;
        }
        let text = normalizeRawTex(raw).replace(INLINE_WS, " ");
        if (!out || endsWith("\n") || endsWith(" ")) text = text.replace(/^ /, "");
        out += text;
        return;
      }
      if (node.nodeType !== 1) return;

      const tag = node.tagName.toUpperCase();

      // Inside <pre> (input formats, samples) math is written bare so it stays readable.
      const emitMath = (tex, display) => {
        tex = (tex || "").trim();
        if (!tex) return;
        if (inPre) {
          out += tex;
        } else if (display) {
          ensureNewline();
          out += "$$" + tex + "$$";
          ensureNewline();
        } else {
          out += "$" + tex + "$";
        }
      };

      // MathJax 2 (Codeforces): TeX source in <script type="math/tex">.
      if (tag === "SCRIPT") {
        const type = (node.getAttribute("type") || "").toLowerCase();
        if (type.startsWith("math/tex")) emitMath(node.textContent, type.includes("mode=display"));
        return;
      }

      // KaTeX (AtCoder): TeX source in <annotation encoding="application/x-tex">.
      if (node.classList?.contains("katex")) {
        const annotation = node.querySelector("annotation[encoding='application/x-tex']");
        if (annotation) {
          emitMath(annotation.textContent, Boolean(node.closest(".katex-display")));
          return;
        }
      }

      // AtCoder <var> before KaTeX renders: its text is the TeX source.
      if (tag === "VAR" && !node.querySelector(".katex")) {
        emitMath(node.textContent, false);
        return;
      }

      if (SKIP_TAGS.has(tag) || hasSkipClass(node)) return;

      if (tag === "BR") {
        out += "\n";
        return;
      }

      if (tag === "IMG") {
        const src = node.getAttribute("src");
        if (src) {
          const url = absolute(src);
          images.push(url);
          out += " [image: " + url + "] ";
        }
        return;
      }

      const isBlock = BLOCK_TAGS.has(tag);
      const isParagraph = PARAGRAPH_TAGS.has(tag) && !inPre;
      const childInPre = inPre || tag === "PRE";

      if (isParagraph) ensureBlankLine();
      else if (isBlock) ensureNewline();

      if (tag === "LI") out += "- ";
      if (tag === "SUP") out += "^";
      if (tag === "SUB") out += "_";

      node.childNodes.forEach((child) => walk(child, childInPre));

      if (tag === "TD" || tag === "TH") out += " ";
      if (isParagraph) ensureBlankLine();
      else if (isBlock) ensureNewline();
    };

    if (root) walk(root, false);

    const text = out
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+/, "")
      .trimEnd();

    return { text, images };
  };

  NS.domText = { toText, normalizeRawTex };

  if (typeof module !== "undefined") module.exports = NS.domText;
})();
