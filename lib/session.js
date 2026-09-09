import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import { Participant } from "@/lib/models";

/**
 * Session par cookie httpOnly — même domaine (option B du PLAN.md).
 *
 * Le token JWT ne quitte jamais le corps des réponses : il vit dans une cookie
 * httpOnly que JavaScript ne peut pas lire. C'est ce qui remplace le
 * « token dans le header Authorization » de la version Express.
 */

const COOKIE_NAME = "oc_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours, en secondes

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET manque. Renseignez-le dans .env.local (voir .env.local.example).");
  return s;
}

const signToken = (id) => jwt.sign({ sub: String(id) }, secret(), { expiresIn: "30d" });

/** Pose la cookie de session après une inscription ou une connexion réussie. */
export function setSessionCookie(participantId) {
  cookies().set(COOKIE_NAME, signToken(participantId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Efface la cookie de session (déconnexion). */
export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Renvoie le document Participant de la personne connectée, ou null.
 * Charge le hash exclu par défaut n'est PAS inclus : `select("+passwordHash")`
 * n'est utilisé que là où on vérifie un mot de passe.
 */
export async function getSessionParticipant() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  let sub;
  try {
    ({ sub } = jwt.verify(token, secret()));
  } catch {
    return null; // token invalide ou expiré : visiteur
  }
  await dbConnect();
  return Participant.findById(sub);
}
