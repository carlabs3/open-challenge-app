import { dbConnect } from "@/lib/db";
import { Notification } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST /api/notifications/read — marque comme lues les notifications de l'utilisateur. */
export const POST = handler(async () => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  await Notification.updateMany({ to: me._id, read: false }, { $set: { read: true } });

  return json({ ok: true });
});
