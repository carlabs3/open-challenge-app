/**
 * Gabarits d'e-mails — texte français à valider (voir « TODO à valider »).
 * Chaque gabarit renvoie { subject, html, text }. Pied de page commun avec le
 * lien de réinitialisation du mot de passe (évite la moitié des demandes de support).
 *
 * Le HTML reste volontairement simple : beaucoup de messageries institutionnelles
 * le bloquent, d'où la version texte systématique.
 */

const APP = () => process.env.APP_URL || "http://localhost:3000";
const esc = (s) =>
  String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// TODO à valider — pied de page commun.
function footerText() {
  return `\n\n—\nOpen Challenge ULHN × HAROPA Port\nMot de passe oublié ? Réinitialisez-le : ${APP()}/participer`;
}
function footerHtml() {
  return `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
<p style="color:#666;font-size:13px">Open Challenge ULHN × HAROPA Port<br>
Mot de passe oublié ? <a href="${APP()}/participer">Réinitialisez-le ici</a>.</p>`;
}

/** Enveloppe : titre + corps + pied. `bodyHtml` et `bodyText` sont déjà échappés/prêts. */
function wrap(bodyHtml, bodyText) {
  return {
    html: `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">${bodyHtml}${footerHtml()}</div>`,
    text: `${bodyText}${footerText()}`,
  };
}

// TODO à valider — 1. Inscription (confirmation d'adresse).
export function inscription({ name }) {
  const t = `Bonjour ${name},\n\nVotre inscription à l'Open Challenge ULHN × HAROPA Port est bien enregistrée. Vous pouvez dès maintenant proposer une idée ou rejoindre une équipe qui cherche votre profil.`;
  const h = `<p>Bonjour ${esc(name)},</p><p>Votre inscription à l'Open Challenge ULHN × HAROPA Port est bien enregistrée. Vous pouvez dès maintenant proposer une idée ou rejoindre une équipe qui cherche votre profil.</p>`;
  return { subject: "Votre inscription à l'Open Challenge est enregistrée", ...wrap(h, t) };
}

// TODO à valider — 2a. Idée publiée (au coordinateur).
export function ideePubliee({ name, title, ref }) {
  const t = `Bonjour ${name},\n\nVotre idée « ${title} » est publiée sur le défi ${ref}. Elle reste marquée « à confirmer » jusqu'à ce que vous l'ouvriez. Les demandes des personnes intéressées vous arriveront par mail.`;
  const h = `<p>Bonjour ${esc(name)},</p><p>Votre idée « ${esc(title)} » est publiée sur le défi ${esc(ref)}. Elle reste marquée « à confirmer » jusqu'à ce que vous l'ouvriez. Les demandes des personnes intéressées vous arriveront par mail.</p>`;
  return { subject: `Votre idée « ${title} » est publiée`, ...wrap(h, t) };
}

// TODO à valider — 2b. Idée publiée (avis à l'organisation).
export function ideePublieeOrga({ title, ref, coordName }) {
  const t = `Une nouvelle idée « ${title} » a été publiée sur le défi ${ref} par ${coordName}. À relire dans l'espace d'organisation.`;
  const h = `<p>Une nouvelle idée « ${esc(title)} » a été publiée sur le défi ${esc(ref)} par ${esc(coordName)}.</p><p>À relire dans l'espace d'organisation.</p>`;
  return { subject: `Nouvelle idée à relire : « ${title} » (${ref})`, ...wrap(h, t) };
}

// TODO à valider — 3. Demande reçue (à chaque membre de l'équipe), avec le mot.
export function demandeRecue({ title, askerName, askerLab, note }) {
  const mot = note ? `\n\nSon message : « ${note} »` : "";
  const motH = note ? `<p>Son message : « ${esc(note)} »</p>` : "";
  const t = `Bonjour,\n\n${askerName} (${askerLab}) souhaite rejoindre votre équipe « ${title} ».${mot}\n\nConnectez-vous à votre espace pour accepter ou refuser.`;
  const h = `<p>Bonjour,</p><p>${esc(askerName)} (${esc(askerLab)}) souhaite rejoindre votre équipe « ${esc(title)} ».</p>${motH}<p>Connectez-vous à votre espace pour accepter ou refuser.</p>`;
  return { subject: `${askerName} souhaite rejoindre « ${title} »`, ...wrap(h, t) };
}

