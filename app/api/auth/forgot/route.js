import crypto from "node:crypto";
import { dbConnect } from "@/lib/db";
import { Participant } from "@/lib/models";
import { send } from "@/lib/mail";
import { resetPassword } from "@/lib/emails";
import { handler, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const TWO_HOURS = 2 * 60 * 60 * 1000;

// On stocke le HASH du token, jamais le token en clair : une fuite de la base
// ne permettrait pas de réinitialiser un mot de passe.
const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

export const POST = handler(async (req) => {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();

  await dbConnect();
  const me = email ? await Participant.findOne({ email }) : null;

  if (me) {
    const raw = crypto.randomBytes(32).toString("hex");
    me.resetToken = hashToken(raw);
    me.resetExpires = new Date(Date.now() + TWO_HOURS);
    await me.save();

    const base = process.env.APP_URL || "http://localhost:3000";
    const link = `${base}/reset?token=${raw}`;

    // Mail 8 — lien de réinitialisation. En production le token n'est JAMAIS
    // journalisé ; le lien ne part que par mail. En dev on l'écrit en console
    // pour pouvoir tester sans boîte mail.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] Lien de réinitialisation pour ${email} (valable 2 h) : ${link}`);
    }
    await send({ to: me.email, ...resetPassword({ link }) });
  }

  // Toujours 200, que l'adresse existe ou non : ne pas révéler qui est inscrit.
  return json({ ok: true });
});
