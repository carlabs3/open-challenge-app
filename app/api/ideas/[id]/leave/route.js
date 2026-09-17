import { dbConnect } from "@/lib/db";
import { Idea, Participant, JoinRequest } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { send } from "@/lib/mail";
import { membreParti, coordinationTransmise, equipeNouveauCoord } from "@/lib/emails";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/ideas/:id/leave — quitter son équipe.
 *
 * - Membre non coordinateur : sortie directe. On retire de `membres`, `ideaId` à
 *   null, on recalcule `has` (les disciplines que la personne était seule à
 *   apporter disparaissent). On ne touche PAS à `want`.
 * - Coordinateur : doit désigner un successeur (membre actuel) dans la même
 *   action. Ordre critique : coord d'abord, puis réattribution du champ `coord`
 *   dupliqué des JoinRequest en attente, sinon le nouveau coordinateur ne pourra
 *   pas décider des demandes héritées (voir API.md).
 * - Coordinateur seul membre : 409, il n'y a personne à qui transmettre.
 *
 * On ne rouvre jamais une équipe `fermee` passée sous le minimum : `status` reste
 * inchangé.
 */
async function recomputeHas(memberIds) {
  const remaining = await Participant.find({ _id: { $in: memberIds } }).select("disc").lean();
  return [...new Set(remaining.flatMap((p) => p.disc || []))];
}

export const POST = handler(async (req, { params }) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  const idea = await Idea.findById(params.id);
  if (!idea) return fail("Cette idée n'existe plus.", 404);

  const meId = String(me._id);
  const isMember = String(idea.coord) === meId || idea.membres.some((m) => String(m) === meId);
  if (!isMember) return fail("Vous ne faites pas partie de cette équipe.", 403);

  const isCoord = String(idea.coord) === meId;

  // ---- Membre non coordinateur : sortie directe. ----
  if (!isCoord) {
    const remaining = idea.membres.filter((m) => String(m) !== meId);
    idea.membres = remaining;
    idea.has = await recomputeHas(remaining);
    await idea.save();
    await Participant.updateOne({ _id: me._id }, { $set: { ideaId: null } });

    const coord = await Participant.findById(idea.coord).select("name email").lean();
    await notify(
      idea.coord,
      "equipe",
      `${me.name} a quitté votre équipe « ${idea.title} ». Elle compte désormais ${remaining.length} membre(s).`
    );
    if (coord) await send({ to: coord.email, ...membreParti({ name: me.name, title: idea.title, count: remaining.length }) }); // mail 10a
    return json({ ok: true, left: true });
  }

  // ---- Coordinateur. ----
  const otherMembers = idea.membres.filter((m) => String(m) !== meId);
  if (otherMembers.length === 0) {
    // TODO à valider — coordinateur seul membre.
    return fail(
      "Vous êtes le seul membre de cette équipe : il n'y a personne à qui transmettre la coordination. Vous pouvez supprimer l'idée.",
      409
    );
  }

  const body = await req.json().catch(() => ({}));
  const successorId = body.successorId ? String(body.successorId) : "";

  // 1. Valider le successeur : membre actuel, et pas moi-même.
  if (!successorId || successorId === meId || !otherMembers.some((m) => String(m) === successorId)) {
    // TODO à valider — successeur invalide.
    return fail("Choisissez un membre de l'équipe pour reprendre la coordination.", 400);
  }
  const successor = await Participant.findById(successorId).select("name email").lean();
  if (!successor) return fail("Cette personne n'existe plus.", 404);

  const remaining = idea.membres.filter((m) => String(m) !== meId);

  // 2. Transmettre la coordination.
  idea.coord = successor._id;
  // 4. Retirer le sortant, 5. recalculer has.
  idea.membres = remaining;
  idea.has = await recomputeHas(remaining);
  await idea.save();

  // 3. CRITIQUE : réattribuer le champ `coord` dupliqué de TOUTES les demandes /
  // invitations en attente, sinon le nouveau coordinateur ne pourra pas décider.
  // (Il n'y a pas d'état « a_valider » dans l'enum ; « en_attente » couvre tout.)
  await JoinRequest.updateMany({ idea: idea._id, status: "en_attente" }, { $set: { coord: successor._id } });

  // Le sortant n'a plus d'équipe.
  await Participant.updateOne({ _id: me._id }, { $set: { ideaId: null } });

  // Avis + mails : nouveau coordinateur, puis reste de l'équipe.
  await notify(
    successor._id,
    "equipe",
    `${me.name} a quitté l'équipe « ${idea.title} » et vous a transmis la coordination. Les demandes en cours sont désormais à votre décision.`
  );
  await send({ to: successor.email, ...coordinationTransmise({ name: me.name, title: idea.title }) }); // mail 10b

  const teamOthers = remaining.filter((m) => String(m) !== String(successor._id));
  if (teamOthers.length) {
    const members = await Participant.find({ _id: { $in: teamOthers } }).select("name email").lean();
    for (const mb of members) {
      await notify(mb._id, "equipe", `${me.name} a quitté l'équipe. ${successor.name} en assure désormais la coordination.`);
      await send({ to: mb.email, ...equipeNouveauCoord({ name: me.name, successorName: successor.name, title: idea.title }) }); // mail 10c
    }
  }

  return json({ ok: true, left: true, newCoord: String(successor._id) });
});
