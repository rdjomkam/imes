const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// ---------------------------------------------------------------------------
// .env loader (no external deps)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || "5174", 10);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

// ---------------------------------------------------------------------------
// MIME types for static serving
// ---------------------------------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function jsonRes(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function httpsPost(hostname, path, headers, body) {
  const https = require("https");
  headers["Content-Length"] = Buffer.byteLength(body);
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: "POST", headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf-8") });
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(new Error("timeout")); });
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Tavily web search
// ---------------------------------------------------------------------------
async function tavilySearch(query) {
  if (!TAVILY_API_KEY) return { results: [], sources: [] };
  try {
    const payload = JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
    });
    const resp = await httpsPost("api.tavily.com", "/search", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TAVILY_API_KEY}`,
    }, payload);
    const data = JSON.parse(resp.body);
    const results = (data.results || []).map((r) => ({
      title: r.title || "",
      url: r.url || "",
      content: (r.content || "").slice(0, 500),
    }));
    return { results, sources: results.map((r) => r.url) };
  } catch {
    return { results: [], sources: [] };
  }
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Tu es un agent d'intelligence commerciale pour IMES Consulting. Tu analyses des comptes entreprise pour préparer une approche commerciale dans le secteur pétrolier/énergétique au Cameroun.

RÈGLE ABSOLUE DE GOUVERNANCE : Tu travailles UNIQUEMENT au niveau ENTREPRISE et FONCTION. Tu ne collectes, n'infères et ne mentionnes JAMAIS d'informations sur la vie privée d'une personne nommée. Pas de nom propre de dirigeant, pas de profil personnel, pas de réseau social individuel.

Tu reçois le nom d'une entreprise et la fonction d'un interlocuteur. Tu dois produire une analyse structurée en JSON STRICT (pas de Markdown, pas de commentaires).

Le JSON de sortie doit suivre EXACTEMENT ce schéma :
{
  "steps": [
    { "title": "Identification du compte", "log": ["..."], "sources": [], "conclusion": "...", "alert": false },
    { "title": "Collecte du contexte public", "log": ["..."], "sources": ["url1", ...], "conclusion": "...", "alert": false },
    { "title": "Analyse des signaux récents", "log": ["..."], "sources": [], "conclusion": "...", "alert": true/false },
    { "title": "Lecture de la fonction visée", "log": ["..."], "sources": [], "conclusion": "...", "alert": false },
    { "title": "Définition de l'angle d'approche", "log": ["..."], "sources": [], "conclusion": "...", "alert": false },
    { "title": "Rédaction du plan de contact", "log": ["..."], "sources": [], "conclusion": "...", "alert": false },
    { "title": "Anticipation des objections", "log": ["..."], "sources": [], "conclusion": "...", "alert": false }
  ],
  "dossier": {
    "profil": "Description complète de l'entreprise",
    "signaux": [{ "text": "...", "source": "..." }, ...],
    "priorites": ["...", "..."],
    "angle": "Angle d'approche recommandé",
    "valeur": "Proposition de valeur détaillée",
    "email": { "subject": "...", "body": "..." },
    "objections": [{ "q": "...", "a": "..." }, ...],
    "next": "Prochaine action recommandée"
  }
}

Chaque step doit avoir 2-4 entrées dans log (phrases courtes décrivant l'action), des sources réelles quand disponibles (step 2 surtout), et une conclusion synthétique. Le champ alert=true signale un signal important.

Le dossier doit être actionnable, concret, adapté au contexte camerounais et au secteur de l'entreprise. L'email doit être professionnel, en français, prêt à envoyer. Les objections doivent avoir des réponses convaincantes.

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans aucun texte avant ou après.`;

