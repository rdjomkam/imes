import crypto from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = crypto.webcrypto;

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { buildGraph } from "./src/graph.mjs";
import { buildLearnGraph } from "./src/learn-graph.mjs";
import { loadProfile, saveProfile, clearCache } from "./src/utils/company-profile.mjs";
import { callVision, fileBlock } from "./src/utils/vision-model.mjs";
import { getDocumentPrompt, EXTRACT_PROMPT, RAPPORT_QA_PROMPT } from "./src/prompts/document-prompts.mjs";
import { repairJSON } from "./src/utils/json-repair.mjs";
import { createModel } from "./src/utils/model.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// .env loader
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
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

// ---------------------------------------------------------------------------
// Compile LangGraph once at startup
// ---------------------------------------------------------------------------
const app = buildGraph();

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
  ".pdf": "application/pdf",
  ".webp": "image/webp",
  ".mjs": "application/javascript; charset=utf-8",
  ".bcmap": "application/octet-stream",
  ".ftl": "text/plain; charset=utf-8",
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

// ---------------------------------------------------------------------------
// POST /api/agent — LangGraph pipeline with SSE streaming
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

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  function sse(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    console.log(`[agent] LangGraph pipeline (streaming) — ${company} / ${role}`);
    const stream = await app.stream({ company, role }, { streamMode: "updates" });
    const allSteps = [];
    let dossier = null;
    let webResults = [];

    for await (const chunk of stream) {
      const nodeName = Object.keys(chunk)[0];
      if (nodeName === "__start__" || nodeName === "__end__") continue;
      const nodeData = chunk[nodeName];

      if (nodeName === "contexte" && nodeData.webResults) {
        webResults = nodeData.webResults;
      }

      if (nodeName === "assembler") {
        dossier = nodeData.dossier;
        console.log(`[node:assembler] ✓`);
      } else if (nodeData.steps) {
        allSteps.push(nodeData.steps);
        sse({ type: "step", index: allSteps.length - 1, node: nodeName, step: nodeData.steps });
        console.log(`[node:${nodeName}] ✓ (streamed)`);
      }
    }

    console.log(`[agent] pipeline terminé ✓ (${allSteps.length} étapes)`);
    sse({
      type: "complete",
      account: { company, role },
      live: true,
      steps: allSteps,
      dossier: dossier || {},
      webResults,
    });
  } catch (err) {
    console.error("[agent]", err.message);
    sse({ type: "error", error: err.message, code: "AGENT_ERROR" });
  }

  res.end();
}

