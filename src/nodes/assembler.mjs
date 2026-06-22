import { createAssemblerModel } from "../utils/model.mjs";
import { getPrompts } from "../prompts/step-prompts.mjs";
import { repairJSON } from "../utils/json-repair.mjs";
import { getSignatureBlock } from "../prompts/system-base.mjs";
import { loadProfile } from "../utils/company-profile.mjs";

// The model invents its own closing/signature; enforce the profile's configured
// signatureBlock deterministically. Strip any trailing closing salutation the
// model added, then append the exact configured signature.
function applyConfiguredSignature(body, sig) {
  if (!sig) return body || "";
  if (!body) return sig;
  const closingRe = /\n+\s*(bien cordialement|cordialement|sincèrement|sincerement|respectueusement|bien à vous|bien a vous|meilleures salutations|salutations distinguées|salutations)\b[\s\S]*$/i;
  const trimmed = body.replace(closingRe, "").replace(/\s+$/, "");
  return trimmed + "\n\n" + sig;
}

export async function assemblerNode(state) {
  const stepsContext = state.steps
    .map((s, i) => `Étape ${i + 1} — ${s.title}:\nConclusion: ${s.conclusion}`)
    .join("\n\n");

  const webCtx = state.webResults.length > 0
    ? `\n\nSources web consultées :\n${state.webResults.map((r) => `- ${r.title} (${r.url}): ${r.content}`).join("\n")}`
    : "";

  const model = createAssemblerModel({ maxTokens: 8192 });

  const response = await model.invoke([
    { role: "system", content: getPrompts().assembler },
    { role: "user", content: `Entreprise : ${state.company}\nFonction : ${state.role}\n\n${stepsContext}${webCtx}\n\nProduis le dossier de stratégie commerciale en JSON.` },
  ]);

  try {
    const parsed = repairJSON(response.content);
    // Enforce the agent's configured email signature + sender (not the model's invention).
    if (parsed && typeof parsed === "object") {
      parsed.email = parsed.email || {};
      parsed.email.body = applyConfiguredSignature(parsed.email.body, getSignatureBlock());
      parsed.email.from = loadProfile().name;
    }
    console.log(`[node:assembler] ✓`);
    return { dossier: parsed };
  } catch (e) {
    console.error(`[node:assembler] ERROR: ${e.message}`);
    return { dossier: { error: true, message: e.message } };
  }
}
