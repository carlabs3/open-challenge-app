import { dbConnect } from "@/lib/db";
import { Idea, Participant, JoinRequest, Challenge } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { send } from "@/lib/mail";
import { invitation as invitationEmail } from "@/lib/emails";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/ideas/:id/invite — inviter quelqu'un dans son équipe.
 * Le sens inverse d'une demande : seuls les membres de l'idée invitent, et
 * uniquement des participants `visible: true` et sans équipe. Stockée comme
 * JoinRequest `direction: "invitation"` ; c'est la personne invitée qui accepte
 * (voir API.md et l'endpoint accept).
 */
export const POST = handler(async (req, { params }) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  const idea = await Idea.findById(params.id);
  if (!idea) return fail("Cette idée n'existe plus.", 404);

  const meId = String(me._id);
  const isMember = String(idea.coord) === meId || idea.membres.some((m) => String(m) === meId);
  if (!isMember) return fail("Seuls les membres de l'équipe peuvent inviter.", 403);
  if (idea.status === "fermee") return fail("Les candidatures de cette idée sont closes.", 409);
  if (idea.membres.length >= 5) return fail("Cette équipe est complète (5 personnes maximum).", 409);

  const body = await req.json().catch(() => ({}));
  const target = await Participant.findById(body.participantId);
  if (!target) return fail("Cette personne n'existe pas.", 404);
  if (!target.visible) return fail("Cette personne n'apparaît pas dans la liste des participants.", 409);
  if (target.ideaId) return fail("Cette personne fait déjà partie d'une équipe.", 409);

  let invitation;
  try {
    invitation = await JoinRequest.create({
      idea: idea._id,
      from: target._id, // la personne invitée : c'est elle qui sera « réservée » à l'acceptation
      coord: idea.coord,
      direction: "invitation",
      status: "en_attente",
    });
  } catch (e) {
    if (e?.code === 11000) return fail("Cette personne a déjà une invitation ou une demande en attente sur cette idée.", 409);
    throw e;
  }

  await notify(
    target._id,
    "invitation",
    `${me.name} vous invite à rejoindre l'équipe « ${idea.title} ».`
  );
  const chall = await Challenge.findById(idea.challenge).select("ref").lean();
  await send({
    to: target.email,
    ...invitationEmail({ name: target.name, inviterName: me.name, title: idea.title, ref: chall?.ref ?? "" }),
  }); // mail 5

  return json({ invitation }, 201);
});
