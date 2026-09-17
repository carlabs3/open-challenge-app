import { dbConnect } from "@/lib/db";
import { Participant, Idea, JoinRequest, Challenge } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { send } from "@/lib/mail";
import { demandeAcceptee, invitationAcceptee, invitationAccepteeInviteur, invitationAnnulee } from "@/lib/emails";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/requests/:id/accept
 *
 * La règle « une personne = une équipe = un défi » se joue ici.
 * L'ORDRE DES DEUX ÉCRITURES EST LE POINT CRITIQUE : on réserve d'abord la
 * personne (écriture atomique conditionnée à `ideaId: null`), on ne touche à
 * l'équipe qu'ensuite. Sinon deux coordinateurs pourraient l'ajouter deux fois.
 * Portage de reference/routes/requests.js.
 *
 * - direction "demande"    : c'est le coordinateur (ou l'organisation) qui accepte.
 * - direction "invitation" : c'est la personne invitée elle-même qui accepte.
 */
export const POST = handler(async (_req, { params }) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  const request = await JoinRequest.findById(params.id);
  if (!request) return fail("Cette demande n'existe plus.", 404);
  if (request.status !== "en_attente") return fail("Cette demande a déjà été traitée.", 409);

  const idea = await Idea.findById(request.idea);
  if (!idea) return fail("Cette idée n'existe plus.", 404);

  const staff = ["organisateur", "admin"].includes(me.role);
  if (request.direction === "invitation") {
    // Seule la personne invitée peut accepter une invitation.
    if (String(request.from) !== String(me._id)) {
      return fail("Seule la personne invitée peut accepter cette invitation.", 403);
    }
  } else if (String(idea.coord) !== String(me._id) && !staff) {
    return fail("Seul le coordinateur de l'idée peut accepter une demande.", 403);
  }

  if (idea.status === "fermee") return fail("Les candidatures de cette idée sont closes.", 409);
  if (idea.membres.length >= 5) return fail("Cette équipe est complète (5 personnes maximum).", 409);

  // 1. Réserver la personne — échoue si elle a rejoint une autre équipe entre-temps.
  const claimed = await Participant.findOneAndUpdate(
    { _id: request.from, ideaId: null },
    { $set: { ideaId: idea._id } },
    { new: true }
  );
  if (!claimed) {
    return fail("Cette personne a rejoint une autre équipe entre-temps. Sa demande a été annulée.", 409);
  }

  // 2. L'ajouter à l'équipe, compléter has, retirer de want ce qu'elle apporte.
  await Idea.updateOne(
    { _id: idea._id },
    { $addToSet: { membres: claimed._id, has: { $each: claimed.disc } }, $pull: { want: { $in: claimed.disc } } }
  );

  // 3. Clore la demande acceptée.
  request.status = "acceptee";
  request.decidedBy = me._id;
  request.decidedAt = new Date();
  await request.save();

  // 4. Annuler ses autres demandes en attente : une seule équipe possible.
  const cancelled = await JoinRequest.find({
    from: claimed._id,
    status: "en_attente",
    _id: { $ne: request._id },
  });
  if (cancelled.length) {
    await JoinRequest.updateMany(
      { _id: { $in: cancelled.map((c) => c._id) } },
      { $set: { status: "annulee", decidedAt: new Date() } }
    );
  }

  // 5. Prévenir (mail = canal principal, cloche = reflet). Le texte diffère selon
  // qu'on accepte une demande (le coordinateur accepte) ou une invitation (la
  // personne invitée accepte elle-même).
  const memberCount = idea.membres.length + 1; // membres d'avant + la personne ajoutée
  if (request.direction === "invitation") {
    const chall = await Challenge.findById(idea.challenge).select("ref").lean();
    await notify(
      claimed._id,
      "equipe",
      `Vous avez rejoint l'équipe « ${idea.title} ». Vous en faites maintenant partie.`
    );
    await send({ to: claimed.email, ...invitationAcceptee({ name: claimed.name, title: idea.title, ref: chall?.ref ?? "" }) }); // mail 4c
    // Avis au membre qui avait invité (proposedBy).
    if (request.proposedBy) {
      const inviter = await Participant.findById(request.proposedBy).select("name email").lean();
      if (inviter) {
        await notify(inviter._id, "invitation", `${claimed.name} a accepté votre invitation à rejoindre « ${idea.title} ».`);
        await send({ to: inviter.email, ...invitationAccepteeInviteur({ name: claimed.name, title: idea.title, count: memberCount }) }); // mail 4d
      }
    }
  } else {
    await notify(
      claimed._id,
      "equipe",
      `Votre demande pour « ${idea.title} » a été acceptée. Vous faites maintenant partie de l'équipe.`
    );
    await send({ to: claimed.email, ...demandeAcceptee({ name: claimed.name, title: idea.title }) }); // mail 4a
  }
  for (const other of cancelled) {
    const otherIdea = await Idea.findById(other.idea).lean();
    await notify(
      other.coord,
      "demande",
      `${claimed.name} a rejoint une autre équipe : sa demande sur « ${otherIdea?.title ?? "une idée"} » est annulée.`
    );
  }
  for (const m of idea.membres) {
    if (String(m) !== String(me._id)) await notify(m, "equipe", `${claimed.name} rejoint votre équipe.`);
  }

  const fresh = await Idea.findById(idea._id);

  // Équipe complète (5 personnes) : les invitations encore en attente de CETTE
  // équipe n'ont plus de place. On les annule et on prévient les personnes (2.5).
  if (fresh.membres.length >= 5) {
    const stillPending = await JoinRequest.find({ idea: idea._id, status: "en_attente", direction: "invitation" });
    if (stillPending.length) {
      await JoinRequest.updateMany(
        { _id: { $in: stillPending.map((r) => r._id) } },
        { $set: { status: "annulee", decidedAt: new Date() } }
      );
      const persons = await Participant.find({ _id: { $in: stillPending.map((r) => r.from) } }).select("name email").lean();
      const perById = new Map(persons.map((p) => [String(p._id), p]));
      for (const inv of stillPending) {
        const per = perById.get(String(inv.from));
        await notify(
          inv.from,
          "invitation",
          `L'équipe « ${idea.title} » a finalisé sa composition : l'invitation qui vous avait été envoyée est annulée.`
        );
        if (per) await send({ to: per.email, ...invitationAnnulee({ name: per.name, title: idea.title }) }); // mail 5c
      }
    }
  }

  return json({ idea: fresh.toPublic({ member: true }), cancelled: cancelled.length });
});
