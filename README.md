# IMES Consulting — Plateforme d'agents IA

Démo projetable d'une plateforme commerciale augmentée :
- **Agent de compte** — analyse multi-agents d'un compte cible (LangGraph + Tavily).
- **Agent d'apprentissage** — apprend une entreprise depuis le web.
- **4 agents documentaires** — Manifeste · Crédit · Synthèse de rapport · Appel d'offres.

Backend : **DeepSeek** pour le raisonnement texte, **Claude** pour la vision documentaire
(blocs PDF/image). Pas de Claude dans le pipeline texte.

## Lancement local

```bash
cp .env.example .env       # renseigner les 3 clés (DeepSeek, Anthropic, Tavily)
npm install
npm start                  # http://localhost:5174
```

## Déploiement Coolify

Voir [`docs/DEPLOY.md`](docs/DEPLOY.md) — instructions pas-à-pas (Dockerfile fourni,
volume persistant pour le profil, variables d'environnement).

## Configuration (.env)

| Variable | Requise | Effet |
|---|---|---|
| `DEEPSEEK_API_KEY` | **Oui** | Pipeline texte (compte, learn, analyse documents) |
| `ANTHROPIC_API_KEY` | **Oui** | Vision Claude pour `/api/document` |
| `TAVILY_API_KEY` | **Oui** | Recherche web (compte + learn) |
| `DEEPSEEK_MODEL` | non | défaut `deepseek-chat` |
| `VISION_MODEL` | non | défaut `claude-sonnet-4-6` |
| `PROFILE_PATH` | non | chemin du profil persistant (`/data/...` en prod) |
| `PORT` | non | défaut `5174` (Coolify l'injecte automatiquement) |

## Modes

- **Live** : appels DeepSeek + Claude réels.
- **Cache local** : si une analyse a déjà été faite, replay instantané depuis IndexedDB (navigateur).
- **Repli scénarisé** : si réseau coupé ou API en erreur, fallback hors-ligne avec données fictives plantées.

## Gouvernance

L'agent travaille **uniquement au niveau entreprise et fonction**. Aucune donnée
personnelle n'est collectée. Les documents analysés sont des spécimens fictifs.
# imes
