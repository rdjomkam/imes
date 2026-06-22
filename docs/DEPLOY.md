# Déploiement Coolify — IMES Consulting Demo

## Aperçu
- Application Node.js (server.mjs) servant front statique + endpoints SSE.
- Backend split : **DeepSeek** pour l'analyse texte, **Claude** pour la vision documentaire.
- État côté navigateur (IndexedDB) — pas de DB serveur. Seul fichier muté côté
  serveur : `company-profile.json` (persistable via volume).

## 1. Pré-requis Coolify
- Projet Coolify avec accès Docker registry (la build se fait localement sur le
  serveur Coolify à partir du `Dockerfile` à la racine du repo).
- Repo Git accessible (GitHub/GitLab/Gitea ou archive uploadée).

## 2. Créer la ressource
1. **+ New Resource → Application → Public/Private repository**.
2. Renseigner l'URL du repo + la branche (`main`).
3. **Build Pack** : `Dockerfile` (sélection automatique car `Dockerfile` à la racine).
4. **Port** : `5174` (le `Dockerfile` expose ce port ; Coolify le mappe au domaine
   public). Le serveur lit `process.env.PORT` que Coolify injecte automatiquement.

## 3. Variables d'environnement (Coolify → Environment Variables)
Strictement requises :

| Clé | Valeur | Origine |
|---|---|---|
| `DEEPSEEK_API_KEY` | `sk-…` | [platform.deepseek.com](https://platform.deepseek.com) |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | [console.anthropic.com](https://console.anthropic.com) |
| `TAVILY_API_KEY` | `tvly-…` | [tavily.com](https://tavily.com) |

Optionnelles (laisser vide pour les valeurs par défaut) :

| Clé | Défaut | Effet |
|---|---|---|
| `DEEPSEEK_MODEL` | `deepseek-chat` | Modèle texte utilisé partout sauf vision |
| `VISION_MODEL` | `claude-sonnet-4-6` | Modèle multimodal pour `/api/document` |
| `PROFILE_PATH` | (bundlé) | Voir étape 4 ci-dessous |

## 4. Persistance du profil (recommandé)
Sans volume, le profil appris (`Configurer l'agent`) revient à la valeur par défaut
**IMES Consulting** à chaque redéploiement. Pour persister entre déploiements :

1. Dans Coolify, onglet **Storages → + Add → Volume Mount** :
   - Source : `imes-data` (nommé)
   - Destination : `/data`
2. Onglet **Environment Variables** : ajouter `PROFILE_PATH=/data/company-profile.json`.

Le code copie automatiquement le profil par défaut vers `/data/company-profile.json`
au premier démarrage si le fichier n'existe pas — pas de seeding manuel à faire.

## 5. Healthcheck (optionnel mais utile)
Coolify accepte un healthcheck. Recommandé :

- **Path** : `/api/profile`
- **Port** : interne (laisser Coolify détecter via `EXPOSE`)
- **Method** : GET
- Réponse 200 = OK (renvoie le profil actif).

## 6. Première vérification après déploiement
1. Ouvrir le domaine assigné → la landing IMES doit s'afficher avec « Agent actif · {shortName} ».
2. **Test agent de compte** : Analyser un compte → saisir une entreprise (ex. « TotalEnergies Cameroun ») → vérifier dans les logs Coolify : `[model] Provider actif (runtime) : DeepSeek`.
3. **Test agent documentaire** : Agents documentaires → Crédit → Charger → Lancer
   → vérifier dans les logs : `[vision] Provider documentaire (multimodal) : Claude`
   puis `[document] credit · lecture Claude ✓` puis `· analyse DeepSeek ✓`.
4. **Test PDF.js** : sur Synthèse de rapport, cliquer un badge `p.N` → un panneau
   latéral droit doit s'ouvrir avec le PDF rendu via PDF.js (pas dépendant du plugin
   navigateur).

## 7. Coûts à surveiller
- **DeepSeek** : ~$0,0005 / appel agent de compte (8 nœuds), ~$0,001 / Q&A rapport.
- **Anthropic Claude** : ~$0,01-0,05 / document analysé (selon nb pages), facturé
  uniquement à la première lecture (le cache IndexedDB côté navigateur évite les
  appels répétés sur le même document).
- **Tavily** : 1000 recherches gratuites/mois, ~$0,003 ensuite. ~3 requêtes par
  apprentissage d'entreprise + 8-10 par analyse de compte.

## 8. Mise à jour
Push sur la branche déployée → Coolify redéploie automatiquement (par défaut).
Le volume `/data` survit aux redéploiements ; le profil appris reste actif.

## 9. Troubleshooting
- **« ANTHROPIC_API_KEY manquant »** dans les logs lors d'un essai d'agent documentaire
  → ajouter la clé dans Environment Variables et redéployer.
- **« No JSON in response »** sur un nœud → DeepSeek a ponctuellement renvoyé du
  texte non-JSON. Le nœud dégrade proprement et le pipeline continue ; aucun fix
  requis sauf si chronique (alors basculer `DEEPSEEK_MODEL` vers une autre variante).
- **Profil non persistant** → vérifier que le volume `/data` est bien monté ET que
  `PROFILE_PATH=/data/company-profile.json` est défini.
- **PDF ne s'affiche pas dans le panneau** → vérifier que `/pdfjs/web/viewer.html`
  répond 200 (sinon le dossier `public/pdfjs/` n'a pas été inclus à la build —
  vérifier le `.dockerignore` n'exclut pas `public/`).