async function callClaude(company, role, webResults) {
  const https = require("https");
  const contextBlock = webResults.length > 0
    ? `\n\nRésultats de recherche web sur "${company}" :\n${webResults.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`).join("\n\n")}`
    : "\n\nAucun résultat de recherche web disponible. Raisonne avec tes connaissances générales sur le tissu économique camerounais.";

  const userMsg = `Entreprise : ${company}\nFonction de l'interlocuteur : ${role}${contextBlock}\n\nProduis le JSON d'analyse.`;

  const body = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: userMsg }],
    system: SYSTEM_PROMPT,
  });

  console.log("[claude] payload:", body.length, "bytes");

  const resp = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
    }, (res) => {
      console.log("[claude] status:", res.statusCode);
      const chunks = [];
      res.on("data", (c) => { chunks.push(c); });
      res.on("end", () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf-8") });
      });
    });
    req.on("error", (e) => { console.log("[claude] error:", e.message); reject(e); });
    req.on("socket", (socket) => {
      socket.on("connect", () => console.log("[claude] socket connected"));
    });
    req.setTimeout(90000, () => {
      console.log("[claude] TIMEOUT 90s");
      req.destroy(new Error("timeout"));
    });
    req.end(body);
  });

  console.log("[claude] body length:", resp.body.length, "chars");
  console.log("[claude] body end:", JSON.stringify(resp.body.slice(-80)));

  if (resp.status !== 200) {
    throw new Error(`Claude API ${resp.status}: ${resp.body.slice(0, 300)}`);
  }

  const msg = JSON.parse(resp.body);
  const text = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  console.log("[claude] stop_reason:", msg.stop_reason, "text length:", text.length);

  // If output was truncated, try to repair the JSON
  let jsonStr = text;
  // Strip markdown fences if present
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Attempt repair: close open strings, arrays, objects
    let s = jsonMatch[0];
    // Close any unclosed string
    const quotes = (s.match(/"/g) || []).length;
    if (quotes % 2 !== 0) s += '"';
    // Count brackets
    const opens = (s.match(/\{/g) || []).length;
    const closes = (s.match(/\}/g) || []).length;
    const arrOpens = (s.match(/\[/g) || []).length;
    const arrCloses = (s.match(/\]/g) || []).length;
    for (let i = 0; i < arrOpens - arrCloses; i++) s += "]";
    for (let i = 0; i < opens - closes; i++) s += "}";
    console.log("[claude] repaired JSON, added", opens - closes, "} and", arrOpens - arrCloses, "]");
    parsed = JSON.parse(s);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// POST /api/agent
// ---------------------------------------------------------------------------
async function handleAgent(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch {
    return jsonRes(res, 400, { error: "JSON invalide", code: "BAD_REQUEST" });
  }

  const company = (input.company || "").trim();
  const role = (input.role || "").trim();
  if (!company || !role) {
    return jsonRes(res, 400, { error: "company et role requis", code: "MISSING_FIELDS" });
  }

  if (!ANTHROPIC_API_KEY) {
    return jsonRes(res, 503, { error: "Clé API Anthropic non configurée", code: "NO_API_KEY" });
  }

  try {
    console.log("[agent] recherche web…");
    const { results: webResults, sources } = await tavilySearch(`${company} Cameroun entreprise`);
    console.log(`[agent] ${webResults.length} résultats web, appel Claude (${CLAUDE_MODEL})…`);
    const analysis = await callClaude(company, role, webResults);
    console.log("[agent] réponse Claude reçue ✓");

    if (analysis.steps && analysis.steps[1] && sources.length > 0) {
      analysis.steps[1].sources = sources;
    }

    jsonRes(res, 200, {
      account: { company, role },
      live: true,
      steps: analysis.steps || [],
      dossier: analysis.dossier || {},
    });
  } catch (err) {
    console.error("[agent]", err.message);
    jsonRes(res, 503, { error: err.message, code: "AGENT_ERROR" });
  }
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
const FETCH_PATCH = `<script>
(function(){
  var _f=window.fetch;
  window.fetch=function(url,opts){
    if(typeof url==='string'&&url.indexOf('/api/agent')!==-1&&opts&&opts.signal){
      var c=new AbortController();
      setTimeout(function(){c.abort();},120000);
      opts=Object.assign({},opts,{signal:c.signal});
    }
    return _f.call(this,url,opts);
  };
})();
</script>`;

const GOV_HIDE = `<script>setInterval(function(){document.querySelectorAll('span').forEach(function(el){if(el.textContent.indexOf('FICTIVES')!==-1)el.style.display='none';});},200);</script>`;

function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  filePath = path.join(__dirname, "public", filePath);

  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    if (filePath.endsWith("index.html")) {
      let html = data.toString("utf-8");
      html = html.replace("<head>", "<head>" + FETCH_PATCH + GOV_HIDE);
      res.writeHead(200, { "Content-Type": mime });
      res.end(html);
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.method === "POST" && req.url === "/api/agent") {
    return handleAgent(req, res);
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  IMES Agent — http://localhost:${PORT}`);
  console.log(`  Modèle : ${CLAUDE_MODEL}`);
  console.log(`  API Key : ${ANTHROPIC_API_KEY ? "✓ configurée" : "✗ manquante (repli scénarisé)"}`);
  console.log(`  Tavily  : ${TAVILY_API_KEY ? "✓ configurée" : "✗ manquante (pas de recherche web)"}\n`);
});
