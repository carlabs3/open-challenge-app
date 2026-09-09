const router = require("express").Router();
const { Participant, Idea, JoinRequest } = require("../models");
const { notify } = require("../services/notify");

/**
 * POST /api/requests/:id/accept
 *
 * La règle « une personne = une équipe = un défi » se joue ici.
 *
 * L'ORDRE DES DEUX ÉCRITURES EST LE POINT CRITIQUE. On réserve d'abord la
 * personne avec une écriture atomique conditionnée à `ideaId: null`, et on ne
 * touche à l'équipe que si la réservation a réussi. Dans l'autre sens, deux
 * coordinateurs qui acceptent la même personne en même temps la feraient
 * entrer dans deux équipes : les deux lectures verraient `ideaId: null`.
 */
router.post("/:id/accept", async (req, res, next) => {
  try {
    const request = await JoinRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Cette demande n'existe plus." });
    if (request.status !== "en_attente") {
      return res.status(409).json({ error: "Cette demande a déjà été traitée." });
    }

    const idea = await Idea.findById(request.idea);
    if (!idea) return res.status(404).json({ error: "Cette idée n'existe plus." });

    // Le coordinateur décide. L'organisation peut trancher à sa place
    // (coordinateur silencieux au-delà de 72 h).
    const staff = ["organisateur", "admin"].includes(req.me.role);
    if (String(idea.coord) !== String(req.me._id) && !staff) {
      return res.status(403).json({ error: "Seul le coordinateur de l'idée peut accepter une demande." });
    }
    if (idea.status === "fermee") {
      return res.status(409).json({ error: "Les candidatures de cette idée sont closes." });
    }
    if (idea.membres.length >= 5) {
      return res.status(409).json({ error: "Cette équipe est complète (5 personnes maximum)." });
    }

    // 1. Réserver la personne — échoue si elle a rejoint une autre équipe entre-temps
    const claimed = await Participant.findOneAndUpdate(
      { _id: request.from, ideaId: null },
      { $set: { ideaId: idea._id } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({
        error: "Cette personne a rejoint une autre équipe entre-temps. Sa demande a été annulée.",
      });
    }

    // 2. L'ajouter à l'équipe, compléter les disciplines présentes,
    //    retirer des profils recherchés ceux qu'elle apporte
    await Idea.updateOne({ _id: idea._id }, {
      $addToSet: { membres: claimed._id, has: { $each: claimed.disc } },
      $pull: { want: { $in: claimed.disc } },
    });

    // 3. Clore la demande acceptée
    request.status = "acceptee";
    request.decidedBy = req.me._id;
    request.decidedAt = new Date();
    await request.save();

    // 4. Annuler ses autres demandes en attente : elle ne peut être que dans
    //    une seule équipe, et laisser les autres ouvertes ferait attendre
    //    d'autres coordinateurs pour rien
    const cancelled = await JoinRequest.find({
      from: claimed._id, status: "en_attente", _id: { $ne: request._id },
    });
    await JoinRequest.updateMany(
      { _id: { $in: cancelled.map(c => c._id) } },
      { $set: { status: "annulee", decidedAt: new Date() } }
    );

    // 5. Prévenir : le mail est le canal principal, la cloche en est le reflet
    await notify(claimed._id, "equipe",
      `Votre demande pour « ${idea.title} » a été acceptée. Vous faites maintenant partie de l'équipe.`);
    for (const other of cancelled) {
      const otherIdea = await Idea.findById(other.idea).lean();
      await notify(other.coord, "demande",
        `${claimed.name} a rejoint une autre équipe : sa demande sur « ${otherIdea?.title ?? "une idée"} » est annulée.`);
    }
    for (const m of idea.membres) {
      if (String(m) !== String(req.me._id)) {
        await notify(m, "equipe", `${claimed.name} rejoint votre équipe.`);
      }
    }

    const fresh = await Idea.findById(idea._id);
    res.json({ idea: fresh.toPublic({ member: true }), cancelled: cancelled.length });
  } catch (e) { next(e); }
});

/** POST /api/requests/:id/refuse — pas de motif obligatoire : l'exiger fait que personne ne répond. */
router.post("/:id/refuse", async (req, res, next) => {
  try {
    const request = await JoinRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Cette demande n'existe plus." });
    if (request.status !== "en_attente") {
      return res.status(409).json({ error: "Cette demande a déjà été traitée." });
    }
    const idea = await Idea.findById(request.idea).lean();
    const staff = ["organisateur", "admin"].includes(req.me.role);
    if (String(idea.coord) !== String(req.me._id) && !staff) {
      return res.status(403).json({ error: "Seul le coordinateur de l'idée peut refuser une demande." });
    }

    request.status = "refusee";
    request.decidedBy = req.me._id;
    request.decidedAt = new Date();
    await request.save();

    await notify(request.from, "demande",
      `Votre demande pour « ${idea.title} » n'a pas été retenue. D'autres équipes cherchent encore des profils.`);

    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
