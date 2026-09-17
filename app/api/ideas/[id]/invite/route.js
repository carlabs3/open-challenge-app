import { dbConnect } from "@/lib/db";
import { Idea, Participant, JoinRequest, Challenge } from "@/lib/models";
import { DISC } from "@/lib/constants";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { send } from "@/lib/mail";
import { invitation as invitationEmail, equipeAInvite } from "@/lib/emails";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/ideas/:id/invite — inviter quelqu'un dans son équipe.
 * Le sens inverse d'une demande : N'IMPORTE QUEL membre de l'équipe invite
 * directement (pas de validation du coordinateur), et uniquement des participants
 * `visible: true` et sans équipe. Stockée comme JoinRequest `direction: "invitation"`,
 * `from` = la personne invitée (c'est elle qui accepte), `proposedBy` = qui a invité.
 *
 * Limite serveur (fait foi, pas le client) : on ne peut pas avoir plus
 * d'invitations en attente que de places libres (places libres = 5 − membres).
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

  // TODO à valider — équipe complète (5 personnes maximum).
  const placesLibres = 5 - idea.membres.length;
  if (placesLibres <= 0) return fail("Votre équipe est complète : cinq personnes au maximum.", 409);

  // Limite d'invitations pendantes = places libres. Calcul serveur, dans la même
  // requête que la création : un décompte côté client ne ferait pas foi.
  const pendingInvitations = await JoinRequest.countDocuments({
    idea: idea._id,
    status: "en_attente",
    direction: "invitation",
  });
  // TODO à valider — autant d'invitations en attente que de places libres.
  if (pendingInvitations >= placesLibres) {
    return fail(
      "Votre équipe compte déjà autant d'invitations en attente que de places libres. Attendez une réponse avant d'en envoyer une autre.",
      409
    );
  }

  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim() : "";

  const target = await Participant.findById(body.participantId);
  if (!target) return fail("Cette personne n'existe pas.", 404);
  if (!target.visible) return fail("Cette personne n'apparaît pas dans la liste des participants.", 409);
  // TODO à valider — cette personne fait déjà partie d'une équipe.
  if (target.ideaId) return fail("Cette personne fait déjà partie d'une équipe.", 409);

  let invitation;
  try {
    invitation = await JoinRequest.create({
      idea: idea._id,
      from: target._id, // la personne invitée : c'est elle qui sera « réservée » à l'acceptation
      coord: idea.coord,
      proposedBy: me._id,
      direction: "invitation",
      status: "en_attente",
      note,
    });
  } catch (e) {
    // Collision de l'index unique { idea, from } partiel sur en_attente : message
    // clair, jamais un 500. TODO à valider — déjà une demande ou une invitation.
    if (e?.code === 11000) {
      return fail("Cette personne a déjà une demande ou une invitation en cours sur votre équipe.", 409);
    }
    throw e;
  }

  const chall = await Challenge.findById(idea.challenge).select("ref").lean();

  // 1. Prévenir la personne invitée (cloche + mail avec lien direct et mot facultatif).
  await notify(target._id, "invitation", `${me.name} vous invite à rejoindre l'équipe « ${idea.title} ».`);
  await send({
    to: target.email,
    ...invitationEmail({ name: target.name, inviterName: me.name, title: idea.title, ref: chall?.ref ?? "", note }),
  }); // mail 5

  // 2. Prévenir les AUTRES membres de l'équipe (pas celui qui invite).
  const profil = [target.lab, (target.disc || []).map((d) => DISC[d]).filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");
  const others = [idea.coord, ...idea.membres].filter((m) => String(m) !== meId);
  const uniqueOthers = [...new Set(others.map(String))];
  if (uniqueOthers.length) {
    const members = await Participant.find({ _id: { $in: uniqueOthers } }).select("name email").lean();
    for (const mb of members) {
      await notify(mb._id, "invitation", `${me.name} a invité ${target.name} à rejoindre « ${idea.title} ».`);
      await send({
        to: mb.email,
        ...equipeAInvite({ inviterName: me.name, name: target.name, profil, title: idea.title }),
      }); // mail 5b
    }
  }

  return json({ invitation }, 201);
});
