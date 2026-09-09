// TODO à valider par HAROPA — textes repris tels quels de la maquette
// (open-challenge-ulhn-haropa.html, array `challenges`). Ne pas réécrire :
// ces libellés sont en attente de validation par HAROPA.
//
// Seed idempotent des sept défis. Lancer avec :  npm run seed
//
// Mapping maquette -> modèle Mongoose (les noms de champs diffèrent) :
//   maquette.id  -> ref       ("HP-01")
//   maquette.ref -> referent  ("Direction de l'exploitation")
//   image : convention documentée dans CLAUDE.md (hp-01.jpg … hp-07.jpg)

import { config } from "dotenv";
import mongoose from "mongoose";
import { Challenge } from "../lib/models.js";

config({ path: ".env.local" });

// Repris VERBATIM de la maquette. Seul le nommage des champs est adapté au modèle.
const challenges = [
  {
    ref: "HP-01",
    theme: "energie",
    title: "Efficacité énergétique des conteneurs réfrigérés à quai",
    owner: "HAROPA Port — Terminal de Normandie",
    referent: "Direction de l'exploitation",
    pdf: "HP-01-cahier-des-charges.pdf",
    image: "hp-01.jpg",
    desc: "Les conteneurs frigorifiques consomment en continu pendant leur séjour au terminal, parfois plusieurs jours. Comment réduire cette consommation sans jamais rompre la chaîne du froid, et avec quelles données de suivi ?",
  },
  {
    ref: "HP-02",
    theme: "environnement",
    title: "Traçabilité et émissions des déchets de navires",
    owner: "HAROPA Port — Environnement",
    referent: "Service qualité environnementale",
    pdf: "HP-02-cahier-des-charges.pdf",
    image: "hp-02.jpg",
    desc: "La collecte des déchets d'exploitation des navires implique plusieurs prestataires et beaucoup de manutention routière. Comment tracer les flux de bout en bout et réduire les émissions associées ?",
  },
  {
    ref: "HP-03",
    theme: "donnees",
    title: "Fiabiliser et partager les données d'escale",
    owner: "HAROPA Port — Systèmes d'information",
    referent: "Équipe Port Community System",
    pdf: "HP-03-cahier-des-charges.pdf",
    image: "hp-03.jpg",
    desc: "Les horaires d'escale annoncés et réalisés divergent, et chaque acteur maintient sa propre version. Quelles méthodes pour améliorer la fiabilité des données et les partager sans exposer d'information commerciale ?",
  },
  {
    ref: "HP-04",
    theme: "logistique",
    title: "Décarboner le report modal vers le fluvial",
    owner: "HAROPA Port — Développement",
    referent: "Direction axe Seine",
    pdf: "HP-04-cahier-des-charges.pdf",
    image: "hp-04.jpg",
    desc: "Le fluvial reste sous-utilisé sur l'axe Seine malgré son intérêt carbone. Où sont les vrais points de blocage — massification, horaires, dernier kilomètre — et lesquels peut-on lever à court terme ?",
  },
  {
    ref: "HP-05",
    theme: "resilience",
    title: "Infrastructures portuaires et submersion marine",
    owner: "HAROPA Port — Ingénierie",
    referent: "Direction des ouvrages",
    pdf: "HP-05-cahier-des-charges.pdf",
    image: "hp-05.jpg",
    desc: "Les ouvrages ont été conçus pour un régime hydrologique qui évolue. Comment prioriser les investissements d'adaptation avec des données de vulnérabilité exploitables ?",
  },
  {
    ref: "HP-06",
    theme: "donnees",
    title: "Conformité NIS2 des PME du transport",
    owner: "HAROPA Port — avec les commissionnaires de transport",
    referent: "Sécurité des systèmes d'information",
    pdf: "HP-06-cahier-des-charges.pdf",
    image: "hp-06.jpg",
    desc: "La directive européenne NIS2 s'applique à des entreprises de transport de vingt salariés qui n'ont pas de fonction sécurité. Comment rendre la mise en conformité atteignable pour elles ?",
  },
  {
    ref: "HP-07",
    theme: "social",
    title: "Attractivité des métiers portuaires",
    owner: "HAROPA Port — Ressources humaines",
    referent: "Direction des relations sociales",
    pdf: "HP-07-cahier-des-charges.pdf",
    image: "hp-07.jpg",
    desc: "Plusieurs métiers d'exploitation et de maintenance ne trouvent pas de candidats, alors que le bassin d'emploi est proche. Quels sont les mécanismes réels de non-recrutement et sur lesquels peut-on agir ?",
  },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI manque. Renseignez .env.local (voir .env.local.example).");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  for (const c of challenges) {
    // upsert par `ref` : relancer le seed met à jour sans créer de doublon.
    await Challenge.updateOne({ ref: c.ref }, { $set: c }, { upsert: true });
    console.log(`  ✓ ${c.ref} — ${c.title}`);
  }

  const total = await Challenge.countDocuments();
  console.log(`\n${challenges.length} défis semés. ${total} défis en base.`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
