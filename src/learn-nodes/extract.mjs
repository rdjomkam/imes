import { createModel } from "../utils/model.mjs";
import { repairJSON } from "../utils/json-repair.mjs";

const EXTRACT_PROMPT = `Tu es un analyste d'entreprise. À partir des résultats de recherche web fournis, extrais les informations clés sur l'entreprise demandée.

Tu dois identifier :
1. Le nom complet et le sigle/acronyme de l'entreprise
2. Son secteur d'activité principal
3. Son marché géographique (pays, région)
4. Ses services ou produits principaux (liste de 3-7 éléments)
5. Ses forces et avantages concurrentiels (liste de 3-5 éléments)
6. Ses fonctions cibles typiques chez ses clients (les interlocuteurs décisionnaires)
7. Ce qui la différencie de ses concurrents (paragraphe)
8. Le bloc de signature pour ses emails commerciaux

IMPORTANT : Base-toi UNIQUEMENT sur les informations trouvées dans les sources web. Si une information n'est pas disponible, indique "Non identifié dans les sources" plutôt que d'inventer.

CRITICAL OUTPUT FORMAT RULES:
- Your response MUST be a single JSON object starting with { and ending with }.
- Do NOT include any text, explanation, markdown, or code fences before or after the JSON.
- The very first character of your response must be { and the very last must be }.

Réponds avec ce JSON :
{
  "name": "Nom complet de l'entreprise",
  "shortName": "SIGLE",
  "sector": "Secteur d'activité",
  "market": "Marché géographique",
  "services": ["service 1", "service 2", ...],
  "strengths": ["force 1", "force 2", ...],
  "targetFunctions": ["Directeur des Achats", "DG", ...],
  "differentiators": "Paragraphe décrivant ce qui différencie cette entreprise...",
  "signatureBlock": "Bien cordialement,\\nNom de l'entreprise",
  "confidence": "high/medium/low — ton niveau de confiance dans les données extraites",
  "sourcesUsed": 5
}`;

export async function extractNode(state) {
  const name = state.companyName;
  const sources = state.webResults;

  if (sources.length === 0) {
    console.log(`[learn:extract] Aucune source — profil minimal`);
    return {
      extracted: {
        name: name,
        shortName: name.split(" ").map(w => w[0]).join("").toUpperCase(),
        sector: "Non identifié dans les sources",
        market: "Non identifié dans les sources",
        services: [],
        strengths: [],
        targetFunctions: [],
        differentiators: "Données insuffisantes pour identifier les différenciateurs.",
        signatureBlock: `Bien cordialement,\n${name}`,
        confidence: "low",
        sourcesUsed: 0,
      },
    };
  }

  const sourcesBlock = sources.map((r, i) =>
    `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
  ).join("\n\n");

  const model = createModel({ maxTokens: 2048 });

  const response = await model.invoke([
    { role: "system", content: EXTRACT_PROMPT },
    { role: "user", content: `Entreprise à analyser : ${name}\n\nRésultats de recherche web :\n\n${sourcesBlock}` },
  ]);

  try {
    const parsed = repairJSON(response.content);
    console.log(`[learn:extract] ✓ confidence=${parsed.confidence}, sources=${parsed.sourcesUsed}`);
    return { extracted: parsed };
  } catch (e) {
    console.error(`[learn:extract] ERROR: ${e.message}`);
    return {
      extracted: {
        name: name,
        shortName: name.split(" ").map(w => w[0]).join("").toUpperCase(),
        sector: "Extraction échouée",
        market: "Non identifié",
        services: [],
        strengths: [],
        targetFunctions: [],
        differentiators: "L'extraction automatique a échoué. Veuillez compléter manuellement.",
        signatureBlock: `Bien cordialement,\n${name}`,
        confidence: "low",
        sourcesUsed: 0,
      },
    };
  }
}
