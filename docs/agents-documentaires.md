# Agents documentaires — brainstorming / plan (démo IMES Consulting)

> Extension de l'agent de compte. Même proxy Node local, même `.env`, même charte,
> même comportement front (timeout → repli, révélation pacée, badge DÉMO,
> indicateur live/repli, projetable). Ne sont décrits que les **écarts**.
> **Statut : brainstorming — pas de dev tant que les décisions ne sont pas verrouillées.**

---

## 0. Point de friction n°1 — modèle multimodal (à trancher avant tout)

La spec dit « envoyer le document à **Claude** en multimodal ». Or le système est
désormais **DeepSeek-only** (facturation).

- `deepseek-chat` / `deepseek-reasoner` (api.deepseek.com) = **texte uniquement**, pas
  de vision/PDF. DeepSeek-VL n'est pas sur l'API chat.
- Les agents documentaires **exigent la vision** (image/PDF), sans OCR séparé → **ne
  peuvent pas tourner sur DeepSeek**.
- Pour le PDF natif + **citation de pages** (Agent 4), **Claude** est le meilleur choix.

**✅ DÉCISION VERROUILLÉE — Claude pour les agents documentaires.** Routage par agent :
- Agent de compte (texte) → **DeepSeek** (inchangé, `createModel()`).
- Agents documentaires (vision) → **`createVisionModel()`** → **Claude** (`@langchain/anthropic`,
  blocs image base64 / document PDF), modèle via `.env : VISION_MODEL` (défaut un
  Claude récent à fort support vision/PDF).

**Conséquence architecturale (à respecter au dev) :**
- On **réintroduit Claude UNIQUEMENT dans `createVisionModel()`**, utilisé seulement par
  `/api/document`. Le **pipeline de compte/texte reste strictement DeepSeek-only** —
  `model.mjs` (DeepSeek) n'est pas touché ; la garantie « zéro Claude sur l'agent de
  compte » tient toujours.
- `ANTHROPIC_API_KEY` requis dans `.env` (déjà présent) ; le log runtime doit afficher
  les **deux** providers (DeepSeek = texte, Claude = vision documentaire) sans ambiguïté.
- Facturation : seul un appel **LIVE** documentaire coûte (Claude vision, justifié car
  DeepSeek ne fait pas la vision). **Repli scénarisé = 0 appel**, et **IndexedDB** (§4)
  supprime le coût des analyses **répétées** (replay instantané, hors-ligne).

---

## 1. Socle commun

**Endpoint** `POST /api/document` :
```
Entrée : { type:"credit"|"manifeste"|"rapport"|"offre", file:base64, mime, filename }
Sortie 200 : { type, live:true, steps:[{title,log[],sources[],conclusion,alert}], result:{…} }
Erreur 503 → repli scénarisé du type (front, hors-ligne).
```
- **Un seul appel multimodal** par analyse → renvoie `{steps, result}` d'un coup (le
  modèle produit le récit ET le résultat structuré). Le front **anime** les steps à
  cadence fixe → **réutilise l'animation native stepper + journal** déjà fiabilisée.
- Pas d'OCR. Pas de recherche web (`sources:[]`) → argument **confidentialité** :
  « tout reste dans le document ».
- Gouvernance : documents **FICTIFS « spécimen »** ; le « moment waouh » (incohérence /
  pièce manquante / risque) est **planté** dans le doc de repli.

---

## 2. Front commun

- **« Charger le document »** : fichier **pré-préparé**, affiché **légèrement de travers**
  (rotation CSS) pour « faire scan ». Aucune caméra live.
