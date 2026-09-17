import { dbConnect } from "@/lib/db";
import { Idea, Participant, JoinRequest } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { send } from "@/lib/mail";
import { ideeSupprimeeMembre, ideeSupprimeeDemande } from "@/lib/emails";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/ideas/:id/delete — supprimer son idée. Coordinateur ou organisation.
 *
 * Rien n'est effacé de la base (règle du projet) : `archived: true`.
 * ORDRE CRITIQUE : on archive l'idée D'ABORD, puis on libère les membres. Dans
 * l'autre sens, une personne libérée pourrait rejoindre une autre équipe pendant
 * que l'idée est encore vive, et se retrouver dans deux équipes.
 */
export const POST = handler(async (_req, { params }) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  const idea = await Idea.findById(params.id);
  if (!idea) return fail("Cette idée n'existe plus.", 404);

  const staff = ["organisateur", "admin"].includes(me.role);
  if (String(idea.coord) !== String(me._id) && !staff) {
    return fail("Seul le coordinateur de l'idée peut la supprimer.", 403);
  }
  if (idea.archived) return fail("Cette idée a déjà été supprimée.", 409);

  // 1. Archiver D'ABORD (jamais de suppression réelle).
  idea.archived = true;
  await idea.save();

  // 2. Annuler les demandes / invitations en attente.
  const pending = await JoinRequest.find({ idea: idea._id, status: "en_attente" });
  if (pending.length) {
    await JoinRequest.updateMany(
      { idea: idea._id, status: "en_attente" },
      { $set: { status: "annulee", decidedAt: new Date() } }
    );
  }

  // 3. Libérer TOUS les membres (coord inclus) : ideaId à null.
  const memberIds = [...new Set([idea.coord, ...idea.membres].map(String))];
  await Participant.updateMany({ _id: { $in: memberIds } }, { $set: { ideaId: null } });

  // 4. Aviso + mail à tous les membres.
  const members = await Participant.find({ _id: { $in: memberIds } }).select("name email").lean();
  for (const mb of members) {
    await notify(mb._id, "equipe", `L'idée « ${idea.title} » a été supprimée. Vous pouvez de nouveau proposer une idée ou rejoindre une autre équipe.`);
    await send({ to: mb.email, ...ideeSupprimeeMembre({ title: idea.title }) }); // mail 11a
  }

  // 5. Aviso + mail aux personnes dont la demande / invitation vient d'être annulée
  // (hors membres, qui ont déjà été prévenus au point 4).
  const memberSet = new Set(memberIds);
  const fromIds = [...new Set(pending.map((r) => String(r.from)))].filter((id) => !memberSet.has(id));
  if (fromIds.length) {
    const askers = await Participant.find({ _id: { $in: fromIds } }).select("name email").lean();
    for (const a of askers) {
      await notify(a._id, "demande", `L'idée « ${idea.title} » a été retirée. Votre demande est annulée.`);
      await send({ to: a.email, ...ideeSupprimeeDemande({ title: idea.title }) }); // mail 11b
    }
  }

  return json({ ok: true, archived: true });
});
