import { createModel } from "../utils/model.mjs";
import { getPrompts } from "../prompts/step-prompts.mjs";
import { repairJSON } from "../utils/json-repair.mjs";

const TITLE = "Rédaction du plan de contact";

export async function redactionNode(state) {
  const prior = state.steps.map((s) => `${s.title}: ${s.conclusion}`).join("\n");

  const model = createModel({ maxTokens: 768 });

  const response = await model.invoke([
    { role: "system", content: getPrompts().redaction },
    { role: "user", content: `Entreprise : ${state.company}\nFonction : ${state.role}\n\nContexte accumulé :\n${prior}` },
  ]);

  try {
    const parsed = repairJSON(response.content);
    console.log(`[node:redaction] ✓`);
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