// TODO à valider — 4a. Demande acceptée (au demandeur).
export function demandeAcceptee({ name, title }) {
  const t = `Bonjour ${name},\n\nVotre demande pour rejoindre « ${title} » a été acceptée. Vous faites maintenant partie de l'équipe.`;
  const h = `<p>Bonjour ${esc(name)},</p><p>Votre demande pour rejoindre « ${esc(title)} » a été acceptée. Vous faites maintenant partie de l'équipe.</p>`;
  return { subject: `Votre demande pour « ${title} » a été acceptée`, ...wrap(h, t) };
}

// TODO à valider — 4b. Demande refusée (au demandeur).
export function demandeRefusee({ name, title }) {
  const t = `Bonjour ${name},\n\nVotre demande pour « ${title} » n'a pas été retenue. D'autres équipes cherchent encore des profils comme le vôtre.`;
  const h = `<p>Bonjour ${esc(name)},</p><p>Votre demande pour « ${esc(title)} » n'a pas été retenue. D'autres équipes cherchent encore des profils comme le vôtre.</p>`;
  return { subject: `Votre demande pour « ${title} » n'a pas été retenue`, ...wrap(h, t) };
}

// TODO à valider — 5. Invitation reçue (à la personne invitée).
export function invitation({ name, inviterName, title, ref }) {
  const t = `Bonjour ${name},\n\n${inviterName} vous invite à rejoindre l'équipe « ${title} » sur le défi ${ref}. Connectez-vous à votre espace pour accepter ou refuser l'invitation.`;
  const h = `<p>Bonjour ${esc(name)},</p><p>${esc(inviterName)} vous invite à rejoindre l'équipe « ${esc(title)} » sur le défi ${esc(ref)}. Connectez-vous à votre espace pour accepter ou refuser l'invitation.</p>`;
  return { subject: `${inviterName} vous invite à rejoindre « ${title} »`, ...wrap(h, t) };
}

// TODO à valider — 6. Idée retirée (au coordinateur, avec le motif).
export function ideeRetiree({ name, title, motif }) {
  const t = `Bonjour ${name},\n\nVotre idée « ${title} » a été retirée par l'organisation.\nMotif : ${motif || "non précisé"}.\n\nPour toute question, contactez le comité d'organisation.`;
  const h = `<p>Bonjour ${esc(name)},</p><p>Votre idée « ${esc(title)} » a été retirée par l'organisation.</p><p>Motif : ${esc(motif || "non précisé")}.</p><p>Pour toute question, contactez le comité d'organisation.</p>`;
  return { subject: `Votre idée « ${title} » a été retirée`, ...wrap(h, t) };
}

// TODO à valider — 7. Rappel 72 h (au coordinateur ; copie à l'organisation).
export function rappel72h({ name, title, count }) {
  const n = count > 1 ? `${count} demandes attendent` : `une demande attend`;
  const t = `Bonjour ${name},\n\n${n.charAt(0).toUpperCase() + n.slice(1)} votre réponse depuis plus de 72 heures sur « ${title} ». Connectez-vous pour accepter ou refuser. Sans réponse, l'organisation pourra trancher à votre place.`;
  const h = `<p>Bonjour ${esc(name)},</p><p>${esc(n.charAt(0).toUpperCase() + n.slice(1))} votre réponse depuis plus de 72 heures sur « ${esc(title)} ». Connectez-vous pour accepter ou refuser. Sans réponse, l'organisation pourra trancher à votre place.</p>`;
  return { subject: `Rappel : une demande attend votre réponse depuis plus de 72 h`, ...wrap(h, t) };
}

// TODO à valider — 8. Réinitialisation du mot de passe (lien valable 2 h).
export function resetPassword({ link }) {
  const t = `Bonjour,\n\nVous avez demandé à réinitialiser votre mot de passe. Ouvrez ce lien, valable 2 heures :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
  const h = `<p>Bonjour,</p><p>Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable 2 heures :</p><p><a href="${link}">Choisir un nouveau mot de passe</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`;
  return { subject: "Réinitialisation de votre mot de passe", ...wrap(h, t) };
}
