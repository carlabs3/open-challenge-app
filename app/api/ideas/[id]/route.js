import { dbConnect } from "@/lib/db";
import { Idea, DISCIPLINES } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

const cleanDisc = (arr) => (Array.isArray(arr) ? arr.filter((d) => DISCIPLINES.includes(d)) : []);

/**
 * PATCH /api/ideas/:id — modifier une idée. Coordinateur OU membre.
 * Champs éditables : title, angle, full, has, want.
 * status / moderation / archived ne sont PAS modifiables ici (voir API.md).
 */
export const PATCH = handler(async (req, { params }) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  const idea = await Idea.findById(params.id);
  if (!idea) return fail("Cette idée n'existe plus.", 404);

  const meId = String(me._id);
  const isMember = String(idea.coord) === meId || idea.membres.some((m) => String(m) === meId);
  if (!isMember) return fail("Seuls les membres de l'équipe peuvent modifier cette idée.", 403);

  const body = await req.json().catch(() => ({}));

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (title.length < 8) return fail("Donnez un titre d'au moins huit caractères.");
    if (title.length > 70) return fail("Le titre ne peut pas dépasser 70 caractères."); // TODO à valider
    idea.title = title;
  }
  if (body.angle !== undefined) {
    const angle = String(body.angle).trim();
    if (angle.length < 20) return fail("Décrivez votre angle en une phrase complète.");
    if (angle.length > 140) return fail("L'angle ne peut pas dépasser 140 caractères."); // TODO à valider
    idea.angle = angle;
  }
  if (body.full !== undefined) idea.full = String(body.full).trim();
  if (body.has !== undefined) idea.has = cleanDisc(body.has);
  if (body.want !== undefined) idea.want = cleanDisc(body.want);

  await idea.save();

  await notify(me._id, "equipe", `Idée « ${idea.title} » modifiée.`);

  return json({ idea: idea.toPublic({ member: true }) });
});
