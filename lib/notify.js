import { Notification } from "@/lib/models";

/**
 * Crée une notification en base. Le mail (étape 6) partira au même endroit :
 * le mail est le canal principal, la cloche en est le reflet (voir API.md).
 *
 * kind ∈ "demande" | "invitation" | "equipe" | "compte" | "doublon".
 */
export async function notify(to, kind, text) {
  if (!to) return;
  await Notification.create({ to, kind, text });
  // TODO étape 6 (Resend) : envoyer le même message par mail à `to`.
}

/** Notifie plusieurs personnes d'un coup (membres d'une équipe, staff…). */
export async function notifyMany(recipients, kind, text) {
  const ids = [...new Set((recipients || []).map(String))].filter(Boolean);
  if (!ids.length) return;
  await Notification.insertMany(ids.map((to) => ({ to, kind, text })));
  // TODO étape 6 (Resend) : envoyer le même message par mail à chaque destinataire.
}
