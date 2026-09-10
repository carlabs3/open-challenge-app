import { dbConnect } from "@/lib/db";
import { Idea, JoinRequest } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/ideas/:id/close — clôturer les candidatures. Coordinateur seul.
 * Les demandes en attente passent à `annulee` et chaque demandeur est prévenu —
 * sinon il attendrait une réponse qui ne viendra jamais (voir API.md).
 */
export const POST = handler(async (_req, { params }) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  const idea = await Idea.findById(params.id);
  if (!idea) return fail("Cette idée n'existe plus.", 404);

  const staff = ["organisateur", "admin"].includes(me.role);
  if (String(idea.coord) !== String(me._id) && !staff) {
    return fail("Seul le coordinateur de l'idée peut clôturer les candidatures.", 403);
  }
  if (idea.status === "fermee") return fail("Les candidatures de cette idée sont déjà closes.", 409);

  idea.status = "fermee";
  await idea.save();

  const pending = await JoinRequest.find({ idea: idea._id, status: "en_attente" });
  if (pending.length) {
    await JoinRequest.updateMany(
      { _id: { $in: pending.map((r) => r._id) } },
      { $set: { status: "annulee", decidedAt: new Date() } }
    );
    for (const r of pending) {
      await notify(
        r.from,
        "demande",
        `L'équipe « ${idea.title} » a clôturé ses candidatures : votre demande n'est plus en attente.`
      );
    }
  }

  await notify(me._id, "equipe", `Vous avez clôturé les candidatures de « ${idea.title} ».`);

  return json({ idea: idea.toPublic({ member: true }), cancelled: pending.length });
});
