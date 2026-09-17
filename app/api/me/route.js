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
  // Coéquipiers (nom + id) : la liste d'ids/noms sert à l'affichage ET au sélecteur
  // de successeur quand le coordinateur quitte l'équipe.
  const membresDocs = idea ? await Participant.find({ _id: { $in: idea.membres } }).select("name").lean() : [];
  const membresList = membresDocs.map((p) => ({ id: String(p._id), name: p.name }));
  const membresNames = membresList.map((m) => m.name);

  const [incomingRaw, outgoingRaw, invitationsRaw, notifications] = await Promise.all([
    // Demandes reçues sur les idées que je coordonne (uniquement des « demande »).
    JoinRequest.find({ coord: me._id, status: "en_attente", direction: "demande" }).sort({ createdAt: -1 }).lean(),
    // Demandes que J'AI envoyées. `direction: "demande"` exclut les invitations :
    // une invitation reçue n'est pas une demande envoyée par moi.
    JoinRequest.find({ from: me._id, direction: "demande" }).sort({ createdAt: -1 }).lean(),
    // Invitations que J'AI reçues (from = moi, direction "invitation"), en attente.
    // Elles n'apparaissaient nulle part et étaient donc inacceptables (voir API.md).
    JoinRequest.find({ from: me._id, status: "en_attente", direction: "invitation" }).sort({ createdAt: -1 }).lean(),
    Notification.find({ to: me._id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  // Invitations en attente sur MON équipe : sert à « Participants » pour savoir
  // combien de places sont déjà réservées et qui a déjà quelque chose en cours.
  let pendingInvitations = 0;
  let inProgressFrom = [];
  if (idea) {
    const teamPending = await JoinRequest.find({ idea: idea._id, status: "en_attente" }).select("from direction").lean();
    inProgressFrom = [...new Set(teamPending.map((r) => String(r.from)))];
    pendingInvitations = teamPending.filter((r) => r.direction === "invitation").length;
  }

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

  // Enrichir demandes envoyées ET invitations reçues avec l'idée visée et son défi.
  const ideaIds = [...new Set([...outgoingRaw, ...invitationsRaw].map((r) => String(r.idea)))];
  const ideas = ideaIds.length
    ? await Idea.find({ _id: { $in: ideaIds } }).select("title challenge").lean()
    : [];
  const ideaById = new Map(ideas.map((i) => [String(i._id), i]));
  const challRefById = new Map(
    (await Challenge.find({ _id: { $in: ideas.map((i) => i.challenge) } }).select("ref").lean()).map((c) => [String(c._id), c.ref])
  );
  const challRefOfIdea = (ideaId) => {
    const i = ideaById.get(String(ideaId));
    return i ? challRefById.get(String(i.challenge)) ?? null : null;
  };
  const outgoing = outgoingRaw.map((r) => {
    const i = ideaById.get(String(r.idea));
    return {
      id: r._id,
      idea: { id: r.idea, title: i?.title ?? "—", challengeRef: challRefOfIdea(r.idea) },
      status: r.status,
      createdAt: r.createdAt,
    };
  });

  // Invitations reçues : qui m'invite (proposedBy, à défaut le coordinateur) + l'idée.
  const inviterIds = invitationsRaw.map((r) => r.proposedBy || r.coord).filter(Boolean);
  const inviters = inviterIds.length
    ? await Participant.find({ _id: { $in: inviterIds } }).select("name").lean()
    : [];
  const inviterById = new Map(inviters.map((p) => [String(p._id), p]));
  const invitations = invitationsRaw.map((r) => {
    const i = ideaById.get(String(r.idea));
    const inviter = inviterById.get(String(r.proposedBy || r.coord));
    return {
      id: r._id,
      idea: { id: r.idea, title: i?.title ?? "—", challengeRef: challRefOfIdea(r.idea) },
      inviterName: inviter?.name ?? null,
      createdAt: r.createdAt,
    };
  });

  return json({
    me: me.toMe(),
    // Membre de mon équipe : j'ai droit au champ `full`. On ajoute la réf du défi
    // et l'état des invitations en attente de l'équipe (pour « Participants »).
    idea: idea
      ? {
          ...idea.toPublic({ member: true }),
          challengeRef: myChallengeRef,
          challengeTitle: myChallenge?.title ?? null,
          membresNames,
          membresList,
          pendingInvitations,
          inProgressFrom,
        }
      : null,
    requests: { incoming, outgoing },
    invitations,
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
