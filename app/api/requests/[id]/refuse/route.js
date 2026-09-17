import { dbConnect } from "@/lib/db";
import { Idea, JoinRequest, Participant } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { send } from "@/lib/mail";
import { demandeRefusee } from "@/lib/emails";
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
  // Une invitation se refuse par la personne invitée elle-même ; une demande, par
  // le coordinateur (ou le staff). Symétrique de la route accept.
  if (request.direction === "invitation") {
    if (String(request.from) !== String(me._id)) {
      return fail("Seule la personne invitée peut refuser cette invitation.", 403);
    }
  } else if (String(idea.coord) !== String(me._id) && !staff) {
    return fail("Seul le coordinateur de l'idée peut refuser une demande.", 403);
  }

  request.status = "refusee";
  request.decidedBy = me._id;
  request.decidedAt = new Date();
  await request.save();

  if (request.direction === "invitation") {
    // La personne invitée décline : prévenir qui l'a invitée (à défaut le coordinateur).
    const decliner = await Participant.findById(request.from).select("name").lean();
    await notify(
      request.proposedBy || request.coord,
      "invitation",
      `${decliner?.name ?? "La personne invitée"} a décliné votre invitation à rejoindre « ${idea.title} ».`
    );
  } else {
    await notify(
      request.from,
      "demande",
      `Votre demande pour « ${idea.title} » n'a pas été retenue. D'autres équipes cherchent encore des profils.`
    );
    const asker = await Participant.findById(request.from).select("name email").lean();
    if (asker) await send({ to: asker.email, ...demandeRefusee({ name: asker.name, title: idea.title }) }); // mail 4b
  }

  return json({ ok: true });
});
