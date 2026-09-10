// TODO à valider par HAROPA — textes des défis repris tels quels de la maquette
// (open-challenge-ulhn-haropa.html). Ne pas réécrire.
//
// Trois commandes, toutes idempotentes :
//   npm run seed:challenges   → seulement les 7 défis (à garder sur le site)
//   npm run seed:demo         → 12 participants + 8 idées + 1 demande, FICTIFS
//   npm run seed:clear        → vide participants, idées, demandes, notifications
//                               (PAS les défis). DESTRUCTIF : demande de retaper
//                               le nom de la base pour confirmer.
//
// ⚠️ Les participants/idées/demandes sont FICTIFS (mots de passe « challenge2026 »).
// À vider avec seed:clear avant d'ouvrir le challenge au public réel.
//
// Mapping maquette -> modèle Mongoose :
//   challenge.id  -> ref       ("HP-01")   |  challenge.ref -> referent
//   participant/idée : les ids texte "p1"/"i1" sont remplacés par des ObjectId ;
//   coord, membres, ideaId et demandes sont résolus par e-mail / position.

import readline from "node:readline";
import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Challenge, Participant, Idea, JoinRequest, Notification } from "../lib/models.js";

config({ path: ".env.local" });

const MODE = process.argv[2]; // "challenges" | "demo" | "clear"

/* ---------------- données reprises VERBATIM de la maquette ---------------- */

const challenges = [
  { ref: "HP-01", theme: "energie", title: "Efficacité énergétique des conteneurs réfrigérés à quai", owner: "HAROPA Port — Terminal de Normandie", referent: "Direction de l'exploitation", pdf: "HP-01-cahier-des-charges.pdf", image: "hp-01.jpg", desc: "Les conteneurs frigorifiques consomment en continu pendant leur séjour au terminal, parfois plusieurs jours. Comment réduire cette consommation sans jamais rompre la chaîne du froid, et avec quelles données de suivi ?" },
  { ref: "HP-02", theme: "environnement", title: "Traçabilité et émissions des déchets de navires", owner: "HAROPA Port — Environnement", referent: "Service qualité environnementale", pdf: "HP-02-cahier-des-charges.pdf", image: "hp-02.jpg", desc: "La collecte des déchets d'exploitation des navires implique plusieurs prestataires et beaucoup de manutention routière. Comment tracer les flux de bout en bout et réduire les émissions associées ?" },
  { ref: "HP-03", theme: "donnees", title: "Fiabiliser et partager les données d'escale", owner: "HAROPA Port — Systèmes d'information", referent: "Équipe Port Community System", pdf: "HP-03-cahier-des-charges.pdf", image: "hp-03.jpg", desc: "Les horaires d'escale annoncés et réalisés divergent, et chaque acteur maintient sa propre version. Quelles méthodes pour améliorer la fiabilité des données et les partager sans exposer d'information commerciale ?" },
  { ref: "HP-04", theme: "logistique", title: "Décarboner le report modal vers le fluvial", owner: "HAROPA Port — Développement", referent: "Direction axe Seine", pdf: "HP-04-cahier-des-charges.pdf", image: "hp-04.jpg", desc: "Le fluvial reste sous-utilisé sur l'axe Seine malgré son intérêt carbone. Où sont les vrais points de blocage — massification, horaires, dernier kilomètre — et lesquels peut-on lever à court terme ?" },
  { ref: "HP-05", theme: "resilience", title: "Infrastructures portuaires et submersion marine", owner: "HAROPA Port — Ingénierie", referent: "Direction des ouvrages", pdf: "HP-05-cahier-des-charges.pdf", image: "hp-05.jpg", desc: "Les ouvrages ont été conçus pour un régime hydrologique qui évolue. Comment prioriser les investissements d'adaptation avec des données de vulnérabilité exploitables ?" },
  { ref: "HP-06", theme: "donnees", title: "Conformité NIS2 des PME du transport", owner: "HAROPA Port — avec les commissionnaires de transport", referent: "Sécurité des systèmes d'information", pdf: "HP-06-cahier-des-charges.pdf", image: "hp-06.jpg", desc: "La directive européenne NIS2 s'applique à des entreprises de transport de vingt salariés qui n'ont pas de fonction sécurité. Comment rendre la mise en conformité atteignable pour elles ?" },
  { ref: "HP-07", theme: "social", title: "Attractivité des métiers portuaires", owner: "HAROPA Port — Ressources humaines", referent: "Direction des relations sociales", pdf: "HP-07-cahier-des-charges.pdf", image: "hp-07.jpg", desc: "Plusieurs métiers d'exploitation et de maintenance ne trouvent pas de candidats, alors que le bassin d'emploi est proche. Quels sont les mécanismes réels de non-recrutement et sur lesquels peut-on agir ?" },
];