- **« Lancer l'agent »** → animation pipeline réutilisée (stepper + journal + badge DÉMO
  + indicateur live/repli) → **rendu du résultat par type** (fiche crédit / tableau
  manifeste / synthèse+Q&A / trame d'offre).
- Landing : ajouter **« Agents documentaires »** (sélecteur par cluster métier).

---

## 3. Spécificités par agent

| Agent | Cluster | Entrée | Piège planté (repli) | Complexité |
|---|---|---|---|---|
| **1 Crédit** | Banque/Assurance | multi-pages (CNI, bulletins, relevés…) | 850 000 déclaré vs 720 000 constaté + justif. manquant ; variante AXA devis gonflé | élevée (multi-doc) |
| **2 Manifeste/BL** | Ports/Logistique | 1 connaissement (photo de travers) | poids vs nb conteneurs OU code douanier vs marchandise | **faible → ouvrir avec lui** |
| **4 Rapport** | Énergie/Audit | PDF 40-50 p | 3-4 risques enfouis + Q&A pré-écrites | **élevée (interactif)** — §5 |
| **5 Offre** | Total (sur mesure) | cahier des charges PDF | clauses pénalisantes + critère prix pondéré + élément manquant | moyenne ; lie `company-profile` |

---

## 4. ⭐ Intégration IndexedDB (brique centrale)

On **étend le cache `imes-cache` existant** (déjà `analyses` + `profiles`) → **version 2**
avec deux nouveaux object stores. Helper `idb.js` générique (get/put/getAll) déjà en place.

### 4.1 Nouveaux stores
- **`documents`** — résultats d'analyse documentaire.
  - clé : `` `${type}::${fileHash}` `` (hash du fichier = SHA-256 du base64 via
    `crypto.subtle`, ou hash rapide cyrb53 — un par doc préparé, collisions négligeables).
  - valeur : `{ key, type, filename, steps:[…], result:{…}, ts }`.
- **`document_qa`** — réponses de suivi de l'Agent 4 (rapport interactif).
  - clé : `` `${fileHash}::${questionNormalisée}` ``.
  - valeur : `{ key, fileHash, question, answer, pages:[…], ts }`.

### 4.2 Flux d'analyse (miroir de l'agent de compte)
À « Lancer l'agent » : calculer `fileHash`, interroger `documents[type::hash]` :
- **HIT** → fournir `{steps, result}` cachés au front → **animation native rejouée,
  instantanée, AUCUN appel vision** + chip « ⚡ chargé depuis le cache local ».
- **MISS** → `POST /api/document` (vision) → succès → **écrire dans `documents`** → animer.
- « Rejouer » = re-soumission du même doc = HIT garanti.

### 4.3 Agent 4 — Q&A caché
- Synthèse initiale : cachée par `documents[rapport::hash]`.
- Chaque question : hash `fileHash::question` → `document_qa` :
  - **HIT** → réponse + pages **instantanées et déterministes**.
  - **MISS** → appel suivi `{followup:true, question, docId}` → écrire dans `document_qa`.
- Le **`docId` côté proxy** (map mémoire `docId → {file,mime}`, TTL) reste pour ne pas
  renvoyer le PDF ; IndexedDB cache les **réponses** côté client. Les deux sont complémentaires.

### 4.4 Pourquoi c'est décisif ici (plus encore que pour l'agent de compte)
1. **Coût** : les appels **vision/Claude sont chers** (un PDF 50 p = beaucoup de tokens).
   Le cache évite de repayer le même document de démo. Gain majeur.
2. **Fiabilité du « moment waouh »** : un résultat caché = **déterministe**. Le piège
   planté est **garanti** au replay (plus de dépendance à la détection LIVE du modèle).
3. **Pré-chauffage avant séance** : lancer chaque doc **une fois en LIVE** (vérifié bon)
   → pendant la démo, tout est **instantané, hors-ligne, garanti**, sans réseau ni modèle.
   → Ceci **résout en grande partie le risque n°1 de la §6** (waouh raté en LIVE).
4. **Cohérence** : même mécanique que l'agent de compte (un seul `idb.js`, mêmes patterns).

### 4.5 Réconciliation « pas de localStorage »
La spec redit « pas de localStorage ». **IndexedDB ≠ localStorage**, et on a déjà adopté
IndexedDB pour l'agent de compte à ta demande. On l'applique donc **aussi** aux agents
documentaires (cohérence + bénéfices ci-dessus). Garde-fous : bouton/raccourci **« vider
le cache »** pour une démo « fraîche » à la demande, et `ts` pour purge/TTL éventuelle.

---

## 5. Agent 4 (rapport interactif) — détail

- Deux temps, même endpoint : initial (synthèse + risques) puis `{type:"rapport",
  followup:true, question, docId}`.
- **Cache docId proxy** (ne pas renvoyer le PDF) + **`document_qa` IndexedDB** (réponses).
- **Ancrage pages obligatoire** (`pages:[…]`) anti-hallucination → argument clé ; renvoi
  visuel vers la page côté front.
- PDF 40-50 p = appel long/coûteux → timeout généreux + repli + **pré-chauffage cache**.

---

## 6. Risques & sécurité démo

1. **« Waouh » raté en LIVE** : pièges très nets ; prompt qui cherche explicitement
   l'incohérence ; **pré-test** ; **repli** (garanti) + **cache IndexedDB pré-chauffé**
   (garanti) comme double filet.
2. **base64 dans le JSON** : PDF 5-20 Mo → +33 % → relever limites du proxy ; envisager
   multipart. (Le hash pour IndexedDB se calcule sur ce même base64.)
3. **Latence/coût vision** : timeouts par type (rapport le + long) ; cache amortit.
4. **Limites modèle** (pages max, formats) → docs « spécimen » calibrés.

---

## 7. Réutilisation de l'existant

Animation native stepper + journal · SSE / `503→repli` / pacing · scaffolding LangGraph ·
**`idb.js` (étendu v2)** · gouvernance / JSON-repair · charte / DÉMO badge · landing+routing ·
`company-profile` (Agent 5).

---

## 8. Séquencement de dev

1. **Socle** : `createVisionModel()`, `POST /api/document`, **`idb.js` v2 (stores
   `documents` + `document_qa`)**, UI upload mise en scène + animation réutilisée + cadre
   repli + 1 rendu générique + cache check/replay.
2. **Agent 2 (manifeste)** — simple, anomalie nette.
3. **Agent 1 (crédit)** — multi-doc + cohérence.
4. **Agent 5 (offre)** — extraction + trame + `company-profile`.
5. **Agent 4 (rapport)** — interactif, cache docId + `document_qa`, citations (en dernier).

En séance : ouvrir par un documentaire simple (1/2) → agent de compte (le clou) →
Agent 4 (énergie/audit) → Agent 5 (Total).

---

## 9. Décisions à verrouiller

1. ✅ **Modèle vision** : **Claude** (via `createVisionModel()`, scopé à `/api/document` ;
   l'agent de compte reste DeepSeek-only). *(tranché)*
2. ✅ **Persistance** : **IndexedDB adopté** (stores `documents` + `document_qa`), avec
   « vider le cache » pour démo fraîche. *(tranché)*
3. ✅ **Granularité d'appel** : **un seul appel multimodal `{steps+result}`** par analyse
   (le front anime les steps). *(tranché)*
4. ✅ **Forme Agent 5** : **réponse à appel d'offres** (forme principale). Variantes
   (recouvrement / SAV WhatsApp) **différées** — reconfirmer avec le DG mais on part sur
   l'offre. *(tranché)*
5. ✅ **Navigation** : **3ᵉ carte landing « Agents documentaires »** → sélecteur listant
   les 4 types, **groupés par cluster métier**. *(tranché)*
6. ✅ **Upload** : **base64-in-JSON** (conforme spec), avec **bornage de taille** (relever
   les limites du proxy ; docs « spécimen » calibrés). *(tranché)*

**→ Toutes les décisions sont verrouillées. Socle prêt à être lancé.**
