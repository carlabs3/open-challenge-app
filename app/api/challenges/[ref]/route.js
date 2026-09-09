import { dbConnect } from "@/lib/db";
import { Challenge, Idea, JoinRequest, Participant } from "@/lib/models";
import { isOpen } from "@/lib/ideas";
import { getSessionParticipant } from "@/lib/session";
import { handler, json, fail } from "@/lib/http";

/**
 * GET /api/challenges/:ref — public.
 * Le défi et ses idées, déjà séparées en `open` / `closed`.
 * Toutes les règles de visibilité sont appliquées ICI, jamais côté client.
 */
export const GET = handler(async (_req, { params }) => {
  await dbConnect();

  const challenge = await Challenge.findOne({ ref: params.ref }).lean();
  // TODO à valider — message d'erreur nouveau (défi introuvable).
  if (!challenge) return fail("Ce défi n'existe pas.", 404);

  const me = await getSessionParticipant();
  const staff = !!me && ["organisateur", "admin"].includes(me.role);
  const meId = me ? String(me._id) : null;

  const all = await Idea.find({ challenge: challenge._id }).lean();

  const isMine = (i) =>
    !!meId && (String(i.coord) === meId || i.membres.some((m) => String(m) === meId));

  // Retirées / archivées : cachées, sauf pour l'organisation et le coordinateur
  // (ou membre) de l'idée concernée.
  const visible = all.filter(
    (i) => (i.moderation !== "retiree" && !i.archived) || staff || isMine(i)
  );

  // Noms et labos des coordinateurs + membres, en une seule requête.
  const personIds = new Set();
  for (const i of visible) {
    personIds.add(String(i.coord));
    i.membres.forEach((m) => personIds.add(String(m)));
  }
  const people = personIds.size
    ? await Participant.find({ _id: { $in: [...personIds] } }).select("name lab").lean()
    : [];
  const person = new Map(people.map((p) => [String(p._id), p]));

  // Demandes en attente par idée — utile seulement pour les idées dont je suis membre.
  const pendingByIdea = new Map();
  const mineIds = visible.filter(isMine).map((i) => i._id);
  if (mineIds.length) {
    const pend = await JoinRequest.find({
      idea: { $in: mineIds },
      status: "en_attente",
    })
      .select("idea")
      .lean();
    for (const r of pend) {
      const k = String(r.idea);
      pendingByIdea.set(k, (pendingByIdea.get(k) || 0) + 1);
    }
  }

  const labsOf = (i) => [...new Set(i.membres.map((m) => person.get(String(m))?.lab).filter(Boolean))];
  const coordName = (i) => person.get(String(i.coord))?.name ?? null;

  const openItem = (i) => {
    const member = isMine(i);
    return {
      id: i._id,
      title: i.title,
      angle: i.angle,
      has: i.has,
      want: i.want,
      membresCount: i.membres.length,
      labs: labsOf(i),
      coordName: coordName(i),
      ...(member ? { pendingCount: pendingByIdea.get(String(i._id)) || 0 } : {}),
    };
  };

  const closedItem = (i) => {
    // Non-membre : titre seul (+ compteur et statut). Jamais angle, full ni membres.
    if (!isMine(i)) {
      return { id: i._id, title: i.title, membresCount: i.membres.length, status: i.status };
    }
    // Membre : la fiche complète.
    return {
      id: i._id,
      title: i.title,
      status: i.status,
      angle: i.angle,
      has: i.has,
      want: i.want,
      full: i.full,
      membresCount: i.membres.length,
      coordName: coordName(i),
      labs: labsOf(i),
      membres: i.membres.map((m) => {
        const p = person.get(String(m));
        return { id: m, name: p?.name ?? null, lab: p?.lab ?? null };
      }),
      pendingCount: pendingByIdea.get(String(i._id)) || 0,
    };
  };

  const open = [];
  const closed = [];
  for (const i of visible) {
    if (isOpen(i)) open.push(openItem(i));
    else closed.push(closedItem(i));
  }

  return json({
    challenge: {
      ref: challenge.ref,
      title: challenge.title,
      desc: challenge.desc,
      theme: challenge.theme,
      owner: challenge.owner,
      referent: challenge.referent ?? null,
      pdf: challenge.pdf ?? null,
      image: challenge.image ?? null,
    },
    open,
    closed,
  });
});
