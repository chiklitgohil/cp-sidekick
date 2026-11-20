// LeetCode problem extractor. Requires domText.js. See codeforces.js for the platform interface.
//
// LeetCode is a React single-page app, so the statement is read from LeetCode's own
// GraphQL endpoint (the same one the page uses) instead of the rendered DOM.
// The rendered description is a fallback. Results are cached per problem, so the
// click handler never waits on the network after the page-load prefetch.
(function () {
  const NS = (globalThis.CPSidekick = globalThis.CPSidekick || {});
  NS.platforms = NS.platforms || {};

  const ORIGIN = "https://leetcode.com";
  const PROBLEM_URL = /^https:\/\/leetcode\.com\/(?:contest\/([^/?#]+)\/)?problems\/([^/?#]+)/i;
  const FETCH_TIMEOUT_MS = 8000;

  const QUERY = `query cpSidekickQuestion($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId
    title
    difficulty
    isPaidOnly
    content
    codeSnippets { lang langSlug code }
  }
}`;

  const parseUrl = (url) => {
    const match = PROBLEM_URL.exec(url || "");
    return match ? { contestSlug: match[1] || null, slug: match[2] } : null;
  };

  const withTimeout = async (fetchImpl, resource, init) => {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
    try {
      const response = await fetchImpl(resource, { ...init, signal: controller?.signal });
      return response.ok ? await response.json() : null;
    } catch (_error) {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const questionCache = new Map();
  const fetchQuestion = (slug, fetchImpl = globalThis.fetch) => {
    if (!questionCache.has(slug)) {
      const request = withTimeout(fetchImpl, `${ORIGIN}/graphql/`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { titleSlug: slug } })
      }).then((json) => {
        const question = json?.data?.question || null;
        if (!question) questionCache.delete(slug); // retry next time
        return question;
      });
      questionCache.set(slug, request);
    }
    return questionCache.get(slug);
  };

  const htmlToText = (doc, html, baseUrl) => {
    const Parser = doc.defaultView?.DOMParser || globalThis.DOMParser;
    // DOMParser documents are inert: no scripts run and no images load.
    const parsed = new Parser().parseFromString(`<div>${html}</div>`, "text/html");
    return NS.domText.toText(parsed.body, { baseUrl });
  };

  // The editor's language picker is a button whose text is the language name (e.g. "C++").
  const editorLanguage = (doc, snippets) => {
    const names = new Set(snippets.map((s) => s.lang));
    const button = Array.from(doc.querySelectorAll("button")).find((b) => names.has((b.textContent || "").trim()));
    return button ? button.textContent.trim() : null;
  };

  const extract = async (doc = document, url = doc.location?.href || "", { fetchImpl } = {}) => {
    const parts = parseUrl(url);
    if (!parts) return { ok: false, reason: "This is not a LeetCode problem page." };

    const question = await fetchQuestion(parts.slug, fetchImpl);

    let html = question?.content || "";
    if (!html && question?.isPaidOnly) {
      return { ok: false, reason: "This is a LeetCode Premium problem; its statement isn't available." };
    }
    if (!html) {
      html = doc.querySelector("[data-track-load='description_content']")?.innerHTML || "";
    }
    if (!html) return { ok: false, reason: "Couldn't read this problem yet. Wait for the page to load and try again." };

    const { text, images } = htmlToText(doc, html, ORIGIN);

    const fallbackTitle = (doc.title || "").replace(/\s*-\s*LeetCode\s*$/i, "").trim();
    const title = question
      ? `${question.questionFrontendId ? `${question.questionFrontendId}. ` : ""}${question.title}`
      : fallbackTitle || parts.slug;

    const snippets = question?.codeSnippets || [];
    const lang = snippets.length ? editorLanguage(doc, snippets) : null;
    const snippet = lang ? snippets.find((s) => s.lang === lang) : null;

    return {
      ok: true,
      platform: "LeetCode",
      title,
      url: `${ORIGIN}/problems/${parts.slug}/`,
      difficulty: question?.difficulty || "",
      limits: {},
      // LeetCode statements include their examples and constraints inline.
      statement: text,
      input: "",
      output: "",
      notes: "",
      extraSections: [],
      examples: [],
      images,
      interactive: false,
      starterCode: snippet ? { lang: snippet.lang, code: snippet.code } : null
    };
  };

  const contestCache = new Map();
  const liveContest = async (_doc, url, { fetchImpl = globalThis.fetch, now = Date.now() } = {}) => {
    const parts = parseUrl(url);
    if (!parts?.contestSlug) return false;
    if (!contestCache.has(parts.contestSlug)) {
      contestCache.set(
        parts.contestSlug,
        withTimeout(fetchImpl, `${ORIGIN}/contest/api/info/${encodeURIComponent(parts.contestSlug)}/`, {
          credentials: "include"
        })
      );
    }
    const info = await contestCache.get(parts.contestSlug);
    const start = Number(info?.contest?.start_time) * 1000;
    const duration = Number(info?.contest?.duration) * 1000;
    if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) return false; // fail open
    return now >= start && now < start + duration;
  };

  NS.platforms.leetcode = {
    id: "leetcode",
    name: "LeetCode",
    matches: (url) => Boolean(parseUrl(url)),
    extract,
    liveContest,
    _clearCache: () => {
      questionCache.clear();
      contestCache.clear();
    }
  };

  if (typeof module !== "undefined") module.exports = NS.platforms.leetcode;
})();
