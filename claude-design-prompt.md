# Claude Design Prompt — IMES Dossier Results Page Redesign

## Context

I have a **Commercial Account Intelligence Agent** demo app for IMES Consulting (B2B energy/industrial services in Cameroon). The app runs a multi-agent AI pipeline that analyzes a target company and produces a "Dossier de Strategie Commerciale" — a one-page results report for CEOs.

The current results page works but looks generic, dense, and hard to scan. I need a **premium, executive-grade redesign** that makes a CEO go "wow" during a live demo.

## What the page shows

The dossier page receives a JSON object with these fields and renders them as a single scrollable page:

```json
{
  "score": 72,                          // 0-100 opportunity score
  "potentiel_ca": "45-90M FCFA/an",    // estimated revenue potential
  "profil": "Long paragraph...",         // company profile description
  "signaux": [                           // recent signals
    { "text": "description", "source": "url or context" }
  ],
  "priorites": ["priority 1", "priority 2", ...],
  "concurrents": [                       // competitive map
    { "nom": "Name", "position": "Leader/Challenger/Local", "faiblesse": "exploitable weakness" }
  ],
  "angle": "Paragraph...",              // recommended approach angle
  "valeur": "Paragraph...",             // value proposition
  "email": {                             // ready-to-send email
    "subject": "email subject",
    "body": "full email body in French"
  },
  "objections": [                        // anticipated objections
    { "q": "objection question", "a": "prepared answer" }
  ],
  "timeline": [                          // 90-day engagement plan
    { "horizon": "J+30", "action": "...", "objectif": "..." },
    { "horizon": "J+60", "action": "...", "objectif": "..." },
    { "horizon": "J+90", "action": "...", "objectif": "..." }
  ],
  "next": "Immediate next action"
}
```

The page also shows:
- **Header**: company name (h1), interlocutor function badge, IMES logo
- **Action buttons**: "Imprimer", "Nouveau compte", "Rejouer"
- **Web sources section**: list of verified web sources with URLs and snippets
- **Footer**: "Dossier genere par l'Agent IMES — IA en direct" + IMES Consulting logo
- **"IA en direct" badge** in top-right (green when live, indicates real AI vs scripted)

## Current problems

1. **Too dense** — walls of text, no visual hierarchy. A CEO can't scan it in 10 seconds.
2. **No clear information architecture** — sections just stack vertically with H3 headings, all looking the same weight.
3. **Score badge is small and buried** — should be the hero element, immediately visible.
4. **Competitive map is just a list** — should feel like an actual strategic map.
5. **Email section is plain text** — should look like a real email preview (envelope metaphor).
6. **Objections section is hard to read** — italic questions followed by plain answers, no visual separation.
7. **Timeline is okay** but could be more impactful with better step visualization.
8. **No visual breathing room** — sections are crammed together.
9. **The "Prochaine Action" (next action) at the bottom is the most important CTA** but gets lost as a dark box at the bottom.

## Design requirements

### Visual identity
- Dark navy/midnight theme (background: ~#0f1729 or similar deep blue-black)
- Accent colors: IMES red (#E63946) for CTAs and alerts, emerald green (#10B981) for positive indicators, amber (#F59E0B) for warnings
- Clean sans-serif typography (Inter or similar)
- Subtle glassmorphism cards with soft borders (rgba white borders, subtle backdrop blur)
- The page must feel like a Bloomberg terminal meets a McKinsey slide — data-dense but elegant

### Layout architecture (top to bottom)

**1. Hero Header**
- Company name large and bold
- Function badge (e.g., "Directrice des Achats") as a subtle pill
- The OPPORTUNITY SCORE as a large radial gauge/ring (prominently sized, ~120px) with color coding:
  - Green (70+): "Opportunite forte"
  - Amber (40-69): "Opportunite moyenne"  
  - Red (<40): "Opportunite faible"
- Revenue potential ("45-90M FCFA/an") displayed prominently next to the score
- Action buttons row (Imprimer, Nouveau compte, Rejouer)

**2. Executive Summary Strip**
- A single highlighted card/banner that extracts the ONE key insight from the profil
- Think: "CIMLIT is a strategic industrial account in the cement sector — IMES can leverage proximity and energy audit expertise"
- This is the "elevator pitch" — 1-2 sentences max, large readable font

**3. Two-Column Grid: Intelligence Sections**
Split the middle content into a 2-column grid to reduce vertical scrolling:

Left column:
- **Signaux** — each signal as a compact card with a colored dot (green=opportunity, amber=watch, red=risk) and source link
- **Priorites** — numbered list with subtle ranking indicators
- **Angle d'approche** — short card with an approach icon

Right column:
- **Cartographie concurrentielle** — each competitor as a row with position badge (Leader=red, Challenger=amber, Local=gray) and weakness in smaller text
- **Proposition de valeur** — card with checkmark bullets

**4. Email Preview**
- Styled like an actual email client preview: header bar with "De: IMES Commercial", "A: [Fonction] — [Entreprise]", "Objet: ..."
- Body in a white/light card with proper email formatting
- A "Copier l'email" button

**5. Objections & Reponses**
- Accordion-style or Q&A cards
- Question in a darker pill/badge style
- Answer below in lighter text
- Visually distinct from other sections

**6. Plan d'Engagement 90 Jours (Timeline)**
- Horizontal stepper/timeline with 3 nodes (J+30, J+60, J+90)
- Each node expands into action + objectif below
- Connected by a progress line
- Feel like a project roadmap

**7. Sources Web**
- Compact list of source cards with favicon dots, title as link, snippet as gray subtitle
- Collapsible if many sources

**8. Prochaine Action (CTA)**
- STICKY or highly prominent bottom card
- Red/accent background, large text
- This is the "what do I do RIGHT NOW" — make it impossible to miss

**9. Footer**
- Subtle: "Dossier genere par l'Agent IMES" + timestamp + IMES Consulting logo
- "IA en direct" badge if live

### Important constraints
- This is a SELF-CONTAINED single HTML page (React app compiled into one file)
- Dark theme is mandatory (matches the pipeline/stepper page that precedes it)
- Must be responsive enough for a 13" laptop screen demo (1440x900 viewport)
- French language for all labels and section headers
- Must handle the "unverified company" case gracefully (when score < 40 and profil starts with warning emoji, show a yellow warning banner at the top)
- Print-friendly: when "Imprimer" is clicked, it should print cleanly on white background

### What "good" looks like for a demo
- A CEO glances at the page and within 5 seconds understands: score, company, key opportunity
- Within 30 seconds of scrolling: competitive landscape, approach plan, email ready to send
- The "wow factor": it looks like a $50k consulting deliverable generated in 30 seconds by AI
- Information density is HIGH but visual hierarchy makes it scannable, not overwhelming

## Deliverable

Design a complete HTML/CSS page (single file, self-contained) implementing this dossier layout. Use placeholder/sample data matching the JSON schema above (use a real-sounding Cameroonian company like "Societe Nationale de Raffinage — SONARA"). Include all CSS inline or in a style tag. The HTML should be structured so that a React app can populate it from the JSON data.
