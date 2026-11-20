const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

require("../src/platforms/domText.js");
const leetcode = require("../src/platforms/leetcode.js");

const URL = "https://leetcode.com/problems/median-of-two-sorted-arrays/description/";

// Shape of LeetCode's GraphQL `question` response (observed Nov 2026), shortened.
const QUESTION = {
  questionFrontendId: "4",
  title: "Median of Two Sorted Arrays",
  difficulty: "Hard",
  isPaidOnly: false,
  content:
    "<p>Given two sorted arrays <code>nums1</code> and <code>nums2</code> of size <code>m</code> and <code>n</code>, return <strong>the median</strong>.</p>\n\n" +
    "<p><strong class=\"example\">Example 1:</strong></p>\n<pre>\n<strong>Input:</strong> nums1 = [1,3], nums2 = [2]\n<strong>Output:</strong> 2.00000\n</pre>\n\n" +
    "<p><strong>Constraints:</strong></p>\n<ul>\n\t<li><code>0 &lt;= m &lt;= 1000</code></li>\n\t<li><code>-10<sup>6</sup> &lt;= nums1[i] &lt;= 10<sup>6</sup></code></li>\n</ul>\n" +
    "<p><img src=\"https://assets.leetcode.com/uploads/x.png\"></p>",
  codeSnippets: [
    { lang: "C++", langSlug: "cpp", code: "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        \n    }\n};" },
    { lang: "Python3", langSlug: "python3", code: "class Solution:\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n        " }
  ]
};

const page = (body = "") =>
  new JSDOM(`<html><head><title>Median of Two Sorted Arrays - LeetCode</title></head><body>${body}</body></html>`, {
    url: URL
  }).window.document;

const graphqlFetch = (question, calls = []) => async (url, init) => {
  calls.push({ url, init });
  return { ok: true, json: async () => ({ data: { question } }) };
};

test.beforeEach(() => leetcode._clearCache());

test("matches problem and contest problem URLs only", () => {
  assert.ok(leetcode.matches("https://leetcode.com/problems/two-sum/"));
  assert.ok(leetcode.matches("https://leetcode.com/problems/two-sum/description/"));
  assert.ok(leetcode.matches("https://leetcode.com/contest/weekly-contest-400/problems/minimum-number-of-chairs/"));
  assert.ok(!leetcode.matches("https://leetcode.com/problemset/"));
  assert.ok(!leetcode.matches("https://leetcode.com/contest/weekly-contest-400/"));
  assert.ok(!leetcode.matches("https://leetcode.cn/problems/two-sum/"));
});

test("extracts from GraphQL: title, difficulty, statement text, images", async () => {
  const calls = [];
  const problem = await leetcode.extract(page(), URL, { fetchImpl: graphqlFetch(QUESTION, calls) });
  assert.equal(problem.ok, true);
  assert.equal(problem.platform, "LeetCode");
  assert.equal(problem.title, "4. Median of Two Sorted Arrays");
  assert.equal(problem.difficulty, "Hard");
  assert.equal(problem.url, "https://leetcode.com/problems/median-of-two-sorted-arrays/");
  assert.match(problem.statement, /^Given two sorted arrays nums1 and nums2 of size m and n, return the median\./);
  assert.match(problem.statement, /Input: nums1 = \[1,3\], nums2 = \[2\]\nOutput: 2\.00000/);
  assert.match(problem.statement, /- -10\^6 <= nums1\[i\] <= 10\^6/);
  assert.deepEqual(problem.images, ["https://assets.leetcode.com/uploads/x.png"]);

  const body = JSON.parse(calls[0].init.body);
  assert.equal(calls[0].url, "https://leetcode.com/graphql/");
  assert.equal(body.variables.titleSlug, "median-of-two-sorted-arrays");
});

test("starter code follows the language shown in the editor", async () => {
  const withCpp = await leetcode.extract(page("<button>C++</button>"), URL, { fetchImpl: graphqlFetch(QUESTION) });
  assert.equal(withCpp.starterCode.lang, "C++");
  assert.match(withCpp.starterCode.code, /findMedianSortedArrays\(vector<int>& nums1/);

  leetcode._clearCache();
  const unknown = await leetcode.extract(page("<button>Submit</button>"), URL, { fetchImpl: graphqlFetch(QUESTION) });
  assert.equal(unknown.starterCode, null);
});

test("results are cached per problem (click after prefetch makes no request)", async () => {
  const calls = [];
  const fetchImpl = graphqlFetch(QUESTION, calls);
  await leetcode.extract(page(), URL, { fetchImpl });
  await leetcode.extract(page(), URL, { fetchImpl });
  assert.equal(calls.length, 1);
});

test("falls back to the rendered description when GraphQL fails", async () => {
  const failing = async () => {
    throw new Error("network");
  };
  const doc = page('<div data-track-load="description_content"><p>Rendered <code>statement</code>.</p></div>');
  const problem = await leetcode.extract(doc, URL, { fetchImpl: failing });
  assert.equal(problem.ok, true);
  assert.equal(problem.title, "Median of Two Sorted Arrays");
  assert.equal(problem.statement, "Rendered statement.");
});

test("premium problems without content fail with a clear reason", async () => {
  const premium = { ...QUESTION, isPaidOnly: true, content: null };
  const result = await leetcode.extract(page(), URL, { fetchImpl: graphqlFetch(premium) });
  assert.equal(result.ok, false);
  assert.match(result.reason, /Premium/);
});

test("nothing available yet asks the user to retry", async () => {
  const result = await leetcode.extract(page(), URL, { fetchImpl: graphqlFetch(null) });
  assert.equal(result.ok, false);
  assert.match(result.reason, /try again/);
});

test("live contest check uses the contest info API and fails open", async () => {
  const contestUrl = "https://leetcode.com/contest/weekly-contest-400/problems/minimum-number-of-chairs/";
  const info = { contest: { start_time: 1717295400, duration: 5400 } };
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => info };
  };

  assert.equal(await leetcode.liveContest(null, contestUrl, { fetchImpl, now: 1717295400 * 1000 + 60000 }), true);
  assert.equal(await leetcode.liveContest(null, contestUrl, { fetchImpl, now: (1717295400 + 5400) * 1000 }), false);
  assert.equal(calls.length, 1, "contest info is cached");
  assert.equal(calls[0], "https://leetcode.com/contest/api/info/weekly-contest-400/");

  assert.equal(await leetcode.liveContest(null, URL, { fetchImpl }), false, "non-contest URLs are never live");

  leetcode._clearCache();
  const failing = async () => {
    throw new Error("offline");
  };
  assert.equal(await leetcode.liveContest(null, contestUrl, { fetchImpl: failing }), false);
});
