import { dbConnect } from "@/lib/db";
import { Challenge, Idea } from "@/lib/models";
import { buildIdeaViews } from "@/lib/ideas";
import { getSessionParticipant } from "@/lib/session";
import { handler, json, fail } from "@/lib/http";

// Données vives + session par cookie : jamais de prérendu statique au build.
export const dynamic = "force-dynamic";

/**
 * GET /api/challenges/:ref — public.
 * Le défi et ses idées, déjà séparées en `open` / `closed`. Toutes les règles de
 * visibilité vivent dans buildIdeaViews (lib/ideas.js), partagé avec GET /api/ideas.
 */
export const GET = handler(async (_req, { params }) => {
  await dbConnect();

  const challenge = await Challenge.findOne({ ref: params.ref }).lean();
  // TODO à valider — message d'erreur nouveau (défi introuvable).
  if (!challenge) return fail("Ce défi n'existe pas.", 404);

  const me = await getSessionParticipant();
  const all = await Idea.find({ challenge: challenge._id }).lean();

  // `withChallenge: false` : sur la page d'un défi, le défi est implicite.
  const { open, closed } = await buildIdeaViews(all, me, { withChallenge: false });

  return json({
    challenge: {
      ref: challenge.ref,
      title: challenge.title,
      desc: challenge.desc,
      theme: challenge.theme,
      owner: challenge.owner,
      referent: challenge.referent ?? null,
      pdf: challenge.pdf ?? null,
      image: challenge.image ?? null,
    },
    open,
    closed,
  });
});
