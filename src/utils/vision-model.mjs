// Claude multimodal (vision / PDF) — used ONLY by the document agents (/api/document).
// The account & learn pipelines stay strictly DeepSeek-only (src/utils/model.mjs is
// untouched). Claude is reintroduced here because DeepSeek's chat API has no vision.
//
// Direct call to the Anthropic Messages API (full control over image/document blocks,
// no LangChain multimodal quirks). Key/model read at call time.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
let _logged = false;

// Build a multimodal content block for a base64 file (image or PDF).
export function fileBlock(base64, mime) {
  const m = (mime || "").toLowerCase();
  if (m === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
  }
  const media = /^image\//.test(m) ? m : "image/png";
  return { type: "image", source: { type: "base64", media_type: media, data: base64 } };
}

export async function callVision({ system, blocks, maxTokens = 4096 }) {
  const key = process.env.ANTHROPIC_API_KEY || "";
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY manquant — requis pour les agents documentaires (vision Claude).");
  }
  const model = process.env.VISION_MODEL || process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
  if (!_logged) {
    _logged = true;
    console.log(`[vision] Provider documentaire (multimodal) : Claude (${model})`);
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: blocks }],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}
