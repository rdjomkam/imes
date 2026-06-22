import https from "node:https";
import { createModel } from "../utils/model.mjs";
import { getPrompts } from "../prompts/step-prompts.mjs";
import { repairJSON } from "../utils/json-repair.mjs";

const TITLE = "Collecte du contexte public";

async function tavilySearch(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const payload = JSON.stringify({ query, search_depth: "basic", max_results: 5, include_answer: false });
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
    req.setTimeout(8000, () => { req.destroy(new Error("tavily timeout")); });
    req.end(payload);
  });
  const data = JSON.parse(body);
  return (data.results || []).map((r) => ({ title: r.title || "", url: r.url || "", content: (r.content || "").slice(0, 500) }));
}

export async function contexteNode(state) {
  let webResults = [];
  let webSources = [];

  try {
    webResults = await tavilySearch(`${state.company} Cameroun entreprise`);
    webSources = webResults.map((r) => r.url);
    console.log(`[node:contexte] ${webResults.length} résultats Tavily`);
  } catch (err) {
    console.log(`[node:contexte] Tavily error: ${err.message}`);
  }

  const contextBlock = webResults.length > 0
    ? `Résultats de recherche web sur "${state.company}" :\n${webResults.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`).join("\n\n")}`
    : "Aucun résultat de recherche web disponible. Raisonne avec tes connaissances générales sur le tissu économique camerounais.";

  const model = createModel({ maxTokens: 768 });

  const response = await model.invoke([
    { role: "system", content: getPrompts().contexte },
    { role: "user", content: `Entreprise : ${state.company}\nFonction : ${state.role}\n\n${contextBlock}` },
  ]);

  try {
    const parsed = repairJSON(response.content);
    console.log(`[node:contexte] ✓`);
    return {
      webResults,
      webSources,
      steps: {
        title: parsed.title || TITLE,
        log: parsed.log || [],
        sources: webSources.length > 0 ? webSources : (parsed.sources || []),
        conclusion: parsed.conclusion || "",
        alert: !!parsed.alert,
      },
    };
  } catch (e) {
    console.error(`[node:${TITLE}] ERROR: ${e.message}`);
    const raw = typeof response.content === "string" ? response.content : String(response.content);
    return { webResults, webSources, steps: { title: TITLE, log: [], sources: webSources, conclusion: raw.slice(0, 500), alert: false } };
  }
}
