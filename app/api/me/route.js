import { getSessionParticipant } from "@/lib/session";
import { Idea, JoinRequest, Notification } from "@/lib/models";
import { handler, json, fail } from "@/lib/http";

// Données vives + session par cookie : jamais de prérendu statique au build.
export const dynamic = "force-dynamic";

/**
 * GET /api/me — tout « Mon espace » en une seule requête (voir API.md).
 * Requiert une session. C'est aussi la sonde qui prouve que la cookie marche.
 */
export const GET = handler(async () => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  const idea = me.ideaId ? await Idea.findById(me.ideaId) : null;

  const [incoming, outgoing, notifications] = await Promise.all([
    // Demandes reçues sur les idées que je coordonne.
    JoinRequest.find({ coord: me._id, status: "en_attente" }).lean(),
    // Demandes que j'ai envoyées.
    JoinRequest.find({ from: me._id }).lean(),
    Notification.find({ to: me._id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return json({
    me: me.toMe(),
    // Membre de mon équipe : j'ai droit au champ `full`.
    idea: idea ? idea.toPublic({ member: true }) : null,
    requests: { incoming, outgoing },
    notifications,
  });
});
