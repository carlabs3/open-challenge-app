import { dbConnect } from "@/lib/db";
import { Challenge, Idea } from "@/lib/models";
import { isOpen } from "@/lib/ideas";
import { handler, json } from "@/lib/http";

// Données vives + session par cookie : jamais de prérendu statique au build.
export const dynamic = "force-dynamic";

/**
 * GET /api/challenges — public.
 * Les sept défis avec leurs compteurs agrégés, triés par `ideaCount` ASCENDANT
 * (la maquette met les défis vides en premier : voir CLAUDE.md, c'est voulu).
 */
export const GET = handler(async () => {
  await dbConnect();

  const [challenges, ideas] = await Promise.all([
    Challenge.find().lean(),
    // Compteurs publics : jamais les idées retirées ni archivées.
    Idea.find({ moderation: { $ne: "retiree" }, archived: { $ne: true } })
      .select("challenge status want membres")
      .lean(),
  ]);

  const byChallenge = new Map();
  for (const i of ideas) {
    const key = String(i.challenge);
    const c = byChallenge.get(key) || { total: 0, open: 0 };
    c.total += 1;
    if (isOpen(i)) c.open += 1;
    byChallenge.set(key, c);
  }

  const rows = challenges.map((c) => {
    const counts = byChallenge.get(String(c._id)) || { total: 0, open: 0 };
    return {
      ref: c.ref,
      title: c.title,
      desc: c.desc,
      theme: c.theme,
      owner: c.owner,
      referent: c.referent ?? null,
      pdf: c.pdf ?? null,
      image: c.image ?? null,
      ideaCount: counts.total,
      openCount: counts.open,
    };
  });

  // Tri principal : ideaCount croissant. Départage stable par `ref` pour garder
  // l'ordre HP-01…HP-07 à nombre d'idées égal.
  rows.sort((a, b) => a.ideaCount - b.ideaCount || a.ref.localeCompare(b.ref));

  return json(rows);
});
