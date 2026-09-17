"use client";

import { useState } from "react";
import { invite } from "@/lib/api";
import { DISC } from "@/lib/constants";

/**
 * Fiche d'un participant, présentée dans un <Modal>. Profil complet, JAMAIS
 * l'adresse mail. Utilisée par « Participants » ET par « Mon équipe » (mêmes
 * champs, même composant).
 *
 * L'invitation n'apparaît que si `onInvited` est fourni (page « Participants ») :
 * dans « Mon équipe », on regarde un coéquipier, il n'y a rien à inviter.
 *
 * `participant` : { id, name, lab, disc[], bio, li, challengeRef | null }.
 * `onClose`     : ferme le modal (bouton « Fermer »).
 * `me`, `myIdea`, `onInvited` : contexte d'invitation (facultatif).
 */
export default function ParticipantFiche({ participant: p, onClose, me, myIdea, onInvited }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteNote, setInviteNote] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [busy, setBusy] = useState(false);

  const inviteEnabled = typeof onInvited === "function";

  // Conditions d'invitation (revalidées côté serveur). Voir /api/ideas/[id]/invite.
  function inviteState() {
    if (!inviteEnabled || !p) return { canShow: false };
    const iAmInTeam = !!myIdea;
    const teamOpen = myIdea?.status === "ouverte";
    const isSelf = me && String(p.id) === String(me.id);
    if (!iAmInTeam || !teamOpen || isSelf) return { canShow: false };

    const freeSlots = 5 - (myIdea.membresCount ?? 0);
    const pendingInv = myIdea.pendingInvitations ?? 0;
    const personHasTeam = !!p.challengeRef;
    const personInProgress = (myIdea.inProgressFrom || []).map(String).includes(String(p.id));

    // TODO à valider — motifs affichés sous le bouton désactivé.
    let reason = null;
    if (freeSlots <= 0) reason = "Votre équipe est complète : cinq personnes au maximum.";
    else if (pendingInv >= freeSlots)
      reason =
        "Votre équipe compte déjà autant d'invitations en attente que de places libres. Attendez une réponse avant d'en envoyer une autre.";
    else if (personHasTeam) reason = "Cette personne fait déjà partie d'une équipe.";
    else if (personInProgress) reason = "Cette personne a déjà une demande ou une invitation en cours sur votre équipe.";

    return { canShow: true, reason };
  }
  const invSt = inviteState();

  async function doInvite() {
    setBusy(true);
    setInviteErr("");
    try {
      await invite(myIdea.id, p.id, inviteNote.trim());
      // TODO à valider — message de confirmation.
      await onInvited(`Invitation envoyée à ${p.name}. Elle part par mail : la personne accepte ou refuse depuis son espace.`);
    } catch (e) {
      setInviteErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" id="fiche-panel">
      <h3 id="fiche-name">{p.name}</h3>
      <p className="small mut" style={{ margin: "6px 0 14px" }}>
        {p.lab}
        {p.challengeRef ? ` · participe au défi ${p.challengeRef}` : ""}
      </p>
      {p.bio && <p style={{ maxWidth: "60ch" }}>{p.bio}</p>}
      <div className="tags" style={{ marginTop: "14px" }}>
        {(p.disc || []).map((k) => (
          <span className="pill s" key={k}>
            {DISC[k]}
          </span>
        ))}
      </div>
      {p.li && (
        <p style={{ marginTop: "16px" }}>
          <a className="li" href={p.li} target="_blank" rel="noopener">
            LinkedIn ↗
          </a>
        </p>
      )}

      {invSt.canShow && (
        <div style={{ marginTop: "22px", borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
          {!inviteOpen ? (
            <>
              {/* TODO à valider — bouton d'invitation. */}
              <button
                type="button"
                className={"btn btn-s" + (invSt.reason ? " btn-ghost" : " btn-g")}
                disabled={!!invSt.reason}
                onClick={() => setInviteOpen(true)}
              >
                Inviter dans mon équipe
              </button>
              {invSt.reason && (
                <p className="small mut" style={{ marginTop: "10px" }}>
                  {invSt.reason}
                </p>
              )}
            </>
          ) : (
            <div>
              {/* TODO à valider — panneau d'invitation. */}
              <h4 style={{ margin: "0 0 12px" }}>
                Inviter {p.name} dans « {myIdea.title} »
              </h4>
              <label htmlFor="inv-note">Un mot pour {p.name} (facultatif)</label>
              <textarea id="inv-note" rows="3" value={inviteNote} onChange={(e) => setInviteNote(e.target.value)} />
              {inviteErr && <p className="err">{inviteErr}</p>}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                <button type="button" className="btn btn-p" disabled={busy} onClick={doInvite}>
                  Envoyer l'invitation
                </button>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setInviteOpen(false)}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p style={{ marginTop: "22px" }}>
        <button type="button" className="btn btn-s btn-ghost" onClick={onClose}>
          Fermer
        </button>
      </p>
    </div>
  );
}
