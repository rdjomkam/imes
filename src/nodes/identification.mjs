import { createModel } from "../utils/model.mjs";
import { getPrompts } from "../prompts/step-prompts.mjs";
import { repairJSON } from "../utils/json-repair.mjs";

const TITLE = "Identification du compte";

export async function identificationNode(state) {
  const model = createModel({ maxTokens: 768 });

  // Anchor the analysis on the canonical entity chosen by the user before launch,
  // so every downstream node speaks of EXACTLY that company (no fuzzy matching).
  const r = state.resolved || null;
  const anchor = r && r.linkedinSlug
    ? `\n\nIDENTIFIANT CANONIQUE (verrouillé par l'utilisateur) :\n- Nom officiel : ${r.canonicalName}\n- LinkedIn : ${r.linkedinUrl}\n- Slug : ${r.linkedinSlug}\nTu analyses STRICTEMENT cette entité, ni une autre.`
    : r && r.degraded
    ? `\n\nMode DÉGRADÉ : aucune correspondance LinkedIn n'a été trouvée pour "${state.company}". Indique clairement cette limite dans ta conclusion et reste prudent sur l'identification.`
    : "";

  const response = await model.invoke([
    { role: "system", content: getPrompts().identification },
    { role: "user", content: `Entreprise : ${state.company}\nFonction de l'interlocuteur : ${state.role}${anchor}` },
  ]);

  try {
    const parsed = repairJSON(response.content);
    console.log(`[node:identification] ✓`);
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
