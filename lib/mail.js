/**
 * Envoi d'e-mails via Resend — SEUL point d'appel. Aucun composant ni route
 * n'appelle Resend directement.
 *
 * Règles :
 * - Ne JAMAIS lever d'exception : un échec d'envoi ne doit pas faire échouer
 *   l'action de l'utilisateur (inscription, demande…). On journalise et on continue.
 * - Ne jamais journaliser le corps du message : il peut contenir un lien de
 *   réinitialisation. On ne loggue que { destinataire, sujet, statut }.
 * - MAIL_TEST_REDIRECT : si défini, tous les mails partent vers cette adresse,
 *   le vrai destinataire écrit dans le sujet. Évite d'envoyer à de fausses
 *   adresses tant que la base contient des données fictives.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function send({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const replyTo = process.env.MAIL_REPLY_TO;
  const redirect = process.env.MAIL_TEST_REDIRECT;

  if (!key || !from) {
    // Pas de clé (dev local sans envoi, ou variables absentes du runtime) : on
    // n'envoie pas, on ne bloque pas. Ce log dit exactement quelle variable manque.
    console.warn(
      `[mail] IGNORÉ → ${to} | ${subject} | manquant: ${!key ? "RESEND_API_KEY " : ""}${!from ? "MAIL_FROM" : ""}`
    );
    return { skipped: true };
  }

  const finalTo = redirect || to;
  const finalSubject = redirect ? `[test → ${to}] ${subject}` : subject;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to: finalTo,
        subject: finalSubject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      // Erreur complète de Resend (statut + corps) pour pouvoir diagnostiquer.
      console.error(`[mail] ÉCHEC ${res.status} → ${to} | ${subject} | réponse: ${body.slice(0, 500)}`);
      return { ok: false, status: res.status };
    }
    // Succès : on journalise le destinataire réel, le sujet et l'id renvoyé par Resend.
    let id = "";
    try {
      id = JSON.parse(body)?.id || "";
    } catch {
      /* corps non-JSON */
    }
    console.log(
      `[mail] ENVOYÉ → ${to}${redirect ? ` (redirigé vers ${redirect})` : ""} | ${subject} | resend id: ${id}`
    );
    return { ok: true, id };
  } catch (e) {
    console.error(`[mail] ERREUR RÉSEAU → ${to} | ${subject} | ${e.message}`);
    return { ok: false };
  }
}
