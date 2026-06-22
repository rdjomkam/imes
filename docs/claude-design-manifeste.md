# Claude Design — Agent documentaire « Manifeste / Connaissement » (IMES Consulting)

Conçois une **page autonome (standalone)** pour un agent IA qui lit un **connaissement (bill of
lading) / manifeste** scanné, l'extrait, contrôle la cohérence et **signale les anomalies**. Elle
fait partie d'une suite d'agents IMES : respecte **EXACTEMENT** la charte et la structure ci-dessous
(identiques aux agents « Dossier de crédit » et « Synthèse de rapport » déjà livrés) pour que la
suite soit cohérente et que le harnais d'intégration fonctionne sans retouche.

## Charte (impérative)
- **Couleurs** : navy profond `#0C1E3C` (fond pipeline) ; surface du **livrable** off-white
  éditorial premium (`#F7F7F7`/blanc, texte navy) ; rouge IMES `#EB222A` (CTA + signaux forts) ;
  vert `#1F8A5B`/`#7fe3a8` (succès) ; ambre `#F4B740` (vigilance) ; bleu `#2B3991`.
- **Typo** : display **Plus Jakarta Sans** (700/800) ; corps **Inter** (400/500/600) ; mono
  **IBM Plex Mono** (journal, numéros, poids, codes). **Aucune police serif.**
- **En-tête** : wordmark « **IMES** Consulting » à gauche ; à droite **badge `DÉMO · DONNÉES
  FICTIVES`** (rouge) + **indicateur de mode** : `IA en direct` (vert) / `repli scénarisé` (ambre) /
  `cache local` (bleu), lu depuis `data.mode`.
- Cartes glassmorphism sur le pipeline (`rgba(8,18,38,.55)`, bordures `rgba(255,255,255,.08)`) ;
  cartes blanches nettes sur le livrable. **Responsive** (laptop 13" 1440×900 **et** mobile). FR.

## Trois écrans (wizard, transitions douces) — MÊME structure que les autres agents
1. **Chargement** (`screen 'load'`) : eyebrow « PORTS & LOGISTIQUE », titre « Lecture & contrôle de
   connaissement », sous-titre. Bouton **« Charger le document »** (fichier préparé d'avance ;
   afficher un **aperçu/mock de connaissement légèrement de travers ~2°** avec un tampon
   « SPÉCIMEN »). Bouton **« Lancer l'agent »** (rouge, désactivé tant que non chargé). Note
   **« 🔒 Confidentialité — tout reste dans le document. Aucune recherche web. »**
2. **Pipeline** (`screen 'pipeline'`, fond navy) : **stepper vertical de 5 étapes** ; chaque étape :
   icône ronde → **coche verte** quand terminée (**rouge** si `alert:true` + badge « signal fort »),
   titre, courte conclusion. À droite, **« Journal d'exécution »** (mono, horodaté) synchronisé à
   l'étape courante. Compteur `x / 5`. **Aucun pop-up.** Cadence fixe (~380 ms/ligne de log).
3. **Livrable** (`screen 'result'`, off-white) : le **« moment waouh »** (l'anomalie) doit **sauter
   aux yeux** (voir mise en page).

### 5 étapes du pipeline (avec icônes type Lucide)
1. Redressement et lecture du document — `scan`/`file-search`
2. Extraction structurée — `list`/`layers`
3. Contrôle de cohérence — `scale`
4. Signalement de l'anomalie — `alert-octagon` *(souvent `alert:true`)*
5. Mise en forme exploitable — `table`

## Mise en page du livrable
- **En-tête** : « Connaissement analysé », statut global (`✓ Conforme` vert / `⚠ Anomalie détectée`
  rouge selon la présence d'anomalies) + un badge **« Prêt à exporter »** vert ou **« Export bloqué »**
  rouge selon `pret_export`.
- **Carte « Anomalies & vigilance »** (le waouh, en HAUT) : chaque anomalie = une ligne d'alerte
  rouge avec **badge de gravité** (`élevée`/`moyenne`/`faible`), champ concerné et problème précis.
  Si `anomalies` est vide : état vert « Aucune anomalie détectée ».
- **Carte « Données extraites »** : tableau clé/valeur **prêt à exporter** (expéditeur, destinataire,
  navire, ports, marchandise, poids brut, nb conteneurs, n° conteneurs, code douanier).
- **Actions** : `Imprimer` · `↻ Rejouer` · `Nouveau document`.

## Schéma de données (à rendre fidèlement)
```json
{
  "donnees": {
    "expediteur": "", "destinataire": "", "navire": "",
    "port_chargement": "", "port_dechargement": "", "marchandise": "",
    "poids_brut": "", "nb_conteneurs": "", "numeros_conteneurs": ["…"], "code_douanier": ""
  },
  "anomalies": [ { "champ": "", "probleme": "", "gravite": "faible|moyenne|élevée" } ],
  "pret_export": true
}
```

## Données d'exemple à intégrer (= repli hors-ligne, piège planté)
- donnees : expéditeur « Sté Cacao du Sud SARL (Douala) », destinataire « Europe Trading GmbH
  (Anvers) », navire « MV Douala Star », port_chargement « Douala (CM) », port_dechargement
  « Anvers (BE) », marchandise « Fèves de cacao en sacs », **poids_brut « 54 000 kg »**,
  **nb_conteneurs « 1 × 20' »**, numeros_conteneurs ["TCLU1234567"], code_douanier « 1801.00 — Cacao ».
- anomalies : [{ champ « poids_brut ↔ nb_conteneurs », probleme « 54 000 kg déclarés pour un seul
  conteneur 20' (charge utile max ≈ 28 000 kg) — poids physiquement impossible, conteneur manquant
  non déclaré ou erreur de saisie. », gravite « élevée » }].
- pret_export : false.
- 5 `steps` (titres + icônes ci-dessus) avec 2-4 lignes de `log` et une `conclusion` ;
  l'étape 4 « Signalement de l'anomalie » en `alert:true`.

## Contrat d'intégration (technique — IMPORTANT, identique aux agents crédit/rapport)
- La page lit ses données depuis un global **`window.IMES_DOC_DATA = { type:"manifeste",
  mode:"live"|"repli"|"cache", steps:[{title,icon,log[],conclusion,alert}], result:{…schéma…} }`**,
  avec le jeu d'exemple ci-dessus **codé en dur comme valeur par défaut** (mode `repli`) → la page
  s'affiche **parfaitement hors-ligne**. Un harnais externe remplacera ce global par les données
  réelles avant le rendu.
- Structure du composant App attendue (pour la compatibilité du harnais) : `const DATA =
  window.IMES_DOC_DATA;` ; un état d'écran `'load' | 'pipeline' | 'result'` ; un `run` qui anime les
  `steps` à cadence fixe puis passe au résultat ; `LoadScreen` avec `onLoad={() => setLoaded(true)}`
  et `onRun={run}`. (Ne pas faire d'appel réseau ; pas de localStorage.)
- Données **FICTIVES « spécimen »**. Responsive, projetable. **Page HTML autonome** (React + Babel
  inline OK), comme les autres agents de la suite.
