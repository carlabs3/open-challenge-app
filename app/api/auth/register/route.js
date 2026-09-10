import { dbConnect } from "@/lib/db";
import { Participant, Notification, LABS, DISCIPLINES, nameKey } from "@/lib/models";
import { hashPassword } from "@/lib/passwords";
import { setSessionCookie } from "@/lib/session";
import { send } from "@/lib/mail";
import { inscription } from "@/lib/emails";
import { handler, json, fail } from "@/lib/http";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Message d'homonymie — repris VERBATIM de la maquette (fonction homonymText).
const homonymText = (lab) =>
  `Un participant du même nom est déjà inscrit (${lab}). Votre inscription est bien enregistrée : ` +
  `l'organisation vérifiera s'il s'agit d'un doublon avant la clôture des équipes.`;

export const POST = handler(async (req) => {
  const body = await req.json().catch(() => ({}));
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const lab = body.lab || "";
  const disc = Array.isArray(body.disc) ? body.disc : [];
  const bio = (body.bio || "").trim();
  const li = (body.li || "").trim();
  const visible = body.visible === true;

  // Validation serveur — mêmes règles et mêmes messages que la maquette.
  if (name.split(" ").filter(Boolean).length < 2) return fail("Indiquez votre nom et votre prénom.");
  if (!EMAIL_RE.test(email)) return fail("Cette adresse n'est pas valide.");
  if (password.length < 8) return fail("Huit caractères minimum.");
  if (!LABS.includes(lab)) return fail("Choisissez votre laboratoire.");
  if (!disc.length || !disc.every((d) => DISCIPLINES.includes(d))) return fail("Cochez au moins une discipline.");

  await dbConnect();

  if (await Participant.exists({ email })) {
    return fail("Cette adresse est déjà inscrite. Connectez-vous plutôt que de créer un second compte.", 409);
  }

  // Homonyme : on prévient, on ne bloque jamais (les homonymes existent).
  const key = nameKey(name);
  const twin = key ? await Participant.findOne({ nameKey: key }).select("lab").lean() : null;

  const passwordHash = await hashPassword(password);
  const me = await Participant.create({ name, email, passwordHash, lab, disc, bio, li, visible });

  let homonymWarning;
  if (twin) {
    homonymWarning = homonymText(twin.lab);
    // Notification « doublon » pour l'organisation (organisateurs + admin).
    const staff = await Participant.find({ role: { $in: ["organisateur", "admin"] } }).select("_id").lean();
    if (staff.length) {
      await Notification.insertMany(
        staff.map((s) => ({
          to: s._id,
          kind: "doublon",
          text: `Homonyme possible à vérifier : ${name} (${lab}).`,
        }))
      );
    }
  }

  // Mail 1 — confirmation d'inscription. Un échec d'envoi ne bloque pas l'inscription.
  await send({ to: me.email, ...inscription({ name }) });

  setSessionCookie(me._id);
  return json({ me: me.toMe(), ...(homonymWarning ? { homonymWarning } : {}) }, 201);
});
