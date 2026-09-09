import mongoose from "mongoose";

const { Schema, Types } = mongoose;

/**
 * Modèles Mongoose — port ESM de reference/models.js (l'original Express).
 *
 * En dev, Next recharge ce module à chaque changement ; recompiler un schéma
 * déjà enregistré lève « OverwriteModelError ». D'où le motif
 * `mongoose.models.X || mongoose.model(...)` en bas de fichier.
 */

export const DISCIPLINES = ["info", "energie", "logistique", "donnees", "droit", "environnement", "shs", "gestion"];
export const LABS = ["LOMC", "LITIS", "LMAH", "IDEES", "NIMEC", "GREAH", "LexFEIM", "Autre"];
export const THEMES = ["logistique", "energie", "donnees", "resilience", "environnement", "social"];

/* Clé d'homonymie : minuscules, sans accents, sans séparateurs.
   « Marie-Claire Dupont » et « marie claire dupont » donnent la même valeur.
   Ne sert qu'à PRÉVENIR l'organisation, jamais à bloquer une inscription :
   les homonymes existent. */
export const nameKey = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

const participantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    lab: { type: String, required: true, enum: LABS },
    disc: { type: [String], enum: DISCIPLINES, validate: (v) => v.length > 0 },
    bio: { type: String, maxlength: 220, default: "" },
    li: { type: String, default: "" },
    visible: { type: Boolean, default: false },
    ideaId: { type: Types.ObjectId, ref: "Idea", default: null },
    role: { type: String, enum: ["participant", "organisateur", "admin"], default: "participant" },
    emailVerified: { type: Boolean, default: false },
    nameKey: { type: String, index: true },
    resetToken: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

participantSchema.pre("save", function (next) {
  if (this.isModified("name")) this.nameKey = nameKey(this.name);
  next();
});

/** Vue publique : jamais l'adresse mail, jamais le hash. */
participantSchema.methods.toPublic = function () {
  return {
    id: this._id,
    name: this.name,
    lab: this.lab,
    disc: this.disc,
    bio: this.bio,
    li: this.li,
    ideaId: this.ideaId,
  };
};

/** Vue « moi » : ce que la personne connectée a le droit de voir sur elle-même. */
participantSchema.methods.toMe = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    lab: this.lab,
    disc: this.disc,
    bio: this.bio,
    li: this.li,
    visible: this.visible,
    ideaId: this.ideaId,
    role: this.role,
    emailVerified: this.emailVerified,
  };
};

const challengeSchema = new Schema(
  {
    ref: { type: String, required: true, unique: true }, // "HP-01"
    title: { type: String, required: true },
    desc: { type: String, required: true },
    owner: { type: String, required: true },
    referent: String,
    theme: { type: String, enum: THEMES, required: true },
    pdf: String,
    image: String,
    open: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ideaSchema = new Schema(
  {
    challenge: { type: Types.ObjectId, ref: "Challenge", required: true, index: true },
    title: { type: String, required: true, maxlength: 70 },
    angle: { type: String, required: true, maxlength: 140 },
    full: { type: String, default: "" },
    has: { type: [String], enum: DISCIPLINES, default: [] },
    want: { type: [String], enum: DISCIPLINES, default: [] },
    coord: { type: Types.ObjectId, ref: "Participant", required: true, index: true },
    membres: [{ type: Types.ObjectId, ref: "Participant" }],
    status: { type: String, enum: ["ouverte", "fermee"], default: "ouverte" },
    moderation: { type: String, enum: ["publiee", "validee", "retiree"], default: "publiee" },
    motifRetrait: String,
    archived: { type: Boolean, default: false },
    confirmed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** Ce que voient les autres participants : jamais `full`. */
ideaSchema.methods.toPublic = function (opts = {}) {
  const base = {
    id: this._id,
    title: this.title,
    status: this.status,
    membresCount: this.membres.length,
    confirmed: this.confirmed,
  };
  if (this.status === "fermee" && !opts.member) return base; // équipe close : titre seul
  return {
    ...base,
    angle: this.angle,
    has: this.has,
    want: this.want,
    coord: this.coord,
    membres: this.membres,
    ...(opts.member ? { full: this.full } : {}),
  };
};

const joinRequestSchema = new Schema(
  {
    idea: { type: Types.ObjectId, ref: "Idea", required: true, index: true },
    from: { type: Types.ObjectId, ref: "Participant", required: true, index: true },
    coord: { type: Types.ObjectId, ref: "Participant", required: true, index: true },
    direction: { type: String, enum: ["demande", "invitation"], default: "demande" },
    note: String,
    status: { type: String, enum: ["en_attente", "acceptee", "refusee", "annulee"], default: "en_attente" },
    decidedBy: { type: Types.ObjectId, ref: "Participant" },
    decidedAt: Date,
  },
  { timestamps: true }
);

/* Une seule demande en attente par personne et par idée. */
joinRequestSchema.index(
  { idea: 1, from: 1 },
  { unique: true, partialFilterExpression: { status: "en_attente" } }
);

const notificationSchema = new Schema(
  {
    to: { type: Types.ObjectId, ref: "Participant", required: true, index: true },
    kind: { type: String, required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Participant = mongoose.models.Participant || mongoose.model("Participant", participantSchema);
export const Challenge = mongoose.models.Challenge || mongoose.model("Challenge", challengeSchema);
export const Idea = mongoose.models.Idea || mongoose.model("Idea", ideaSchema);
export const JoinRequest = mongoose.models.JoinRequest || mongoose.model("JoinRequest", joinRequestSchema);
export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
