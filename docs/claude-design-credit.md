# Claude Design — Agent documentaire « Dossier de crédit » (IMES Consulting)

Conçois une **page autonome (standalone)** pour un agent IA qui analyse un **dossier de crédit**
bancaire et rend un **avis motivé**. Elle fait partie d'une suite d'agents IMES : respecte
**exactement** la charte ci-dessous pour rester cohérente avec l'agent de compte existant.

## Charte (impérative)
- **Couleurs** : navy profond `#0C1E3C` (fond du pipeline) ; surface du **livrable** off-white
  éditorial premium (`#F7F7F7`/blanc) avec texte navy ; rouge IMES `#EB222A` (CTA + signaux forts) ;
  vert `#1F8A5B` / `#7fe3a8` (succès) ; ambre `#F4B740` (vigilance) ; bleu `#2B3991`.
- **Typographie** : display **Plus Jakarta Sans** (700/800) ; corps **Inter** (400/500/600) ;
  mono **IBM Plex Mono** (journal, montants techniques, codes). **Aucune police serif.**
- **En-tête** : wordmark « **IMES** Consulting » à gauche ; à droite un **badge `DÉMO · DONNÉES
  FICTIVES`** (rouge) toujours visible + un **indicateur de mode** : `IA en direct` (vert) /
  `repli scénarisé` (ambre) / `cache local` (bleu).
- Cartes glassmorphism (panneaux `rgba(8,18,38,.55)`, bordures `rgba(255,255,255,.08)`) sur le
  pipeline ; cartes blanches nettes, ombres douces sur le livrable.
- **Responsive** (laptop 13" 1440×900 **et** mobile). Français. Projetable (contrastes francs).

## Trois écrans (wizard, transitions douces)
1. **Chargement** : eyebrow « BANQUE & ASSURANCE », titre « Analyse de dossier de crédit »,
   sous-titre. Bouton **« Charger le document »** (fichier préparé d'avance ; affiche un aperçu
   **légèrement de travers (~2°)** comme un scan posé). Bouton **« Lancer l'agent »** (rouge).
   Note **« 🔒 Confidentialité : tout reste dans le document — aucune recherche web. »**
2. **Pipeline (analyse en cours)** — fond navy. **Stepper vertical** de 6 étapes ; chaque étape :
   icône ronde → **coche verte** quand terminée (**rouge** si `alert:true` + petit badge
   « signal fort »), titre, courte conclusion sous l'étape. À droite, **« Journal d'exécution »**
   (mono, horodaté `hh:mm:ss`) qui défile **synchronisé à l'étape en cours**. Compteur `x / 6`.
   **Aucun pop-up.** Révélation **pacée à cadence fixe** (≈ une ligne de log toutes ~380 ms,
   coche d'étape ~300 ms).
3. **Livrable (résultat)** — surface off-white éditoriale. Le **« moment waouh »** doit **sauter
   aux yeux** (voir mise en page).

### 6 étapes du pipeline
1. Tri et classification des pièces
2. Extraction des données clés (identité, revenus, charges, ancienneté)
3. Contrôle de cohérence (revenus déclarés vs virements réels)
4. Pièces manquantes & signaux de vigilance *(souvent `alert:true`)*
5. Capacité de remboursement & taux d'endettement
6. Fiche d'analyse & avis motivé

## Mise en page du livrable
- **En-tête** : « Dossier de crédit — {demandeur.nom} », **gros badge de décision** coloré
  (`Favorable`=vert, `Favorable sous réserve`=ambre, `Défavorable`=rouge), type & montant.
- **Bloc héro « Avis motivé »** : la décision en très grand + la justification (1-2 phrases).
- **Carte « Revenus & ratios »** (le waouh) : **deux tuiles côte à côte** — *Revenus déclarés*
  vs *Revenus constatés* ; si différents, l'écart est **mis en évidence en rouge**. + une
  **jauge** du **taux d'endettement** avec un repère du **seuil réglementaire 33 %** (dépassement
  en rouge). + capacité de remboursement.
- **Carte « Incohérences & vigilance »** : liste à puces de gravité — incohérences (rouge),
  vigilance (ambre). Si aucune : état vert « Dossier cohérent ».
- **Carte « Pièces du dossier »** : check-list `✓ / ✗` ; pièces **manquantes en rouge**.
- **Actions** : `Imprimer` · `↻ Rejouer` · `Nouveau document`.

## Schéma de données (à rendre fidèlement)
```json
{
  "demandeur": { "nom": "", "type_credit": "", "montant_demande": "" },
  "pieces": [ { "nom": "", "present": true } ],
  "donnees": { "revenus_declares": "", "revenus_constates": "", "charges": "", "anciennete": "" },
  "ratios": { "taux_endettement": "", "capacite_remboursement": "" },
  "incoherences": ["…"],
  "pieces_manquantes": ["…"],
  "vigilance": ["…"],
  "avis": { "decision": "Favorable | Favorable sous réserve | Défavorable", "justification": "" }
}
```

## Données d'exemple à intégrer (= repli hors-ligne, piège planté)
- demandeur : « M. Jean-Paul MBARGA », crédit immobilier, 25 000 000 FCFA / 84 mois.
- pieces : CNI ✓, Bulletins de salaire ✓, Relevé bancaire ✓, Demande signée ✓,
  **Justificatif de domicile ✗ (absent)**.
- donnees : revenus **déclarés 850 000 FCFA**, revenus **constatés 720 000 FCFA**,
  charges 180 000 FCFA, ancienneté 4 ans (CDI).
- ratios : taux d'endettement « 25 % (constaté) / ~79 % projeté avec le crédit demandé »,
  capacité « ≈ 150 000 FCFA/mois — insuffisante ».
- incoherences : « Revenu net déclaré (850 000) supérieur de 130 000 FCFA aux virements réellement
  constatés (720 000) — sur-déclaration ~15 %. »
- pieces_manquantes : « Justificatif de domicile (non fourni) ».
- vigilance : « Écart revenus déclarés/constatés », « Crédit auto en cours 180 000 FCFA/mois ».
- avis : décision **« Favorable sous réserve »**, justification : capacité correcte sur revenus
  constatés mais conditionnée à la régularisation du justificatif et à l'écart de revenus.
- Aussi un jeu de 6 `steps` (titres ci-dessus) avec 2-4 lignes de `log` chacune et une `conclusion`,
  l'étape 4 en `alert:true`.

## Contrat d'intégration (technique — important)
- La page lit ses données depuis un global **`window.IMES_DOC_DATA = { type:"credit",
  mode:"live"|"repli"|"cache", steps:[{title,log[],conclusion,alert}], result:{…schéma…} }`**.
  Intègre le jeu d'exemple ci-dessus **en dur** comme valeur par défaut (mode `repli`) : la page
  doit s'afficher parfaitement **hors-ligne**. Un harnais externe remplacera ce global par les
  données réelles avant le rendu.
- **Anime `steps`** à cadence fixe (pipeline), puis révèle le livrable. L'indicateur de mode
  reflète `mode`. **Aucune dépendance réseau** pour le rendu, **pas de localStorage**.
- Toutes les données sont **FICTIVES « spécimen »**.
- Livre une **page HTML autonome** (React+Babel inline OK), prête à projeter.
