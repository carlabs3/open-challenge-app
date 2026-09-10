import { dbConnect } from "@/lib/db";
import { Idea, JoinRequest } from "@/lib/models";
import { getSessionParticipant } from "@/lib/session";
import { notify } from "@/lib/notify";
import { handler, json, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/ideas/:id/requests — demander à rejoindre une équipe.
 * 409 si : la personne a déjà une équipe, a déjà une demande en attente sur
 * cette idée, ou l'idée est close (voir API.md).
 */
export const POST = handler(async (req, { params }) => {
  const me = await getSessionParticipant();
  if (!me) return fail("Votre session a expiré. Reconnectez-vous.", 401);

  await dbConnect();
  const idea = await Idea.findById(params.id);
  if (!idea) return fail("Cette idée n'existe plus.", 404);

  if (me.ideaId) {
    return fail("Vous faites déjà partie d'une équipe. Une seule équipe par personne.", 409);
  }
  const meId = String(me._id);
  if (String(idea.coord) === meId || idea.membres.some((m) => String(m) === meId)) {
    return fail("Vous faites déjà partie de cette équipe.", 409);
  }
  if (idea.status === "fermee") {
    return fail("Les candidatures de cette idée sont closes.", 409);
  }

  const body = await req.json().catch(() => ({}));
  const note = (body.note || "").trim();

  let request;
  try {
    request = await JoinRequest.create({
      idea: idea._id,
      from: me._id,
      coord: idea.coord,
      direction: "demande",
      note,
      status: "en_attente",
    });
  } catch (e) {
    // 11000 = l'index partiel unique {idea, from, en_attente} a bloqué un doublon.
    if (e?.code === 11000) return fail("Vous avez déjà une demande en attente sur cette idée.", 409);
    throw e;
  }

  // Prévenir tous les membres de l'équipe, avec la note.
  for (const m of idea.membres) {
    await notify(
      m,
      "demande",
      `${me.name} souhaite rejoindre « ${idea.title} »${note ? ` : « ${note} »` : "."}`
    );
  }

  return json({ request }, 201);
});
