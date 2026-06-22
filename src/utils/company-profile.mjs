import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, "../../company-profile.json");

// Resolves the active profile path. In production (Coolify, Docker, …) you can
// mount a persistent volume and set `PROFILE_PATH=/data/company-profile.json`
// — the seed file from the image gets copied on first use so the app starts
// with the IMES default, then any /api/profile POST persists on the volume.
function resolvePath() {
  const p = (process.env.PROFILE_PATH || "").trim();
  if (!p) return SEED_PATH;
  try {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.copyFileSync(SEED_PATH, p);
    }
  } catch (e) {
    console.error("[profile] could not seed PROFILE_PATH:", e.message, "— falling back to bundled file");
    return SEED_PATH;
  }
  return p;
}
const PROFILE_PATH = resolvePath();

let _cache = null;

export function loadProfile() {
  if (_cache) return _cache;
  const raw = fs.readFileSync(PROFILE_PATH, "utf-8");
  _cache = JSON.parse(raw);
  return _cache;
}

export function saveProfile(profile) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2) + "\n", "utf-8");
  _cache = profile;
}

export function clearCache() {
  _cache = null;
}
