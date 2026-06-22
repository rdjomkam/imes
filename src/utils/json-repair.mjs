export function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(c => c.text || c.content || "").join("");
  return String(content);
}

export function repairJSON(text) {
  let jsonStr = extractText(text);
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    let s = jsonMatch[0];
    const quotes = (s.match(/"/g) || []).length;
    if (quotes % 2 !== 0) s += '"';
    const opens = (s.match(/\{/g) || []).length;
    const closes = (s.match(/\}/g) || []).length;
    const arrOpens = (s.match(/\[/g) || []).length;
    const arrCloses = (s.match(/\]/g) || []).length;
    for (let i = 0; i < arrOpens - arrCloses; i++) s += "]";
    for (let i = 0; i < opens - closes; i++) s += "}";
    return JSON.parse(s);
  }
}
