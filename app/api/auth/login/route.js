import { dbConnect } from "@/lib/db";
import { Participant } from "@/lib/models";
import { verifyPassword } from "@/lib/passwords";
import { setSessionCookie } from "@/lib/session";
import { handler, json, fail } from "@/lib/http";

// Un seul message pour « adresse inexistante » et « mot de passe incorrect » :
// ne pas révéler si une adresse est inscrite.
const WRONG = "Adresse ou mot de passe incorrect.";

export const POST = handler(async (req) => {
  const body = await req.json().catch(() => ({}));
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  await dbConnect();

  // passwordHash est `select: false` : il faut le demander explicitement.
  const me = await Participant.findOne({ email }).select("+passwordHash");
  if (!me) return fail(WRONG, 401);

  const ok = await verifyPassword(password, me.passwordHash);
  if (!ok) return fail(WRONG, 401);

  setSessionCookie(me._id);
  return json({ me: me.toMe() });
});
