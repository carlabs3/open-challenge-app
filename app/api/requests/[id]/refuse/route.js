import { dbConnect } from "@/lib/db";
import { Idea, JoinRequest } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/requests/:id/refuse — refuser une demande. Coordinateur (ou staff).
 * Pas de motif obligatoire : l'exiger fait que personne ne répond (voir API.md).
 */
export const POST = handler(async (_req, { params }) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  const request = await JoinRequest.findById(params.id);
  if (!request) return fail("Cette demande n'existe plus.", 404);
  if (request.status !== "en_attente") return fail("Cette demande a déjà été traitée.", 409);

  const idea = await Idea.findById(request.idea).lean();
  const staff = ["organisateur", "admin"].includes(me.role);
  if (String(idea.coord) !== String(me._id) && !staff) {
    return fail("Seul le coordinateur de l'idée peut refuser une demande.", 403);
  }

  request.status = "refusee";
  request.decidedBy = me._id;
  request.decidedAt = new Date();
  await request.save();

  await notify(
    request.from,
    "demande",
    `Votre demande pour « ${idea.title} » n'a pas été retenue. D'autres équipes cherchent encore des profils.`
  );

  return json({ ok: true });
});
