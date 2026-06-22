/* IMES — Agent d'intelligence de compte commercial
   Front-end data: step metadata + embedded scripted repli (CIMLIT),
   matching the /api/agent JSON schema. All data FICTIVES (illustration).
   Exposes window.IMES_AGENT. */
(function () {
  // ---- Static UI metadata for the 8 steps (title/icon/desc) ----
  const STEP_META = [
    { id: 'identification', n: '01', icon: 'fingerprint', title: 'Identification du compte', desc: 'Secteur, taille, implantation, parc / flotte.' },
    { id: 'contexte',       n: '02', icon: 'globe',       title: 'Collecte du contexte public', desc: 'Consultation des sources ouvertes.' },
    { id: 'signaux',        n: '03', icon: 'activity',     title: 'Analyse des signaux récents', desc: 'Événements et tendances exploitables.' },
    { id: 'concurrence',    n: '04', icon: 'users',        title: 'Cartographie concurrentielle', desc: 'Fournisseurs actuels et concurrents.' },
    { id: 'fonction',       n: '05', icon: 'target',       title: 'Lecture de la fonction visée', desc: "Leviers de décision de l'acheteur." },
    { id: 'angle',          n: '06', icon: 'compass',      title: "Définition de l'angle d'approche", desc: "Positionnement et porte d'entrée." },
    { id: 'redaction',      n: '07', icon: 'pen-line',     title: 'Rédaction du plan de contact', desc: "Séquence + e-mail d'introduction." },
    { id: 'objections',     n: '08', icon: 'shield',       title: 'Anticipation des objections', desc: 'Réponses préparées aux résistances.' },
  ];

  // ---- Embedded scripted repli — plays offline / on API failure ----
  // Shape mirrors the live /api/agent response exactly.
  function repli(company, role) {
    return {
      account: { company: 'Cimenterie du Littoral (CIMLIT)', role: 'Directrice des Achats' },
      live: false,
      steps: [
        {
          title: 'Identification du compte',
          log: [
            'résolution de l\u2019entité « Cimenterie du Littoral »',
            'secteur = cimenterie · taille ≈ 450 · site = Douala-Bonabéri',
            'parc détecté : poids lourds + groupes électrogènes',
          ],
          sources: [],
          conclusion: 'Cimentier industriel d\u2019environ 450 personnes à Douala-Bonabéri — activité énergie-intensive et logistique lourde.',
          alert: false,
        },
        {
          title: 'Collecte du contexte public',
          log: [
            'ouverture des sources publiques…',
            '→ site institutionnel · registre du commerce',
            '→ presse économique · rapport sectoriel BTP',
            '5 sources retenues',
          ],
          sources: [
            'Site institutionnel — cimlit.cm',
            'Presse économique — dossier BTP 2026',
            'Registre du commerce (RCCM)',
            'Page entreprise — réseau professionnel',
            'Rapport sectoriel BTP — observatoire',
          ],
          conclusion: 'Profil et actualité consolidés à partir de 5 sources publiques.',
          alert: false,
        },
        {
          title: 'Analyse des signaux récents',
          log: [
            'extraction des événements récents…',
            'signal: extension de capacité (fort)',
            'signal: recrutements logistiques · tension énergie régionale',
          ],
          sources: [],
          conclusion: 'Trois signaux convergents : extension de capacité, recrutements logistiques, tension énergétique régionale.',
          alert: true,
        },
        {
          title: 'Cartographie concurrentielle',
          log: [
            'identification des fournisseurs énergie actuels…',
            'TotalEnergies (leader), Tradex (challenger), distributeurs locaux',
            'faiblesses détectées : pas de reporting, pas de contrat-cadre multi-produits',
          ],
          sources: [],
          conclusion: 'Trois concurrents identifiés. TotalEnergies domine mais sans offre intégrée ni reporting — fenêtre pour IMES sur le pilotage du coût total.',
          alert: false,
        },
        {
          title: 'Lecture de la fonction visée',
          log: [
            'leviers de décision · Directrice des Achats',
            'priorité: continuité > coût total > fiabilité flotte',
            'critère caché: reporting de consommation',
          ],
          sources: [],
          conclusion: 'La Directrice des Achats arbitre sur la continuité et le coût total — pas sur le prix au litre.',
          alert: false,
        },
        {
          title: "Définition de l'angle d'approche",
          log: [
            'croisement signaux × leviers…',
            "angle = sécurité d'appro + coût total de possession",
            "synchronisation sur le calendrier d'extension",
          ],
          sources: [],
          conclusion: "Entrer par la sécurité d'approvisionnement et le coût total, aligné sur le calendrier d'extension — surtout pas par le prix.",
          alert: false,
        },
        {
          title: 'Rédaction du plan de contact',
          log: [
            'génération de la séquence de contact…',
            "rédaction de l'e-mail d'introduction",
            'proposition de valeur sur mesure assemblée',
          ],
          sources: [],
          conclusion: "Séquence de contact et e-mail d'introduction prêts à l'envoi.",
          alert: false,
        },
        {
          title: 'Anticipation des objections',
          log: [
            'simulation des résistances acheteur…',
            '4 objections probables identifiées',
            'réponses argumentées préparées · dossier prêt ✓',
          ],
          sources: [],
          conclusion: 'Quatre objections probables anticipées, chacune avec une réponse prête.',
          alert: false,
        },
      ],
      dossier: {
        score: 82,
        potentiel_ca: '120-180M FCFA/an',
        profil:
          "Cimenterie du Littoral (CIMLIT) — cimentier industriel fictif implanté à Douala-Bonabéri, ~450 employés. Production en continu, distribution assurée par une flotte de poids lourds, secours électrique par groupes électrogènes. Activité fortement consommatrice d'énergie et dépendante de la fiabilité logistique.",
        signaux: [
          { text: "Projet d'extension de capacité de production.", source: 'Presse économique · dossier BTP 2026' },
          { text: 'Vague de recrutements sur les fonctions logistiques.', source: 'Page entreprise' },
          { text: 'Tensions régionales sur la disponibilité énergétique.', source: 'Rapport sectoriel BTP' },
        ],
        priorites: [
          "Continuité d'approvisionnement — zéro rupture sur site",
          'Maîtrise du coût total — pas le prix au litre',
          'Fiabilité de la flotte de poids lourds',
          'Reporting de consommation exploitable',
        ],
        concurrents: [
          { nom: 'TotalEnergies Cameroun', position: 'Leader — fournisseur actuel probable', faiblesse: 'Offre standardisée, pas de reporting personnalisé ni contrat-cadre multi-produits.' },
          { nom: 'Tradex', position: 'Challenger — présence régionale forte', faiblesse: 'Capacité logistique limitée pour les gros volumes industriels continus.' },
          { nom: 'Distributeurs locaux', position: 'Locaux — dépannage et petits volumes', faiblesse: 'Aucune garantie de disponibilité, pas de suivi, risque de rupture.' },
        ],
        angle:
          "Entrer par la sécurité d'approvisionnement et le coût total de possession (TCO), en s'alignant sur le calendrier d'extension de capacité. Ne jamais entrer par le prix au litre.",
        valeur:
          "Contrat-cadre multi-produits — carburant, lubrifiants et GPL — avec garantie de disponibilité sur site, cartes flotte à détection d'anomalies et tableau de bord mensuel de consommation. L'objectif n'est pas de vendre un litre moins cher, mais de sécuriser la production et de rendre le coût total pilotable.",
        email: {
          subject: "Sécuriser l'approvisionnement énergétique de votre extension",
          body:
            "Madame la Directrice des Achats,\n\nÀ l'approche de votre extension de capacité, la continuité d'approvisionnement énergétique et la maîtrise du coût total deviennent des sujets de comité de direction, bien au-delà du prix au litre.\n\nNous accompagnons des sites industriels comparables avec un contrat-cadre multi-produits (carburant, lubrifiants, GPL), une garantie de disponibilité sur site et un reporting mensuel de consommation — de quoi sécuriser la production sans alourdir le pilotage.\n\nSeriez-vous disponible 20 minutes pour un échange de cadrage ? Nous pourrions, à l'issue, vous proposer un audit gratuit de votre poste énergie-flotte.\n\nBien cordialement,\nIMES Consulting",
        },
        objections: [
          { q: '« Nous avons déjà un fournisseur de carburant. »', a: "Nous ne remplaçons pas un litre par un litre : nous sécurisons la continuité et rendons le coût total visible. Comparons sur un mois, données en main." },
          { q: '« Vos prix sont plus élevés. »', a: "Le prix au litre est rarement le poste qui dérape — c'est la rupture, l'immobilisation de flotte et les anomalies non détectées. Notre reporting les chiffre." },
          { q: '« Changer de fournisseur est risqué. »', a: "C'est pourquoi nous démarrons par un audit et un pilote cadré, sans bascule brutale : la garantie de disponibilité couvre précisément ce risque." },
          { q: '« Ce n\u2019est pas le moment, nous sommes en pleine extension. »', a: "C'est justement la fenêtre utile : aligner le contrat-cadre sur le calendrier d'extension évite d'improviser l'approvisionnement quand la capacité montera." },
        ],
        timeline: [
          { horizon: 'J+30', action: 'Appel de cadrage + audit gratuit poste énergie-flotte', objectif: 'Valider le besoin et obtenir les données de consommation' },
          { horizon: 'J+60', action: 'Restitution audit + proposition contrat-cadre', objectif: 'Présenter le TCO comparé et le pilote sur un segment' },
          { horizon: 'J+90', action: 'Démarrage pilote sur un segment (lubrifiants ou GPL)', objectif: 'Démontrer la fiabilité IMES avant extension du périmètre' },
        ],
        next:
          "Décrocher un appel de cadrage de 20 minutes avec la Direction des Achats, avec pour objectif de proposer un audit gratuit du poste énergie-flotte avant le lancement de l'extension.",
      },
    };
  }

  window.IMES_AGENT = { STEP_META, repli };
})();
