import https from "node:https";

async function tavilySearch(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const payload = JSON.stringify({ query, search_depth: "advanced", max_results: 10, include_answer: false });
  const body = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.tavily.com", path: "/search", method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "Content-Length": Buffer.byteLength(payload) },
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(new Error("tavily timeout")); });
    req.end(payload);
  });
  const data = JSON.parse(body);
  return (data.results || []).map((r) => ({ title: r.title || "", url: r.url || "", content: (r.content || "").slice(0, 800) }));
}

export async function researchNode(state) {
  const name = state.companyName;
  const queries = [
    `${name} entreprise services activité site officiel`,
    `${name} offre commerciale clients secteur`,
    `${name} concurrents positionnement marché`,
  ];

  const allResults = [];
  for (const q of queries) {
    try {
      const results = await tavilySearch(q);
      allResults.push(...results);
      console.log(`[learn:research] "${q.slice(0, 40)}..." → ${results.length} résultats`);
    } catch (e) {
      console.error(`[learn:research] Erreur recherche: ${e.message}`);
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  console.log(`[learn:research] ✓ ${unique.length} sources uniques collectées`);
  return { webResults: unique };
}
