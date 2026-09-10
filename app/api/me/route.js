import { getSessionParticipant } from "@/lib/session";
import { Idea, JoinRequest, Notification, Participant, Challenge, LABS, DISCIPLINES } from "@/lib/models";
import { handler, json, fail } from "@/lib/http";

// Données vives + session par cookie : jamais de prérendu statique au build.
export const dynamic = "force-dynamic";

/**
 * GET /api/me — tout « Mon espace » en une seule requête (voir API.md).
 * Requiert une session. C'est aussi la sonde qui prouve que la cookie marche.
 */
export const GET = handler(async () => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  const idea = me.ideaId ? await Idea.findById(me.ideaId) : null;
  // Défi de mon équipe (réf pour les hints, titre pour « Mon espace »).
  const myChallenge = idea ? await Challenge.findById(idea.challenge).select("ref title").lean() : null;
  const myChallengeRef = myChallenge?.ref ?? null;
  // Noms des coéquipiers (pour la carte d'équipe de « Mon espace »).
  const membresNames = idea
    ? (await Participant.find({ _id: { $in: idea.membres } }).select("name").lean()).map((p) => p.name)
    : [];

  const [incomingRaw, outgoingRaw, notifications] = await Promise.all([
    // Demandes reçues sur les idées que je coordonne (uniquement des « demande »).
    JoinRequest.find({ coord: me._id, status: "en_attente", direction: "demande" }).sort({ createdAt: -1 }).lean(),
    // Demandes que j'ai envoyées.
    JoinRequest.find({ from: me._id, direction: "demande" }).sort({ createdAt: -1 }).lean(),
    Notification.find({ to: me._id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  // Enrichir les demandes reçues avec le profil du demandeur (jamais son mail).
  const fromIds = incomingRaw.map((r) => r.from);
  const askers = fromIds.length
    ? await Participant.find({ _id: { $in: fromIds } }).select("name lab disc").lean()
    : [];
  const askerById = new Map(askers.map((p) => [String(p._id), p]));
  const incoming = incomingRaw.map((r) => {
    const p = askerById.get(String(r.from));
    return {
      id: r._id,
      from: { id: r.from, name: p?.name ?? null, lab: p?.lab ?? null, disc: p?.disc ?? [] },
      note: r.note ?? "",
      createdAt: r.createdAt,
    };
  });

  // Enrichir les demandes envoyées avec l'idée visée et son défi.
  const ideaIds = outgoingRaw.map((r) => r.idea);
  const ideas = ideaIds.length
    ? await Idea.find({ _id: { $in: ideaIds } }).select("title challenge").lean()
    : [];
  const ideaById = new Map(ideas.map((i) => [String(i._id), i]));
  const challRefById = new Map(
    (await Challenge.find({ _id: { $in: ideas.map((i) => i.challenge) } }).select("ref").lean()).map((c) => [String(c._id), c.ref])
  );
  const outgoing = outgoingRaw.map((r) => {
    const i = ideaById.get(String(r.idea));
    return {
      id: r._id,
      idea: { id: r.idea, title: i?.title ?? "—", challengeRef: i ? challRefById.get(String(i.challenge)) ?? null : null },
      status: r.status,
      createdAt: r.createdAt,
    };
  });

  return json({
    me: me.toMe(),
    // Membre de mon équipe : j'ai droit au champ `full`. On ajoute la réf du défi.
    idea: idea
      ? { ...idea.toPublic({ member: true }), challengeRef: myChallengeRef, challengeTitle: myChallenge?.title ?? null, membresNames }
      : null,
    requests: { incoming, outgoing },
    notifications,
  });
});

// LinkedIn : vide, ou une URL http(s) plausible.
const validLi = (s) => s === "" || /^https?:\/\/\S+\.\S+/.test(s);

/**
 * PATCH /api/me — rectifier ses propres données (RGPD). Requiert une session.
 * SEULS ces champs sont pris en compte ; tout autre champ du corps (email, role,
 * ideaId, passwordHash…) est IGNORÉ. Mêmes validations que l'inscription.
 * `chercheEquipe` n'est modifiable que si la personne n'a pas d'équipe.
 */
export const PATCH = handler(async (req) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  const body = await req.json().catch(() => ({}));

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.split(" ").filter(Boolean).length < 2) return fail("Indiquez votre nom et votre prénom.");
    me.name = name;
  }
  if (body.lab !== undefined) {
    if (!LABS.includes(body.lab)) return fail("Choisissez votre laboratoire.");
    me.lab = body.lab;
  }
  if (body.disc !== undefined) {
    const disc = Array.isArray(body.disc) ? body.disc : [];
    if (!disc.length || !disc.every((d) => DISCIPLINES.includes(d))) return fail("Cochez au moins une discipline.");
    me.disc = disc;
  }
  if (body.bio !== undefined) {
    const bio = String(body.bio);
    // TODO à valider — message nouveau (bio trop longue).
    if (bio.length > 220) return fail("La bio ne peut pas dépasser 220 caractères.");
    me.bio = bio.trim();
  }
  if (body.li !== undefined) {
    const li = String(body.li).trim();
    // TODO à valider — message nouveau (lien LinkedIn invalide).
    if (!validLi(li)) return fail("Ce lien n'est pas une adresse valide.");
    me.li = li;
  }
  if (body.visible !== undefined) me.visible = body.visible === true;
  // chercheEquipe : ignoré si la personne a déjà une équipe (statut alors dérivé).
  if (body.chercheEquipe !== undefined && !me.ideaId) {
    if (!["cherche", "idee"].includes(body.chercheEquipe)) return fail("Statut invalide.");
    me.chercheEquipe = body.chercheEquipe;
  }

  await me.save();
  return json({ me: me.toMe() });
});
