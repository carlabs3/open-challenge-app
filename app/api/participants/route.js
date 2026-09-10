import { dbConnect } from "@/lib/db";
import { Participant, Idea, Challenge } from "@/lib/models";
import { handler, json } from "@/lib/http";

// Données vives + session par cookie : jamais de prérendu statique au build.
export const dynamic = "force-dynamic";

/**
 * GET /api/participants — public.
 * Uniquement `visible: true`. JAMAIS l'adresse mail.
 * `challengeRef` = la référence du défi de son équipe, ou null s'il n'a pas d'équipe.
 */
export const GET = handler(async () => {
  await dbConnect();

  const people = await Participant.find({ visible: true })
    .select("name lab disc bio li ideaId")
    .lean();

  // ideaId -> challenge._id -> challenge.ref, en deux requêtes groupées.
  const ideaIds = people.map((p) => p.ideaId).filter(Boolean);
  const ideas = ideaIds.length
    ? await Idea.find({ _id: { $in: ideaIds } }).select("challenge").lean()
    : [];
  const challIds = ideas.map((i) => i.challenge);
  const challenges = challIds.length
    ? await Challenge.find({ _id: { $in: challIds } }).select("ref").lean()
    : [];

  const refOfChallenge = new Map(challenges.map((c) => [String(c._id), c.ref]));
  const refOfIdea = new Map(ideas.map((i) => [String(i._id), refOfChallenge.get(String(i.challenge)) ?? null]));

  const rows = people.map((p) => ({
    id: p._id,
    name: p.name,
    lab: p.lab,
    disc: p.disc,
    bio: p.bio,
    li: p.li,
    challengeRef: p.ideaId ? refOfIdea.get(String(p.ideaId)) ?? null : null,
  }));

  return json(rows);
});