const LI = "https://www.linkedin.com/in/";

const participants = [
  { id: "p1", name: "Camille Renaud", email: "camille.renaud@univ-lehavre.fr", lab: "LOMC", disc: ["energie", "environnement"], bio: "Mécanique des fluides et transferts thermiques appliqués aux installations portuaires.", li: LI, visible: true, ideaId: "i1" },
  { id: "p2", name: "Yanis Berthier", email: "yanis.berthier@univ-lehavre.fr", lab: "LITIS", disc: ["info", "donnees"], bio: "Apprentissage automatique sur séries temporelles et qualité de données.", li: LI, visible: true, ideaId: "i1" },
  { id: "p3", name: "Sophie Marchand", email: "sophie.marchand@univ-lehavre.fr", lab: "IDEES", disc: ["shs"], bio: "Sociologie du travail et représentations des métiers industriels.", li: LI, visible: true, ideaId: null },
  { id: "p4", name: "Thomas Lecoq", email: "thomas.lecoq@univ-lehavre.fr", lab: "LMAH", disc: ["logistique"], bio: "Optimisation combinatoire appliquée aux chaînes logistiques.", li: "", visible: true, ideaId: "i2" },
  { id: "p5", name: "Naïma Ouali", email: "naima.ouali@univ-lehavre.fr", lab: "LexFEIM", disc: ["droit"], bio: "Droit du numérique et conformité réglementaire des opérateurs de transport.", li: LI, visible: true, ideaId: "i5" },
  { id: "p6", name: "Pierre Vasseur", email: "pierre.vasseur@univ-lehavre.fr", lab: "GREAH", disc: ["energie"], bio: "Réseaux électriques et récupération d'énergie sur sites industriels.", li: "", visible: true, ideaId: "i3" },
  { id: "p7", name: "Élise Fontaine", email: "elise.fontaine@univ-lehavre.fr", lab: "NIMEC", disc: ["gestion"], bio: "Management de l'innovation et évaluation de projets.", li: "", visible: true, ideaId: "i3" },
  { id: "p8", name: "Marc Delaunay", email: "marc.delaunay@univ-lehavre.fr", lab: "LITIS", disc: ["info", "donnees"], bio: "Sécurité et interopérabilité des systèmes industriels.", li: "", visible: true, ideaId: "i4" },
  { id: "p9", name: "Julien Caron", email: "julien.caron@univ-lehavre.fr", lab: "LOMC", disc: ["environnement", "donnees"], bio: "Hydrodynamique côtière et modélisation de la submersion.", li: "", visible: true, ideaId: "i6" },
  { id: "p10", name: "Amélie Roussel", email: "amelie.roussel@univ-lehavre.fr", lab: "IDEES", disc: ["shs"], bio: "Géographie sociale et marchés du travail locaux.", li: LI, visible: true, ideaId: "i7" },
  { id: "p11", name: "Hugo Lemaire", email: "hugo.lemaire@univ-lehavre.fr", lab: "NIMEC", disc: ["gestion", "droit"], bio: "Gouvernance des données et modèles économiques de plateformes.", li: "", visible: true, ideaId: "i8" },
  { id: "p12", name: "Karim Benali", email: "karim.benali@univ-lehavre.fr", lab: "GREAH", disc: ["energie", "info"], bio: "Électronique de puissance et instrumentation embarquée.", li: "", visible: true, ideaId: null },
];

