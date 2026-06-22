import { createModel } from "../utils/model.mjs";
import { repairJSON } from "../utils/json-repair.mjs";

const SYNTH_PROMPT = `Tu es un consultant en stratégie commerciale. Tu reçois un profil extrait automatiquement d'une entreprise. Ton rôle est de le RAFFINER et le COMPLÉTER pour qu'il serve de base à un agent d'intelligence commerciale.

L'agent utilisera ce profil pour :
- Analyser des comptes cibles et proposer des stratégies de prospection
- Identifier les concurrents du client sur chaque compte
- Rédiger des emails de prospection signés par cette entreprise
- Anticiper les objections que les prospects pourraient avoir

Tu dois donc t'assurer que :
1. Les SERVICES sont formulés de manière claire et commerciale (pas de jargon interne)
2. Les FORCES sont des avantages concurrentiels réels et exploitables
3. Les FONCTIONS CIBLES sont les décisionnaires pertinents chez les clients
4. Le DIFFÉRENCIATEUR est un paragraphe persuasif de 2-3 phrases
5. Le BLOC SIGNATURE est professionnel

Si des données sont manquantes ou marquées "Non identifié", propose des hypothèses raisonnables basées sur le secteur, mais marque-les avec "[hypothèse]".

CRITICAL OUTPUT FORMAT RULES:
- Your response MUST be a single JSON object starting with { and ending with }.
- Do NOT include any text before or after the JSON.

Réponds avec le profil final :
{
  "name": "Nom complet",
  "shortName": "SIGLE",
  "sector": "Secteur formulé de manière commerciale",
  "market": "Marché géographique",
  "services": ["service 1 (formulé commercialement)", ...],
  "strengths": ["force exploitable 1", ...],
  "targetFunctions": ["Fonction 1", "Fonction 2", ...],
  "differentiators": "Paragraphe de différenciation...",
  "signatureBlock": "Bien cordialement,\\nNom"
}`;

export async function synthesizeNode(state) {
  const extracted = state.extracted;

  if (!extracted || extracted.confidence === "low" && extracted.sourcesUsed === 0) {
    console.log(`[learn:synthesize] Données insuffisantes — profil minimal conservé`);
    const { confidence, sourcesUsed, ...profile } = extracted || {};
    return { profile: profile };
  }

  const model = createModel({ maxTokens: 2048 });

  const response = await model.invoke([
    { role: "system", content: SYNTH_PROMPT },
    { role: "user", content: `Profil extrait automatiquement :\n\n${JSON.stringify(extracted, null, 2)}` },
  ]);

  try {
    const parsed = repairJSON(response.content);
    // Remove any extra fields the LLM might add
    const profile = {
      name: parsed.name || extracted.name,
      shortName: parsed.shortName || extracted.shortName,
      sector: parsed.sector || extracted.sector,
      market: parsed.market || extracted.market,
      services: parsed.services || extracted.services || [],
      strengths: parsed.strengths || extracted.strengths || [],
      targetFunctions: parsed.targetFunctions || extracted.targetFunctions || [],
      differentiators: parsed.differentiators || extracted.differentiators || "",
      signatureBlock: parsed.signatureBlock || extracted.signatureBlock || `Bien cordialement,\n${parsed.name || extracted.name}`,
    };
    console.log(`[learn:synthesize] ✓ ${profile.name} (${profile.shortName}) — ${profile.services.length} services, ${profile.strengths.length} forces`);
    return { profile };
  } catch (e) {
    console.error(`[learn:synthesize] ERROR: ${e.message}`);
    const { confidence, sourcesUsed, ...profile } = extracted;
    return { profile };
  }
}
