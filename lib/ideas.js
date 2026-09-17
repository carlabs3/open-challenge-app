/**
 * Une idée est « ouverte » (elle cherche des membres et apparaît dans les
 * filtres) seulement si : elle n'est pas close, elle affiche au moins un profil
 * recherché, et l'équipe n'est pas complète.
 *
 * Repris VERBATIM de la maquette : open-challenge-ulhn-haropa.html:889
 *   const isOpen = i => i.status === "ouverte" && i.want.length > 0 && i.membres.length < 5;
 *
 * Conséquence voulue : une idée « ouverte » mais pleine (5 membres) ou sans
 * profil recherché bascule côté « équipes constituées », pas côté ouvertes.
 */
export const isOpen = (idea) =>
  idea.status === "ouverte" && (idea.want?.length || 0) > 0 && (idea.membres?.length || 0) < 5;

/**
 * Sérialisation partagée des idées en vues `open` / `closed`, avec TOUTES les
 * règles de visibilité appliquées côté serveur. Utilisé par
 *   - GET /api/challenges/:ref  (un seul défi, `withChallenge: false`)
 *   - GET /api/ideas            (tous les défis, `withChallenge: true`)
 * pour ne pas dupliquer « `full` ne sort jamais », « close = titre seul », etc.
 *
 * `ideas`     : documents lean d'idées (scope déjà choisi par l'appelant).
 * `me`        : participant de session (doc Mongoose) ou null.
 * `withChallenge` : ajoute challengeRef / challengeTitle / challengeTheme à chaque carte.
 * `challOrder`    : Map(challengeIdString -> index de tri) pour classer entre défis
 *                   (GET /api/ideas met les défis dans l'ordre de /defis). Défaut : 0.
 *
 * Ordre à l'intérieur d'un même défi : les idées OUVERTES sont classées par places
 * libres décroissantes (5 − membres.length), départage par ordre d'insertion — pour
 * ne pas concentrer les demandes sur la première idée publiée et laisser la dernière
 * invisible. Les idées CONSTITUÉES gardent l'ordre d'insertion (le tri n'y change rien).
 * Pas d'aléatoire ni de graine par session : l'ordre stable est préférable, les gens
 * reviennent sur la même page et s'attendent à y retrouver la même chose.
 */
export async function buildIdeaViews(ideas, me, { withChallenge = false, challOrder = new Map() } = {}) {
  // Imports différés : ce module est aussi importé par des routes qui n'ont pas
  // besoin des modèles ; on les charge seulement quand on sérialise.
  const { Participant, JoinRequest, Challenge } = await import("@/lib/models");

  const staff = !!me && ["organisateur", "admin"].includes(me.role);
  const meId = me ? String(me._id) : null;
  const isMine = (i) => !!meId && (String(i.coord) === meId || i.membres.some((m) => String(m) === meId));

  // Retirées / archivées : cachées, sauf pour l'organisation et le membre/coord.
  const visible = ideas.filter((i) => (i.moderation !== "retiree" && !i.archived) || staff || isMine(i));

  // Noms + labos des coordinateurs et membres, en une requête.
  const personIds = new Set();
  for (const i of visible) {
    personIds.add(String(i.coord));
    i.membres.forEach((m) => personIds.add(String(m)));
  }
  const people = personIds.size
    ? await Participant.find({ _id: { $in: [...personIds] } }).select("name lab").lean()
    : [];
  const person = new Map(people.map((p) => [String(p._id), p]));

  // Demandes en attente par idée — seulement pour les idées dont je suis membre.
  const pendingByIdea = new Map();
  const mineIds = visible.filter(isMine).map((i) => i._id);
  if (mineIds.length) {
    const pend = await JoinRequest.find({ idea: { $in: mineIds }, status: "en_attente" }).select("idea").lean();
    for (const r of pend) {
      const k = String(r.idea);
      pendingByIdea.set(k, (pendingByIdea.get(k) || 0) + 1);
    }
  }

  // Idées sur lesquelles j'ai déjà une demande en attente (désactive le bouton).
  const requestedByMe = new Set();
  if (meId) {
    const mine = await JoinRequest.find({
      from: me._id,
      status: "en_attente",
      direction: "demande",
      idea: { $in: visible.map((i) => i._id) },
    })
      .select("idea")
      .lean();
    mine.forEach((r) => requestedByMe.add(String(r.idea)));
  }

  // Défis (ref / titre / thème) pour l'affichage global, si demandé.
  let challById = new Map();
  if (withChallenge) {
    const challIds = [...new Set(visible.map((i) => String(i.challenge)))];
    const challs = challIds.length
      ? await Challenge.find({ _id: { $in: challIds } }).select("ref title theme").lean()
      : [];
    challById = new Map(challs.map((c) => [String(c._id), c]));
  }

  const labsOf = (i) => [...new Set(i.membres.map((m) => person.get(String(m))?.lab).filter(Boolean))];
  const coordName = (i) => person.get(String(i.coord))?.name ?? null;
  const flags = (i) => ({
    mine: isMine(i),
    isCoord: !!meId && String(i.coord) === meId,
    requested: requestedByMe.has(String(i._id)),
    confirmed: i.confirmed,
  });
  const challengeInfo = (i) => {
    if (!withChallenge) return {};
    const c = challById.get(String(i.challenge));
    return { challengeRef: c?.ref ?? null, challengeTitle: c?.title ?? null, challengeTheme: c?.theme ?? null };
  };

  const openItem = (i) => {
    const member = isMine(i);
    return {
      id: i._id,
      title: i.title,
      angle: i.angle,
      has: i.has,
      want: i.want,
      membresCount: i.membres.length,
      labs: labsOf(i),
      coordName: coordName(i),
      ...flags(i),
      ...challengeInfo(i),
      ...(member ? { pendingCount: pendingByIdea.get(String(i._id)) || 0, full: i.full } : {}),
    };
  };

  const closedItem = (i) => {
    if (!isMine(i)) {
      return { id: i._id, title: i.title, membresCount: i.membres.length, status: i.status, ...flags(i), ...challengeInfo(i) };
    }
    return {
      id: i._id,
      title: i.title,
      status: i.status,
      angle: i.angle,
      has: i.has,
      want: i.want,
      full: i.full,
      membresCount: i.membres.length,
      coordName: coordName(i),
      labs: labsOf(i),
      membres: i.membres.map((m) => {
        const p = person.get(String(m));
        return { id: m, name: p?.name ?? null, lab: p?.lab ?? null };
      }),
      ...flags(i),
      ...challengeInfo(i),
      pendingCount: pendingByIdea.get(String(i._id)) || 0,
    };
  };

  const idx = (i) => challOrder.get(String(i.challenge)) ?? 0;
  const ins = (i) => new Date(i.createdAt || 0).getTime();
  const free = (i) => 5 - (i.membres?.length || 0); // places libres

  const openRaw = visible.filter(isOpen);
  const closedRaw = visible.filter((i) => !isOpen(i));
  // Ouvertes : ordre inter-défis, puis places libres décroissantes, puis insertion.
  openRaw.sort((a, b) => idx(a) - idx(b) || free(b) - free(a) || ins(a) - ins(b));
  // Constituées : ordre inter-défis, puis insertion (les places libres n'importent plus).
  closedRaw.sort((a, b) => idx(a) - idx(b) || ins(a) - ins(b));

  return { open: openRaw.map(openItem), closed: closedRaw.map(closedItem) };
}
