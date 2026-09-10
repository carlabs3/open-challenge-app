import { NextResponse } from "next/server";

// Format d'erreur unique : { error: "message en français prêt à afficher" }.
// L'interface montre `error` tel quel, d'où le français (voir API.md).

export const json = (data, status = 200) => NextResponse.json(data, { status });

export const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

const GENERIC = "Une erreur est survenue. Réessayez dans un instant.";

/**
 * Enveloppe un handler pour renvoyer un 500 propre au lieu d'une stack.
 * Les erreurs de validation Mongoose deviennent des 400 lisibles.
 */
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e?.name === "ValidationError") {
        const first = Object.values(e.errors)[0];
        return fail(first?.message || "Données invalides.", 400);
      }
      // Identifiant malformé (ObjectId invalide) : requête invalide, pas un 500.
      if (e?.name === "CastError") {
        return fail("Requête invalide.", 400);
      }
      // 11000 = violation d'index unique (email déjà pris, course sur la demande…)
      if (e?.code === 11000) {
        return fail("Cet enregistrement existe déjà.", 409);
      }
      console.error(e);
      return fail(GENERIC, 500);
    }
  };
}
