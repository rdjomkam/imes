# Claude Design Prompt — Learn Pipeline UI (Company Onboarding)

## Context

I have a **Commercial Account Intelligence Agent** — a multi-agent AI system that analyzes target companies and produces sales strategy dossiers. The agent works on behalf of a "reference company" (the client using the tool).

There is already a **main pipeline UI** (dark navy theme, step-by-step stepper with progress) for analyzing target accounts. Now I need a **separate "Learn" UI** — a screen where users onboard their own company into the system. The Learn pipeline researches the company online and auto-generates a company profile that the agent will use for all future analyses.

## How the Learn pipeline works

**API endpoint**: `POST /api/learn` with `{"companyName": "ACME Corp"}`

**SSE events streamed back**:
```
data: {"type":"start","companyName":"ACME Corp"}
data: {"type":"step","node":"research","index":0,"total":3}
data: {"type":"info","message":"18 sources collectées"}
data: {"type":"step","node":"extract","index":1,"total":3}
data: {"type":"info","message":"Confiance: high"}
data: {"type":"step","node":"synthesize","index":2,"total":3}
data: {"type":"profile","profile":{...the full profile object...}}
data: {"type":"complete"}
```

**The 3 steps**:
1. **Recherche Web** (research) — Searches 3 Tavily queries, collects up to 30 web sources about the company
2. **Extraction** (extract) — AI reads all sources and extracts structured company data
3. **Synthèse** (synthesize) — AI refines into a polished commercial profile

**The profile object produced**:
```json
{
  "name": "TotalEnergies Marketing Cameroun",
  "shortName": "TotalEnergies Cameroun",
  "sector": "Énergie et Distribution de Produits Pétroliers",
  "market": "Cameroun",
  "services": [
    "Distribution de carburants via 190 stations-service",
    "Vente de lubrifiants haute performance",
    "Solutions solaires décentralisées",
    "Distribution B2B de produits pétrochimiques"
  ],
  "strengths": [
    "Premier réseau de distribution (190 stations)",
    "Ressources d'un groupe Fortune 500",
    "Offre diversifiée incluant transition bas carbone"
  ],
  "targetFunctions": [
    "Directeur des Achats",
    "Responsable Approvisionnement",
    "Directeur Opérationnel"
  ],
  "differentiators": "TotalEnergies Marketing Cameroun est le leader incontesté...",
  "signatureBlock": "Cordialement,\nTotalEnergies Marketing Cameroun"
}
```

**There is also**:
- `GET /api/profile` — returns the current active profile
- `POST /api/profile` — manually save/update a profile

## What the Learn UI needs

### Screen 1: Entry point (before learning)

A clean, centered page with:
- **Headline**: "Configurer votre Agent" or "Apprentissage de l'Agent"
- **Subheadline**: "Renseignez votre entreprise. L'agent va la rechercher sur le web et apprendre à vendre pour vous."
- **Single input field**: Company name (large, prominent)
  - Placeholder: "Nom de votre entreprise..."
  - Example hint below: "Ex: IMES Consulting, TotalEnergies Cameroun, Dangote Cement"
- **CTA button**: "Lancer l'apprentissage" (red/accent)
- **Below the CTA**: If a profile already exists, show a small card with the current active profile:
  - "Profil actif : **IMES Consulting** — Services aux entreprises industrielles"
  - Small "Modifier" and "Réapprendre" links

### Screen 2: Learning in progress (SSE streaming)

When the user clicks "Lancer l'apprentissage":
- **3-step progress indicator** (horizontal stepper, similar to the main pipeline):
  1. 🔍 **Recherche Web** — "Collecte de sources publiques..."
  2. 🧠 **Extraction** — "Analyse des données collectées..."
  3. ✨ **Synthèse** — "Construction du profil commercial..."
- Each step shows:
  - A spinner while running
  - A checkmark when complete
  - The info message from SSE below the step label (e.g., "18 sources collectées", "Confiance: high")
- **Live log panel** (optional, collapsible): Shows raw SSE events as they arrive — similar to the "Journal d'exécution" in the main pipeline
- Estimated time: ~15-20 seconds total

### Screen 3: Profile review (after learning completes)

When the `complete` event arrives, transition to a **profile review card**:

**Header**: 
- Company name large + shortName badge
- "✓ Profil généré avec succès" in green
- Confidence badge (high = green, medium = amber, low = red)

**Profile sections displayed as editable cards**:

1. **Identité**
   - Nom complet (editable text field)
   - Sigle (editable)
   - Secteur (editable)
   - Marché (editable)

2. **Services** (editable list — each item is a tag/pill that can be edited or removed, with an "Ajouter" button)

3. **Forces concurrentielles** (same editable list format)

4. **Fonctions cibles** (same editable list format)

5. **Différenciation** (editable textarea — the main value proposition paragraph)

6. **Signature email** (editable textarea — shown in a mini email preview format)

**Action buttons at the bottom**:
- **"Valider et activer"** (primary red CTA) — saves the profile via `POST /api/profile` and redirects to the main agent page
- **"Réapprendre"** — re-runs the learn pipeline
- **"Annuler"** — goes back without saving

### Navigation

- The Learn UI should be accessible from the main agent page via a **gear/settings icon** or a "Configurer l'agent" link in the header
- The main agent page header should show the current active company name (from `GET /api/profile`)
- First-time users (no profile) should be redirected to the Learn UI automatically

## Design requirements

### Visual identity (must match the main app)
- **Dark navy/midnight background**: #0f1729 or similar deep blue-black
- **Accent colors**: Red (#E63946) for primary CTAs, Emerald green (#10B981) for success states, Amber (#F59E0B) for medium confidence, light blue for info
- **Cards**: Glassmorphism style — semi-transparent backgrounds with soft borders (rgba(255,255,255,0.08)), subtle backdrop-blur
- **Typography**: Clean sans-serif (Inter or system font), white text on dark
- **The stepper** should feel like the main pipeline stepper — consistent visual language

### Key UX principles
- **Wizard flow**: Entry → Progress → Review. One thing at a time, no overwhelm.
- **Editable profile**: The AI generates a first draft, but the user can edit everything before activating. This builds trust — they see what the agent learned and can correct it.
- **Confidence signal**: If the AI couldn't find much online (low confidence), show a prominent warning: "Profil partiellement généré — complétez les champs manquants manuellement."
- **Instant gratification**: From typing a company name to seeing a full profile should take ~20 seconds. The progress stepper makes the wait feel productive.
- **Professional tone**: This is a B2B tool for CEOs. No playfulness — clean, efficient, trustworthy.

### Technical constraints
- This is a **self-contained HTML page** (can be a separate route like `/learn` or a modal/overlay on the main page)
- Must use `fetch()` with SSE (`EventSource` or manual parsing) to consume the `/api/learn` endpoint
- Must call `GET /api/profile` on load to show current active profile
- Must call `POST /api/profile` to save edited profile
- French language for all labels
- Responsive for 13" laptop demo (1440x900)

## Deliverable

Design a complete, self-contained HTML page implementing the Learn UI with all 3 screens (entry, progress, review). Include:
- All CSS inline (dark theme matching the main app)
- JavaScript for SSE streaming, profile editing, and API calls
- Sample data for the profile review screen (use TotalEnergies Cameroun as example)
- Smooth transitions between the 3 screens (fade/slide)

The page should work standalone at `/learn.html` and be demo-ready.
