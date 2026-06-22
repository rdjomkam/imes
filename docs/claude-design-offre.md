# Claude Design — Agent documentaire « Appel d'offres / Cotation B2B » (IMES Consulting)

Conçois une **page autonome (standalone)** pour un agent IA qui lit un **appel d'offres / cahier
des charges (PDF)**, en **extrait les exigences**, **repère les clauses critiques**, **détecte ce
qui manque pour répondre**, et **génère une trame de réponse** + une **check-list de conformité**.
Suite IMES : respecte **exactement** la charte ci-dessous (identique à l'agent de compte).

## Charte (impérative)
- **Couleurs** : navy `#0C1E3C` (pipeline) ; livrable off-white premium (`#F7F7F7`/blanc, texte
  navy) ; rouge IMES `#EB222A` ; vert `#1F8A5B`/`#7fe3a8` ; ambre `#F4B740` ; bleu `#2B3991`.
- **Typo** : display **Plus Jakarta Sans** (700/800) ; corps **Inter** ; mono **IBM Plex Mono**
  (journal, références, montants). **Pas de serif.**
- **En-tête** : wordmark « **IMES** Consulting » ; badge `DÉMO · DONNÉES FICTIVES` (rouge) ;
  indicateur de mode `IA en direct` / `repli scénarisé` / `cache local`.
- Cartes glassmorphism (pipeline) / cartes blanches (livrable). **Responsive** (13" + mobile).
  Français. Projetable.

## Trois écrans (wizard)
1. **Chargement** : eyebrow « COTATION B2B », titre « Réponse à appel d'offres », bouton « Charger
   le document » (PDF préparé, aperçu **de travers ~2°**), bouton « Lancer l'agent », note
   « 🔒 tout reste dans le document — aucune recherche web ».
2. **Pipeline** (fond navy) : **stepper vertical 6 étapes** (coche verte/rouge, titre, conclusion)
   + **« Journal d'exécution »** mono horodaté synchronisé, compteur `x / 6`, **aucun pop-up**,
   cadence fixe.
3. **Livrable** (off-white éditorial) : voir mise en page ; le **waouh** = clauses critiques +
   critère prix sur-pondéré + l'élément manquant.

### 6 étapes du pipeline
1. Lecture et extraction des exigences (volumes, produits, délais, critères, clauses)
2. Repérage des points critiques et risques (pénalités, exigences HSE) *(souvent `alert:true`)*
3. Vérification de complétude (ce qui manque pour répondre)
4. Génération d'une trame de réponse + arguments différenciants
5. Structure de l'offre et pré-chiffrage
6. Check-list de conformité administrative

## Mise en page du livrable
- **En-tête** : « Appel d'offres — {objet} » + courte synthèse (volumes / produits / délais).
- **Carte « Critères d'attribution »** (le waouh n°1) : chaque critère avec une **barre de
  pondération** (poids %). Le critère **prix fortement pondéré** doit ressortir visuellement.
- **Carte « Clauses critiques & risques »** (le waouh n°2) : cards avec **badge de gravité**
  (`élevée`=rouge, `moyenne`=ambre) — pénalités de retard, exigences HSE strictes.
- **Carte « Manquants pour répondre »** (le waouh n°3) : liste en **rouge** des éléments requis
  absents (ex. « information X requise non disponible »).
- **Carte « Exigences »** : liste classée par `type` (technique / administratif / délai…).
- **Carte « Trame de réponse & arguments »** : la trame en étapes + les **arguments différenciants
  IMES** (proximité, accompagnement, ROI documenté — aligner sur le positionnement IMES).
- **Carte « Check-list de conformité »** : `✓ / ✗` par item (requis).
- **Actions** : `Imprimer` · `↻ Rejouer` · `Nouveau document`.

## Schéma de données (à rendre fidèlement)
```json
{
  "objet": "",
  "synthese": "",
  "exigences": [ { "libelle": "", "type": "" } ],
  "criteres_attribution": [ { "critere": "", "poids": 0 } ],
  "clauses_critiques": [ { "clause": "", "risque": "", "gravite": "élevée|moyenne|faible" } ],
  "manquants": ["…"],
  "trame_reponse": ["…"],
  "arguments": ["…"],
  "checklist_conformite": [ { "item": "", "requis": true } ]
}
```

## Données d'exemple à intégrer (= repli hors-ligne, pièges plantés)
- objet : « Fourniture de carburants et lubrifiants industriels — site minier (lot unique) ».
- criteres_attribution : Prix **60 %** (sur-pondéré → à faire ressortir), Délais 20 %, HSE 15 %,
  Références 5 %.
- clauses_critiques :
  - « Pénalités de retard : 2 %/jour, plafond 20 % du marché » — risque élevé.
  - « Conformité HSE stricte : certification ISO 14001 exigée + plan HSE détaillé » — risque moyen.
  - « Caution de bonne exécution 10 % » — risque moyen.
- manquants : « Attestation ISO 14001 non disponible — requise pour la recevabilité »,
  « Bilan carbone du fournisseur (demandé en annexe 4) ».
- exigences : volumes (ex. 1,2 M litres/an), produits (gasoil, lubrifiants), délais (livraison 48 h),
  reporting mensuel de consommation.
- trame_reponse : 5-6 étapes ; arguments : proximité terrain, garantie de disponibilité sur site,
  reporting TCO, contrat-cadre multi-produits.
- checklist_conformite : 6-7 items `✓/✗` (dont l'ISO 14001 ✗).
- Aussi 6 `steps` (titres ci-dessus) avec logs + conclusions ; étape 2 `alert:true`.

## Contrat d'intégration (technique — important)
- Données depuis **`window.IMES_DOC_DATA = { type:"offre", mode:"live"|"repli"|"cache",
  steps:[{title,log[],conclusion,alert}], result:{…schéma…} }`** (jeu d'exemple en dur = repli ;
  la page s'affiche **hors-ligne**). Le harnais remplacera ce global par les données réelles.
- Anime `steps` (cadence fixe) puis révèle le livrable ; l'indicateur reflète `mode`.
- **Aucune dépendance réseau** pour le rendu, **pas de localStorage**, données **FICTIVES
  « spécimen »**, responsive, projetable. **Page HTML autonome** (React+Babel inline OK).
