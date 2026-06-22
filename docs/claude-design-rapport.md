# Claude Design — Agent documentaire « Synthèse & interrogation de rapport » (IMES Consulting)

Conçois une **page autonome (standalone)** pour un agent IA qui **synthétise un rapport PDF dense
(40-50 pages)**, en **hiérarchise les risques**, puis permet de **l'interroger en direct** —
chaque réponse **citant ses pages sources** (anti-hallucination). Suite IMES : respecte
**exactement** la charte ci-dessous (identique à l'agent de compte).

## Charte (impérative)
- **Couleurs** : navy `#0C1E3C` (pipeline) ; livrable off-white premium (`#F7F7F7`/blanc, texte
  navy) ; rouge IMES `#EB222A` ; vert `#1F8A5B`/`#7fe3a8` ; ambre `#F4B740` ; bleu `#2B3991`.
- **Typo** : display **Plus Jakarta Sans** (700/800) ; corps **Inter** ; mono **IBM Plex Mono**
  (journal, citations de pages, extraits). **Pas de serif.**
- **En-tête** : wordmark « **IMES** Consulting » ; badge `DÉMO · DONNÉES FICTIVES` (rouge) ;
  indicateur de mode `IA en direct` / `repli scénarisé` / `cache local`.
- Cartes glassmorphism (pipeline) / cartes blanches (livrable). **Responsive** (13" + mobile).
  Français. Projetable.

## Trois écrans + un mode interactif
1. **Chargement** : eyebrow « ÉNERGIE & AUDIT », titre « Synthèse & interrogation de rapport »,
   bouton « Charger le document » (PDF préparé, aperçu **de travers ~2°**), bouton « Lancer
   l'agent », note « 🔒 tout reste dans le document — aucune recherche web ».
2. **Pipeline** (fond navy) : **stepper vertical 5 étapes** (coche verte/rouge, titre, conclusion)
   + **« Journal d'exécution »** mono horodaté synchronisé, compteur `x / 5`, **aucun pop-up**,
   cadence fixe.
3. **Livrable** (off-white éditorial) : voir mise en page. **+ mode questions-réponses en direct.**

### 5 étapes du pipeline
1. Ingestion et cartographie du document (structure, sections)
2. Extraction des points clés
3. Identification et hiérarchisation des risques
4. Production de la synthèse exécutive
5. Activation du mode questions-réponses

## Mise en page du livrable
- **Héro « Synthèse exécutive »** : panneau navy/dégradé sobre avec le paragraphe de synthèse en
  grand (éditorial).
- **Carte « Risques hiérarchisés »** (le waouh) : chaque risque = une ligne avec **badge de niveau**
  (`élevé`=rouge, `moyen`=ambre, `faible`=vert), libellé, et un **badge page `p.NN`** cliquable
  (ancrage anti-hallucination). Trier par niveau décroissant.
- **Carte « Cartographie du document »** : la liste des sections (`structure`).
- **Carte « Points clés »** : liste à puces.
- **Panneau « Interroger le rapport » (interactif, central)** : un champ de question + bouton
  « Demander » ; les échanges s'affichent en fil (style chat sobre) ; **chaque réponse de l'agent
  se termine par les pages citées** sous forme de badges `p.NN` (cliquables). Inclure 3 questions
  **suggérées** (puces cliquables) issues du jeu d'exemple.
- **Actions** : `Imprimer` · `Nouvelle analyse`.

## Schémas de données (à rendre fidèlement)
Résultat **initial** :
```json
{
  "structure": ["…sections…"],
  "points_cles": ["…"],
  "risques": [ { "libelle": "", "niveau": "élevé|moyen|faible", "page": 0 } ],
  "synthese": "…paragraphe…"
}
```
Réponse de **suivi** (Q&A) :
```json
{ "answer": "…", "pages": [12, 27] }
```

## Données d'exemple à intégrer (= repli hors-ligne, risques plantés)
- synthese : rapport de due diligence fictif d'un site industriel énergétique.
- structure : ["1. Contexte & périmètre", "2. Conformité environnementale", "3. Finances",
  "4. Calendrier projet", "5. Annexes techniques"].
- points_cles : 4-5 points.
- risques (plantés, identifiables) :
  - « Non-conformité environnementale : rejets au-delà du seuil autorisé » — `élevé` — p.18
  - « Exposition financière : passif non provisionné de 1,2 Md FCFA » — `élevé` — p.31
  - « Retard projet : 7 mois de glissement sur le planning de mise en service » — `moyen` — p.24
  - « Dépendance fournisseur unique sur les pièces critiques » — `faible` — p.40
- **Q&A pré-écrites** (3-4), chacune avec réponse + pages :
  - Q « Quels sont les risques environnementaux ? » → réponse + `pages:[18]`
  - Q « Quelle est l'exposition financière ? » → réponse (1,2 Md FCFA non provisionné) + `pages:[31]`
  - Q « Le projet est-il en retard ? » → réponse (7 mois) + `pages:[24]`
- Aussi 5 `steps` (titres ci-dessus) avec logs + conclusions ; étape 3 (risques) `alert:true`.

## Contrat d'intégration (technique — important)
- Données initiales depuis **`window.IMES_DOC_DATA = { type:"rapport", mode, steps:[…],
  result:{ structure, points_cles, risques, synthese } }`** (jeu d'exemple en dur = repli).
- **Q&A** : la page appelle **`window.IMES_DOC_ASK(question)` qui renvoie une `Promise<{answer,
  pages:[number]}>`**. Fournis une **implémentation de repli intégrée** : un dictionnaire des
  questions d'exemple → réponses (et un fallback générique « Information non trouvée dans le
  document, p. — »). Le harnais remplacera `window.IMES_DOC_ASK` par l'appel réel.
- Anime `steps` (cadence fixe) puis révèle le livrable. **Hors-ligne**, **pas de localStorage**,
  données **FICTIVES « spécimen »**, responsive, projetable. **Page HTML autonome.**