const ideas = [
  { id: "i1", ch: "HP-01", title: "Pilotage prédictif du froid par données de quai", angle: "Lisser les cycles de refroidissement à partir de l'historique de température et des créneaux d'escale.", full: "Analyse de deux campagnes de mesure, modèle de prédiction et simulation d'un pilotage par créneaux.", has: ["energie", "info"], want: ["donnees", "droit"], coord: "p1", membres: ["p1", "p2"], status: "ouverte", confirmed: true },
  { id: "i2", ch: "HP-01", title: "Mutualiser l'alimentation à quai entre conteneurs", angle: "Regrouper les conteneurs par consigne de température pour partager les points de branchement.", full: "Étude d'implantation et modèle d'affectation des emplacements.", has: ["logistique"], want: ["energie", "shs"], coord: "p4", membres: ["p4"], status: "ouverte", confirmed: true },
  { id: "i3", ch: "HP-01", title: "Récupération de la chaleur des groupes frigorifiques", angle: "Valoriser la chaleur rejetée pour un usage local sur le terminal.", full: "Bilan thermique et scénarios de valorisation.", has: ["energie", "gestion"], want: [], coord: "p6", membres: ["p6", "p7"], status: "fermee", confirmed: true },
  { id: "i4", ch: "HP-03", title: "Écart entre escale annoncée et escale réalisée", angle: "Mesurer l'écart sur deux ans de données pour identifier ce qui le produit.", full: "Constitution d'un jeu de données et analyse des causes.", has: ["info", "donnees"], want: ["logistique", "droit"], coord: "p8", membres: ["p8"], status: "ouverte", confirmed: true },
  { id: "i5", ch: "HP-06", title: "Auto-diagnostic NIS2 pour une PME de vingt salariés", angle: "Traduire les obligations en une vingtaine de questions vérifiables sans expert.", full: "Grille de conformité et test auprès de trois entreprises.", has: ["droit", "info"], want: ["gestion", "shs"], coord: "p5", membres: ["p5"], status: "ouverte", confirmed: true },
  { id: "i6", ch: "HP-05", title: "Carte de vulnérabilité des ouvrages par scénario", angle: "Croiser l'état des ouvrages et les scénarios de submersion pour hiérarchiser les urgences.", full: "Modèle SIG et grille de priorisation.", has: ["environnement", "donnees"], want: ["energie", "gestion"], coord: "p9", membres: ["p9"], status: "ouverte", confirmed: true },
  { id: "i7", ch: "HP-07", title: "Ce que les candidats comprennent des offres portuaires", angle: "Analyser le vocabulaire des annonces face aux représentations des demandeurs d'emploi.", full: "Analyse lexicale et entretiens semi-directifs.", has: ["shs"], want: ["gestion", "donnees"], coord: "p10", membres: ["p10"], status: "ouverte", confirmed: true },
  { id: "i8", ch: "HP-03", title: "Socle de données d'escale partagé entre acteurs", angle: "Un référentiel commun où chacun publie sa version horaire sans céder ses données commerciales.", full: "Architecture de partage et cadre juridique.", has: ["donnees", "droit", "gestion"], want: [], coord: "p11", membres: ["p11"], status: "fermee", confirmed: true },
];

const requests = [
  { ideaId: "i1", from: "p3", note: "Je peux apporter le volet acceptabilité côté opérateurs de quai.", status: "en_attente" },
];

/* ---------------- exécution ---------------- */

async function connect() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI manque. Renseignez .env.local (voir .env.local.example).");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
}

/** Une ligne lue sur stdin (fonctionne en interactif ET en pipe : echo nom | ...). */
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a); }));
}

/** seed:challenges — upsert des 7 défis. Renvoie la map ref -> _id. */
async function seedChallenges() {
  for (const c of challenges) await Challenge.updateOne({ ref: c.ref }, { $set: c }, { upsert: true });
  console.log(`  ✓ ${challenges.length} défis`);
  return new Map((await Challenge.find().lean()).map((c) => [c.ref, c._id]));
}

/** seed:demo — participants + idées + demande FICTIFS. Les défis sont requis :
    on les upsert d'abord pour que la commande soit autonome et idempotente. */
