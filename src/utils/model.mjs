// DeepSeek-only model factory.
//
// IMPORTANT: the API key / model are read at CALL TIME (inside the functions),
// not at module load. The previous version captured process.env at import time,
// which — because ES module imports are hoisted above server.mjs's loadEnv() —
// ran before .env was loaded, so DEEPSEEK_API_KEY looked empty and every call
// silently fell back to Claude (billing Anthropic). Reading at call time fixes
// that regardless of import order.
//
// There is intentionally NO Claude fallback: this agent must use DeepSeek only.
// If the key is missing we throw a clear error rather than quietly calling Claude.
import { ChatOpenAI } from "@langchain/openai";

let _logged = false;

function deepseek(maxTokens) {
  const key = process.env.DEEPSEEK_API_KEY || "";
  if (!key) {
    throw new Error(
      "DEEPSEEK_API_KEY manquant. L'agent est configuré pour DeepSeek UNIQUEMENT " +
      "(aucun appel Claude/Anthropic). Vérifie le fichier .env."
    );
  }
  const modelName = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!_logged) {
    _logged = true;
    console.log(`[model] Provider actif (runtime) : DeepSeek (${modelName}) — Claude/Anthropic désactivé`);
  }
  return new ChatOpenAI({
    model: modelName,
    apiKey: key,
    maxTokens,
    temperature: 0,
    configuration: { baseURL: "https://api.deepseek.com", apiKey: key },
  });
}

export function createModel({ maxTokens = 1024 } = {}) {
  return deepseek(maxTokens);
}

export function createAssemblerModel({ maxTokens = 4096 } = {}) {
  return deepseek(maxTokens);
}

export function modelLabel() {
  return `DeepSeek (${process.env.DEEPSEEK_MODEL || "deepseek-chat"})`;
}