// ---------------------------------------------------------------------------
// POST /api/learn — Learn pipeline: research a company and generate profile
// ---------------------------------------------------------------------------
async function handleLearn(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch {
    return jsonRes(res, 400, { error: "JSON invalide" });
  }

  const companyName = (input.companyName || "").trim();
  if (!companyName) {
    return jsonRes(res, 400, { error: "companyName requis" });
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const sse = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  console.log(`[learn] Démarrage pipeline d'apprentissage — ${companyName}`);
  sse({ type: "start", companyName });

  try {
    const learnApp = buildLearnGraph();
    const nodeNames = ["research", "extract", "synthesize"];
    let nodeIndex = 0;

    for await (const event of await learnApp.stream(
      { companyName },
      { streamMode: "updates" }
    )) {
      for (const [nodeName, output] of Object.entries(event)) {
        sse({
          type: "step",
          node: nodeName,
          index: nodeIndex,
          total: nodeNames.length,
        });

        if (nodeName === "research" && output.webResults) {
          sse({ type: "info", message: `${output.webResults.length} sources collectées` });
        }

        if (nodeName === "extract" && output.extracted) {
          sse({ type: "info", message: `Confiance: ${output.extracted.confidence || "n/a"}` });
        }

        if (nodeName === "synthesize" && output.profile) {
          // Auto-save the profile
          saveProfile(output.profile);
          clearCache();
          console.log(`[learn] ✓ Profil sauvegardé: ${output.profile.name} (${output.profile.shortName})`);
          sse({ type: "profile", profile: output.profile });
        }

        nodeIndex++;
      }
    }

    sse({ type: "complete" });
  } catch (err) {
    console.error("[learn]", err.message);
    sse({ type: "error", error: err.message });
  }

  res.end();
}

// ---------------------------------------------------------------------------
// POST /api/document — document agents (multimodal Claude vision). One call →
// { type, live, steps[], result{} }. 503 on failure → front falls back to repli.
// ---------------------------------------------------------------------------
async function handleDocument(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch {
    return jsonRes(res, 400, { error: "JSON invalide", code: "BAD_REQUEST" });
  }

  const type = (input.type || "").trim();

  // ---- Follow-up Q&A (rapport interactif) : DeepSeek répond à partir de la transcription ----
  if (input.followup) {
    const question = (input.question || "").trim();
    const extracted = input.extracted || "";
    if (!question || !extracted) return jsonRes(res, 400, { error: "question et extracted requis" });
    try {
      const model = createModel({ maxTokens: 1024 });
      const resp = await model.invoke([
        { role: "system", content: RAPPORT_QA_PROMPT },
        { role: "user", content: `Transcription du rapport (spécimen) :\n\n${extracted}\n\nQuestion : ${question}` },
      ]);
      const parsed = repairJSON(resp.content);
      console.log(`[document] ${type} · Q&A DeepSeek ✓`);
      return jsonRes(res, 200, { answer: parsed.answer || "", pages: Array.isArray(parsed.pages) ? parsed.pages : [] });
    } catch (err) {
      console.error("[document:qa]", err.message);
      return jsonRes(res, 503, { error: err.message, code: "QA_ERROR" });
    }
  }

  let file = input.file || "";
  const mime = (input.mime || "").trim();
  const filename = (input.filename || "spécimen").trim();
  if (!type || !file || !mime) {
    return jsonRes(res, 400, { error: "type, file et mime requis", code: "MISSING_FIELDS" });
  }
  // strip a data-URL prefix if present
  const comma = file.indexOf("base64,");
  if (file.startsWith("data:") && comma !== -1) file = file.slice(comma + 7);

  try {
    console.log(`[document] ${type} — ${filename} (${mime}, ${Math.round(file.length / 1365)} Ko approx)`);

    // Étape 1 — VISION (Claude) : lecture/transcription fidèle, sans analyse.
    const extracted = await callVision({
      system: EXTRACT_PROMPT,
      blocks: [
        fileBlock(file, mime),
        { type: "text", text: `Transcris fidèlement et intégralement ce document (« ${filename} », spécimen).` },
      ],
      maxTokens: 4096,
    });
    console.log(`[document] ${type} · lecture Claude ✓ (${extracted.length} car.)`);

    // Étape 2 — ANALYSE (DeepSeek) : raisonnement + structuration à partir de la transcription.
    const model = createModel({ maxTokens: 4096 });
    const resp = await model.invoke([
      { role: "system", content: getDocumentPrompt(type) },
      { role: "user", content: `Contenu intégral extrait du document « ${filename} » (transcription fidèle, spécimen fictif) :\n\n${extracted}\n\nProduis le résultat en JSON strict selon le schéma.` },
    ]);
    const parsed = repairJSON(resp.content);
    console.log(`[document] ${type} · analyse DeepSeek ✓ (${(parsed.steps || []).length} étapes)`);

    const pages = (extracted.match(/===\s*PAGE\s+\d+/gi) || []).length || undefined;
    return jsonRes(res, 200, {
      type,
      live: true,
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      result: parsed.result || {},
      meta: parsed.meta || (pages ? { pages } : undefined),
      extracted, // pour les questions de suivi (rapport) — texte, transmis par le harnais
    });
  } catch (err) {
    console.error("[document]", err.message);
    return jsonRes(res, 503, { error: err.message, code: "DOCUMENT_ERROR" });
  }
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
const STREAM_JS = fs.readFileSync(path.join(__dirname, "public", "js", "stream.js"), "utf-8");
const DATA_JS = fs.readFileSync(path.join(__dirname, "public", "js", "data.js"), "utf-8");
const RESULTS_INJECT_JS = fs.readFileSync(path.join(__dirname, "public", "js", "results-inject.js"), "utf-8");
const IDB_JS = fs.readFileSync(path.join(__dirname, "public", "js", "idb.js"), "utf-8");
const IDB_PROFILES_JS = fs.readFileSync(path.join(__dirname, "public", "js", "idb-profiles.js"), "utf-8");
const DOC_HARNESS_JS = fs.readFileSync(path.join(__dirname, "public", "js", "doc-harness.js"), "utf-8");
const IDB_SCRIPT = `<script>${IDB_JS}</script>`;
const IDB_PROFILES_SCRIPT = `<script>${IDB_PROFILES_JS}</script>`;
const DOC_HARNESS_SCRIPT = `<script>${DOC_HARNESS_JS}</script>`;
// Claude-designed document bundles → { served file : { type, specimen } }
const DOC_BUNDLES = {
  "credit.html": { type: "credit", specimen: "/specimens/credit.pdf" },
  "rapport.html": { type: "rapport", specimen: "/specimens/rapport.pdf" },
  "offre.html": { type: "offre", specimen: "/specimens/offre.pdf" },
  "manifeste.html": { type: "manifeste", specimen: "/specimens/manifeste.pdf" },
};
// idb.js must load before stream.js (which calls window.IMESIDB on submit).
const STREAM_SCRIPT = `${IDB_SCRIPT}<script>${DATA_JS}</script><script>${STREAM_JS}</script>`;
const RESULTS_SCRIPT = `<script>${RESULTS_INJECT_JS}</script>`;

// Hide the "DÉMO · DONNÉES FICTIVES" badge and any leaf element mentioning
// "fictives". The badge in the design bundles is a <span> wrapping a small
// decorative span — its trimmed textContent matches the literal phrase, so we
// match it exactly. We also strip out any leaf text mentioning "fictives" to
// catch hardcoded footer disclaimers in the older bundles.
const GOV_HIDE = `<script>setInterval(function(){var sel=document.querySelectorAll('span,div,p,small,li,footer');for(var i=0;i<sel.length;i++){var el=sel[i];var t=(el.textContent||'').replace(/\\s+/g,' ').trim();if(t==='D\\u00c9MO \\u00b7 DONN\\u00c9ES FICTIVES'||t==='DEMO \\u00b7 DONNEES FICTIVES'){el.style.display='none';continue;}if(el.children.length===0&&/fictives/i.test(t)){el.style.display='none';}}},200);</script>`;

const LOGO_INJECT = `<script>setInterval(function(){var hdr=document.querySelectorAll('header,nav,[class*="header"],[class*="nav"],[class*="topbar"]');for(var i=0;i<hdr.length;i++){var els=hdr[i].querySelectorAll('span,div');for(var j=0;j<els.length;j++){var t=els[j].textContent.replace(/\\s+/g,' ').trim();if(t==='IMES'||t==='IMES Consulting'||t==='IMESConsulting'){var a=document.createElement('a');a.href='/';a.style.cssText='display:inline-flex;align-items:center;text-decoration:none;flex:none;';var img=document.createElement('img');img.src='/imes-logo.png';img.alt='IMES Consulting';img.style.cssText='height:38px;object-fit:contain;';a.appendChild(img);els[j].parentNode.replaceChild(a,els[j]);if(t==='IMES'){var next=a.nextElementSibling;if(next&&next.textContent.trim()==='Consulting')next.style.display='none';}return}}}},300);</script>`;

// New display/body fonts (replace the AI-looking serif) + proportional button
// sizing on small screens. The bundler replaces the document on load (wiping any
// static <link>/<style> we inject), but a script's setInterval keeps running — so
// we (re)append the font <link> + override <style> via a persisting script, the
// same mechanism LOGO_INJECT relies on. !important wins over the bundles' own
// --font-display / --font-body custom properties regardless of order.
const UI_OVERRIDES = `<script>(function(){var CSS=":root{--font-display:'Plus Jakarta Sans','Inter',system-ui,-apple-system,sans-serif !important;--font-body:'Inter',system-ui,-apple-system,sans-serif !important}.imes-app .imes-fade-in:not(.imes-scroll){justify-content:safe center !important}"`
  + `+"@media (max-width:768px){.imes-topbar .imes-no-print button{display:inline-flex !important;padding:8px 12px !important;font-size:13px !important}}"`
  + `+"@media (max-width:520px){.imes-topbar .imes-no-print{flex-wrap:wrap !important;gap:6px !important;justify-content:flex-start !important}.imes-topbar .imes-no-print button{padding:7px 10px !important;font-size:12px !important;gap:5px !important}.imes-app button{font-size:14px !important}}"`
  + `+".imes-app div[style*='1fr 1fr']>*{min-width:0 !important}@media (min-width:761px){.imes-app div[style*='1fr 1fr']{grid-template-columns:minmax(0,1fr) minmax(0,1fr) !important}}";`
  + `function ensure(){var h=document.head||document.documentElement;if(!document.getElementById('imes-fonts-link')){var l=document.createElement('link');l.id='imes-fonts-link';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap';h.appendChild(l);}if(!document.getElementById('imes-font-style')){var s=document.createElement('style');s.id='imes-font-style';s.textContent=CSS;h.appendChild(s);}}ensure();setInterval(ensure,300);})();</script>`;

function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = parsed.pathname === "/" ? "/landing.html" : parsed.pathname;
  filePath = path.join(__dirname, "public", filePath);

  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    if (filePath.endsWith("agent.html")) {
      let html = data.toString("utf-8");
      html = html.replace("<head>", "<head>" + UI_OVERRIDES + STREAM_SCRIPT + GOV_HIDE + LOGO_INJECT);
      res.writeHead(200, { "Content-Type": mime });
      res.end(html);
      return;
    }
    if (filePath.endsWith("results.html")) {
      let html = data.toString("utf-8");
      html = html.replace("<head>", "<head>" + UI_OVERRIDES + RESULTS_SCRIPT + GOV_HIDE + LOGO_INJECT);
      res.writeHead(200, { "Content-Type": mime });
      res.end(html);
      return;
    }
    if (filePath.endsWith("learn.html")) {
      let html = data.toString("utf-8");
      html = html.replace("<head>", "<head>" + UI_OVERRIDES + IDB_SCRIPT + IDB_PROFILES_SCRIPT + LOGO_INJECT);
      res.writeHead(200, { "Content-Type": mime });
      res.end(html);
      return;
    }
    const docBundle = DOC_BUNDLES[path.basename(filePath)];
    if (docBundle) {
      let html = data.toString("utf-8");
      const cfg = `<script>window.IMES_DOC_CFG=${JSON.stringify(docBundle)};</script>`;
      html = html.replace("<head>", "<head>" + IDB_SCRIPT + cfg + DOC_HARNESS_SCRIPT + GOV_HIDE + LOGO_INJECT);
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

  if (req.method === "POST" && req.url === "/api/learn") {
    return handleLearn(req, res);
  }

  if (req.method === "POST" && req.url === "/api/document") {
    return handleDocument(req, res);
  }

  if (req.method === "GET" && req.url === "/api/profile") {
    return jsonRes(res, 200, loadProfile());
  }

  if (req.method === "POST" && req.url === "/api/profile") {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.name || !body.shortName) {
        return jsonRes(res, 400, { error: "name et shortName requis" });
      }
      saveProfile(body);
      clearCache();
      console.log(`[profile] Mis à jour : ${body.name} (${body.shortName})`);
      return jsonRes(res, 200, { ok: true, profile: body });
    } catch (e) {
      return jsonRes(res, 400, { error: e.message });
    }
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  const provider = DEEPSEEK_KEY ? `DeepSeek (${DEEPSEEK_MODEL})` : `Claude (${CLAUDE_MODEL})`;
  const profile = loadProfile();
  console.log(`\n  Agent d'Intelligence Commerciale — http://localhost:${PORT}`);
  console.log(`  Entreprise : ${profile.name} (${profile.shortName})`);
  console.log(`  Modèle    : ${provider}`);
  console.log(`  API Key   : ${(DEEPSEEK_KEY || ANTHROPIC_API_KEY) ? "✓ configurée" : "✗ manquante (repli scénarisé)"}`);
  console.log(`  Tavily    : ${TAVILY_API_KEY ? "✓ configurée" : "✗ manquante (pas de recherche web)"}`);
  console.log(`  Pipeline  : 9 nœuds LangGraph (8 agents + assembleur) — parallel fan-out`);
  console.log(`  Profil    : GET/POST /api/profile\n`);
});
