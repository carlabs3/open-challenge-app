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
  // Coéquipiers : profil complet (JAMAIS le mail). Sert à l'affichage, au sélecteur
  // de successeur (départ du coordinateur) et à la fiche modale de chaque membre
  // dans « Mon équipe » (mêmes champs que /participants).
  const membresDocs = idea
    ? await Participant.find({ _id: { $in: idea.membres } }).select("name lab disc li bio").lean()
    : [];
  const membresList = membresDocs.map((p) => ({
    id: String(p._id),
    name: p.name,
    lab: p.lab,
    disc: p.disc ?? [],
    li: p.li ?? "",
    bio: p.bio ?? "",
  }));
  const membresNames = membresList.map((m) => m.name);

  const [outgoingRaw, invitationsRaw, notifications] = await Promise.all([
    // Demandes que J'AI envoyées. `direction: "demande"` exclut les invitations :
    // une invitation reçue n'est pas une demande envoyée par moi.
    JoinRequest.find({ from: me._id, direction: "demande" }).sort({ createdAt: -1 }).lean(),
    // Invitations que J'AI reçues (from = moi, direction "invitation"), en attente.
    // Elles n'apparaissaient nulle part et étaient donc inacceptables (voir API.md).
    JoinRequest.find({ from: me._id, status: "en_attente", direction: "invitation" }).sort({ createdAt: -1 }).lean(),
    Notification.find({ to: me._id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  // Demandes et invitations EN COURS sur MON équipe : visibles par tous les membres
  // dans la fiche « Mon équipe » (les boutons de décision, eux, seront réservés au
  // coordinateur côté client). `pendingInvitations` / `inProgressFrom` restent pour
  // « Participants ». JAMAIS le mail des personnes concernées.
  let pendingInvitations = 0;
  let inProgressFrom = [];
  let teamRequests = [];
  let teamInvitations = [];
  if (idea) {
    const teamPending = await JoinRequest.find({ idea: idea._id, status: "en_attente" }).sort({ createdAt: -1 }).lean();
    inProgressFrom = [...new Set(teamPending.map((r) => String(r.from)))];
    pendingInvitations = teamPending.filter((r) => r.direction === "invitation").length;

    const ids = new Set();
    teamPending.forEach((r) => {
      ids.add(String(r.from));
      if (r.proposedBy) ids.add(String(r.proposedBy));
    });
    const profs = ids.size ? await Participant.find({ _id: { $in: [...ids] } }).select("name lab disc").lean() : [];
    const profById = new Map(profs.map((p) => [String(p._id), p]));
    const prof = (id) => {
      const p = profById.get(String(id));
      return { id: String(id), name: p?.name ?? null, lab: p?.lab ?? null, disc: p?.disc ?? [] };
    };

    teamRequests = teamPending
      .filter((r) => r.direction === "demande")
      .map((r) => ({ id: r._id, from: prof(r.from), note: r.note ?? "", createdAt: r.createdAt }));
    teamInvitations = teamPending
      .filter((r) => r.direction === "invitation")
      .map((r) => ({
        id: r._id,
        to: prof(r.from), // pour une invitation, `from` est la personne invitée
        proposedByName: r.proposedBy ? profById.get(String(r.proposedBy))?.name ?? null : null,
        createdAt: r.createdAt,
      }));
  }

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
          teamRequests,
          teamInvitations,
        }
      : null,
    requests: { outgoing },
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
