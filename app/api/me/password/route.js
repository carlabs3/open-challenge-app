import { dbConnect } from "@/lib/db";
import { Participant } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { send } from "@/lib/mail";
import { motDePasseChange } from "@/lib/emails";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/password — changer son mot de passe. Requiert la session ET le
 * mot de passe actuel (sinon quelqu'un ayant volé une session pourrait le changer).
 * Un mail d'avertissement part à l'adresse du compte : c'est ainsi qu'on repère
 * un accès non autorisé.
 */
export const POST = handler(async (req) => {
  const session = await getSessionParticipant();
  if (!session) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  const body = await req.json().catch(() => ({}));
  const currentPassword = body.currentPassword || "";
  const newPassword = body.newPassword || "";

  if (newPassword.length < 8) return fail("Huit caractères minimum.");

  await dbConnect();
  // passwordHash est `select: false` : on le redemande explicitement.
  const me = await Participant.findById(session._id).select("+passwordHash");
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  const ok = await verifyPassword(currentPassword, me.passwordHash);
  // TODO à valider — message nouveau (mot de passe actuel incorrect).
  if (!ok) return fail("Mot de passe actuel incorrect.", 401);

  me.passwordHash = await hashPassword(newPassword);
  await me.save();

  // Mail 9 — avis de changement de mot de passe.
  await send({ to: me.email, ...motDePasseChange({ name: me.name }) });

  return json({ ok: true });
});
