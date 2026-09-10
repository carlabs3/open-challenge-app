// Étiquettes d'affichage — reprises VERBATIM de la maquette
// (open-challenge-ulhn-haropa.html, lignes 759-776). Textes en français,
// délibérés : ne pas reformuler.

export const DISC = {
  info: "Informatique et cyber",
  energie: "Énergie",
  logistique: "Logistique",
  donnees: "Données",
  droit: "Droit",
  environnement: "Environnement",
  shs: "Sciences humaines et sociales",
  gestion: "Gestion",
};

export const THEMES = {
  logistique: "Logistique",
  energie: "Transition énergétique",
  donnees: "Données portuaires",
  resilience: "Résilience",
  environnement: "Environnement",
  social: "Métiers et territoire",
};

export const LABS = ["LOMC", "LITIS", "LMAH", "IDEES", "NIMEC", "GREAH", "LexFEIM", "Autre"];

/* Trames duotone par thématique : tiennent lieu de photo tant que les images
   ne sont pas fournies. Déposez images/hp-01.jpg … et elles prennent le relais. */
export const MOTIF = {
  energie:
    "repeating-linear-gradient(90deg,#6AA0BC 0 26px,#201B36 26px 34px),radial-gradient(circle at 70% 30%,rgba(92,217,131,.5),transparent 55%)",
  environnement: "repeating-radial-gradient(circle at 20% 110%,#6AA0BC 0 14px,#201B36 14px 30px)",
  donnees:
    "repeating-linear-gradient(0deg,rgba(106,160,188,.85) 0 2px,#201B36 2px 16px),repeating-linear-gradient(90deg,rgba(92,217,131,.5) 0 2px,transparent 2px 40px)",
  logistique: "repeating-linear-gradient(45deg,#6AA0BC 0 18px,#201B36 18px 40px)",
  resilience: "linear-gradient(180deg,#201B36 40%,#3E7392 40% 62%,#6AA0BC 62%)",
  social:
    "repeating-linear-gradient(135deg,#3E7392 0 12px,#201B36 12px 26px),radial-gradient(circle at 30% 40%,rgba(92,217,131,.45),transparent 50%)",
};