async function seedDemo() {
  const challByRef = await seedChallenges();

  // 2. Participants — upsert par e-mail (sans ideaId à ce stade). Mot de passe bcrypt.
  const passwordHash = await bcrypt.hash("challenge2026", 12);
  const pId = new Map(); // "p1" -> ObjectId
  for (const p of participants) {
    await Participant.updateOne(
      { email: p.email },
      { $set: { name: p.name, email: p.email, passwordHash, lab: p.lab, disc: p.disc, bio: p.bio, li: p.li, visible: p.visible, emailVerified: true } },
      { upsert: true }
    );
    // nameKey est calculé par le hook pre('save'), pas par updateOne : on le fixe ici.
    const doc = await Participant.findOne({ email: p.email });
    doc.name = p.name; // force isModified pour recalculer nameKey
    await doc.save();
    pId.set(p.id, doc._id);
  }
  console.log(`  ✓ ${participants.length} participants (mot de passe : challenge2026)`);

  // 3. Idées — upsert par (challenge, title). Résout coord/membres via pId.
  const iId = new Map(); // "i1" -> ObjectId
  for (const i of ideas) {
    const challenge = challByRef.get(i.ch);
    const coord = pId.get(i.coord);
    const membres = i.membres.map((m) => pId.get(m));
    await Idea.updateOne(
      { challenge, title: i.title },
      { $set: { challenge, title: i.title, angle: i.angle, full: i.full, has: i.has, want: i.want, coord, membres, status: i.status, moderation: "publiee", archived: false, confirmed: i.confirmed } },
      { upsert: true }
    );
    const doc = await Idea.findOne({ challenge, title: i.title }).select("_id").lean();
    iId.set(i.id, doc._id);
  }
  console.log(`  ✓ ${ideas.length} idées`);

  // 4. ideaId des participants (une fois les idées créées).
  for (const p of participants) {
    await Participant.updateOne({ email: p.email }, { $set: { ideaId: p.ideaId ? iId.get(p.ideaId) : null } });
  }

  // 5. Demandes — upsert par (idea, from). coord copié de l'idée.
  for (const r of requests) {
    const idea = iId.get(r.ideaId);
    const ideaDoc = await Idea.findById(idea).select("coord").lean();
    await JoinRequest.updateOne(
      { idea, from: pId.get(r.from) },
      { $set: { idea, from: pId.get(r.from), coord: ideaDoc.coord, direction: "demande", note: r.note, status: r.status } },
      { upsert: true }
    );
  }
  console.log(`  ✓ ${requests.length} demande(s) en attente`);

  // 6. Validation de l'invariant « une personne = une équipe = un défi ».
  await validateInvariant();

  const counts = {
    défis: await Challenge.countDocuments(),
    participants: await Participant.countDocuments(),
    idées: await Idea.countDocuments(),
    demandes: await JoinRequest.countDocuments(),
  };
  console.log("\nEn base :", counts);
  console.log("⚠️  Données FICTIVES — à vider avant l'ouverture publique (npm run seed:clear).");
}

/** seed:clear — DESTRUCTIF. Vide participants, idées, demandes et notifications
    (JAMAIS les défis). Demande de retaper le nom de la base pour confirmer. */
async function clearDemo() {
  const dbName = mongoose.connection.name;
  console.log(`\n⚠️  Commande DESTRUCTIVE sur la base « ${dbName} ».`);
  console.log("   Elle SUPPRIME participants, idées, demandes et notifications.");
  console.log("   Les défis sont CONSERVÉS.\n");
  const answer = (await ask(`   Retapez le nom exact de la base pour confirmer (${dbName}) : `)).trim();
  if (answer !== dbName) {
    console.log("\nNom incorrect. Annulé — rien n'a été supprimé.");
    return;
  }
  const [p, i, d, n] = await Promise.all([
    Participant.deleteMany({}),
    Idea.deleteMany({}),
    JoinRequest.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log(
    `\nSupprimés — participants: ${p.deletedCount}, idées: ${i.deletedCount}, ` +
      `demandes: ${d.deletedCount}, notifications: ${n.deletedCount}.`
  );
  console.log(`Défis conservés : ${await Challenge.countDocuments()}.`);
}

/** Vérifie la cohérence avant de laisser des données en base. Échoue clairement. */
async function validateInvariant() {
  const errs = [];
  const allIdeas = await Idea.find().lean();
  const allParts = await Participant.find().lean();

  // a. chaque participant n'apparaît que dans une seule équipe.
  const teamOf = new Map(); // participantId -> ideaId
  for (const i of allIdeas) {
    for (const m of i.membres) {
      const k = String(m);
      if (teamOf.has(k)) errs.push(`Participant ${k} est membre de deux idées (${teamOf.get(k)} et ${i._id}).`);
      else teamOf.set(k, String(i._id));
    }
    // b. le coordinateur est membre de son idée.
    if (!i.membres.some((m) => String(m) === String(i.coord))) errs.push(`Idée « ${i.title} » : le coordinateur n'est pas dans ses membres.`);
  }

  // c. participant.ideaId cohérent avec son appartenance réelle.
  for (const p of allParts) {
    const real = teamOf.get(String(p._id)) || null;
    const declared = p.ideaId ? String(p.ideaId) : null;
    if (real !== declared) errs.push(`Participant ${p.email} : ideaId=${declared} mais membre réel de ${real}.`);
  }

  if (errs.length) {
    console.error("\n❌ Données incohérentes, rien n'est garanti :");
    for (const e of errs) console.error("   - " + e);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("  ✓ invariant « une personne = une équipe » vérifié");
}

async function main() {
  await connect();
  if (MODE === "challenges") await seedChallenges();
  else if (MODE === "demo") await seedDemo();
  else if (MODE === "clear") await clearDemo();
  else {
    console.error("Mode inconnu. Utilisez : challenges | demo | clear");
    process.exitCode = 1;
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
