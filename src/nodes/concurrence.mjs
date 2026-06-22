import { createModel } from "../utils/model.mjs";
import { getPrompts } from "../prompts/step-prompts.mjs";
import { repairJSON } from "../utils/json-repair.mjs";

const TITLE = "Cartographie concurrentielle";

export async function concurrenceNode(state) {
  const prior = state.steps.map((s) => `${s.title}: ${s.conclusion}`).join("\n");
  const webCtx = state.webResults.length > 0
    ? `\n\nSources web :\n${state.webResults.map((r) => `- ${r.title}: ${r.content}`).join("\n")}`
    : "";

  const model = createModel({ maxTokens: 1024 });

  const response = await model.invoke([
    { role: "system", content: getPrompts().concurrence },
    { role: "user", content: `Entreprise : ${state.company}\nFonction : ${state.role}\n\nContexte accumulé :\n${prior}${webCtx}` },
  ]);

  try {
    const parsed = repairJSON(response.content);
    console.log(`[node:concurrence] ✓`);
    return {
      steps: {
        title: parsed.title || TITLE,
        log: parsed.log || [],
        sources: parsed.sources || [],
        conclusion: parsed.conclusion || "",
        alert: !!parsed.alert,
      },
    };
  } catch (e) {
    console.error(`[node:${TITLE}] ERROR: ${e.message}`);
    const raw = typeof response.content === "string" ? response.content : String(response.content);
    return { steps: { title: TITLE, log: [], sources: [], conclusion: raw.slice(0, 500), alert: false } };
  }
}
