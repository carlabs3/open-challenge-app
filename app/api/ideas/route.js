import { dbConnect } from "@/lib/db";
import { Challenge, Idea, Participant, DISCIPLINES } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify, notifyMany } from "@/lib/notify";
import { send } from "@/lib/mail";
import { ideePubliee, ideePublieeOrga } from "@/lib/emails";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

const cleanDisc = (arr) => (Array.isArray(arr) ? arr.filter((d) => DISCIPLINES.includes(d)) : []);

/**
 * POST /api/ideas — proposer une idée. Requiert une session.
 * La règle « une personne = une équipe » est garantie par une réservation
 * atomique du participant conditionnée à `ideaId: null`.
 */
export const POST = handler(async (req) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  const body = await req.json().catch(() => ({}));
  const title = (body.title || "").trim();
  const angle = (body.angle || "").trim();
  const full = (body.full || "").trim();
  const has = cleanDisc(body.has);
  const want = cleanDisc(body.want);

  // Validation serveur — mêmes messages que la maquette pour les minimums.
  if (title.length < 8) return fail("Donnez un titre d'au moins huit caractères.");
  // TODO à valider — message nouveau (dépassement de longueur).
  if (title.length > 70) return fail("Le titre ne peut pas dépasser 70 caractères.");
  if (angle.length < 20) return fail("Décrivez votre angle en une phrase complète.");
  // TODO à valider — message nouveau (dépassement de longueur).
  if (angle.length > 140) return fail("L'angle ne peut pas dépasser 140 caractères.");

  await dbConnect();

  if (me.ideaId) {
    return fail("Vous faites déjà partie d'une équipe. Une seule équipe par personne.", 409);
  }

  const challenge = await Challenge.findOne({ ref: body.challengeRef }).select("_id ref").lean();
  if (!challenge) return fail("Ce défi n'existe pas.", 404);

  // Sans profil recherché explicite, on reprend les disciplines de la personne
  // (maquette:1559) pour que l'idée reste décrite.
  const finalHas = has.length ? has : me.disc.slice();

  const idea = await Idea.create({
    challenge: challenge._id,
    title,
    angle,
    full,
    has: finalHas,
    want,
    coord: me._id,
    membres: [me._id],
    status: "ouverte",
    moderation: "publiee",
    confirmed: false,
  });

  // Réserver la personne : échoue si elle a rejoint une équipe entre-temps.
  const claimed = await Participant.findOneAndUpdate(
    { _id: me._id, ideaId: null },
    { $set: { ideaId: idea._id } }
  );
  if (!claimed) {
    await Idea.deleteOne({ _id: idea._id });
    return fail("Vous faites déjà partie d'une équipe. Une seule équipe par personne.", 409);
  }

  // Prévenir : le coordinateur et l'organisation (notification + mail, ensemble).
  await notify(me._id, "equipe", `Idée « ${title} » publiée sur le défi ${challenge.ref}.`);
  await send({ to: me.email, ...ideePubliee({ name: me.name, title, ref: challenge.ref }) }); // mail 2a

  const staff = await Participant.find({ role: { $in: ["organisateur", "admin"] } }).select("_id email").lean();
  await notifyMany(
    staff.map((s) => s._id),
    "equipe",
    `Nouvelle idée « ${title} » sur le défi ${challenge.ref}, à relire.`
  );
  for (const s of staff) {
    // mail 2b — avis à l'organisation
    await send({ to: s.email, ...ideePublieeOrga({ title, ref: challenge.ref, coordName: me.name }) });
  }

  return json({ idea: idea.toPublic({ member: true }) }, 201);
});
