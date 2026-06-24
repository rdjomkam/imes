// Company disambiguation — Phase 0 (Tavily-only).
// Returns LinkedIn candidates for a free-text company query so the user can pick
// THE exact one before the pipeline runs. Phase 1 will add Apify alongside.

const TAVILY_URL = "https://api.tavily.com/search";

async function tavilySearch(query, { maxResults = 8, includeDomains } = {}) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY manquant");
  const body = { api_key: key, query, max_results: maxResults, search_depth: "basic" };
  if (includeDomains) body.include_domains = includeDomains;
  const res = await fetch(TAVILY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`tavily ${res.status}: ${await res.text().catch(() => "")}`.slice(0, 200));
  const j = await res.json();
  return j.results || [];
}

function extractLinkedInSlug(url) {
  const m = String(url || "").match(/linkedin\.com\/(?:company|school)\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

// Pull the company name from a LinkedIn slug as a clean fallback when the
// scraped title is a description rather than a short brand name.
function slugToName(slug) {
  return String(slug || "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cleanTitle(title, slug) {
  let t = String(title || "")
    // strip the LinkedIn suffix
    .replace(/\s*[\|\-–]\s*LinkedIn.*$/i, "")
    .replace(/\s*\| Company Page on LinkedIn.*$/i, "")
    .trim();
  // If the title contains a separator (e.g. "TotalEnergies - Multi-energy …"),
  // keep what's before the first long separator to expose just the brand.
  const m = t.match(/^([^|–:]+?)(?:\s+[-—]\s+|\s*[|–:]\s*)(.{15,})$/);
  if (m && m[1].length >= 2 && m[1].length <= 80) t = m[1].trim();
  // If the title is still too long or empty, fall back to the slug as Title Case.
  if (!t || t.length > 80) t = slug ? slugToName(slug) : t;
  return t;
}

// Lightweight similarity for the auto-select heuristic.
function similarity(a, b) {
  a = String(a || "").toLowerCase().trim();
  b = String(b || "").toLowerCase().trim();
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  // Token overlap (Jaccard on words ≥ 3 chars)
  const ta = new Set(a.split(/\W+/).filter((w) => w.length >= 3));
  const tb = new Set(b.split(/\W+/).filter((w) => w.length >= 3));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export async function searchCompanies(rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) return { candidates: [], autoSelect: null };

  // Two passes to maximize recall: restricted to linkedin.com first (highest
  // signal), then a broader pass with the explicit "linkedin.com/company"
  // operator (Tavily sometimes ignores include_domains for niche queries).
  let results = [];
  try {
    const passA = await tavilySearch(`${query} LinkedIn company`, {
      maxResults: 8,
      includeDomains: ["linkedin.com"],
    });
    const passB = await tavilySearch(`${query} site:linkedin.com/company`, { maxResults: 6 });
    // Merge by url, keep order from passA first.
    const seenUrl = new Set();
    for (const r of [...passA, ...passB]) {
      if (!r.url || seenUrl.has(r.url)) continue;
      seenUrl.add(r.url);
      results.push(r);
    }
  } catch (e) {
    console.error("[company-search] tavily error:", e.message);
  }

  // Dedup by slug, keep order (Tavily returns by relevance).
  const seen = new Set();
  const candidates = [];
  for (const r of results) {
    const slug = extractLinkedInSlug(r.url);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    candidates.push({
      canonicalName: cleanTitle(r.title, slug) || query,
      linkedinSlug: slug,
      linkedinUrl: r.url,
      summary: r.content || "",
      source: "linkedin",
    });
  }

  // Auto-select heuristic.
  let autoSelect = null;
  if (candidates.length === 1) {
    if (similarity(candidates[0].canonicalName, query) >= 0.6) autoSelect = candidates[0];
  } else if (candidates.length >= 2) {
    const topSim = similarity(candidates[0].canonicalName, query);
    const nextSim = similarity(candidates[1].canonicalName, query);
    if (topSim >= 0.9 && topSim - nextSim >= 0.3) autoSelect = candidates[0];
  }

  return { candidates: candidates.slice(0, 10), autoSelect };
}
