import crypto from "node:crypto";
import { dbConnect } from "@/lib/db";
import { Participant } from "@/lib/models";
import { hashPassword } from "@/lib/passwords";
import { handler, json, fail } from "@/lib/http";

const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

export const POST = handler(async (req) => {
  const body = await req.json().catch(() => ({}));
  const token = body.token || "";
  const password = body.password || "";

  if (password.length < 8) return fail("Huit caractères minimum.");

  await dbConnect();

  // Token valide = hash correspondant ET non expiré.
  const me = token
    ? await Participant.findOne({
        resetToken: hashToken(token),
        resetExpires: { $gt: new Date() },
      }).select("+resetToken +resetExpires")
    : null;

  if (!me) return fail("Ce lien a expiré. Demandez-en un nouveau.", 400);

  me.passwordHash = await hashPassword(password);
  me.resetToken = undefined; // token à usage unique : consommé
  me.resetExpires = undefined;
  await me.save();

  return json({ ok: true });
});
