"use client";

import { useState } from "react";
import { auth, requestJoin } from "@/lib/api";
import IdentityFields, { EMPTY_IDENTITY, validateIdentity } from "./IdentityFields";

/**
 * Formulaire « rejoindre une équipe » — port de #join-panel (maquette:567) et de
 * son handler (:1583). La demande part au coordinateur ; l'adresse mail du
 * demandeur ne lui est jamais communiquée.
 *
 * Comme pour la proposition d'idée : inscription puis action, en deux appels
 * séparés. Si l'inscription réussit mais que la demande échoue, le compte
 * EXISTE — on le dit et on propose de réessayer la seule action.
 */
export default function JoinForm({ idea, me, onDone, onCancel }) {
  const [note, setNote] = useState("");
  const [ident, setIdent] = useState(EMPTY_IDENTITY);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [splitError, setSplitError] = useState("");

  const identityNeeded = !me && !accountCreated;

  async function submit(e) {
    if (e?.preventDefault) e.preventDefault();
    setSplitError("");

    const identErr = identityNeeded ? validateIdentity(ident) : {};
    setErr(identErr);
    if (Object.keys(identErr).length) return;

    setBusy(true);

    // 1. Inscription (si nécessaire). Échec ici = erreur normale.
    if (identityNeeded) {
      try {
        await auth.register({
          name: ident.name.trim(),
          email: ident.email.trim(),
          password: ident.pass,
          lab: ident.lab,
          disc: ident.disc,
          visible: ident.visible,
        });
        setAccountCreated(true);
      } catch (regErr) {
        setErr({ form: regErr.message });
        setBusy(false);
        return;
      }
    }

    // 2. Demande. Si elle échoue après une inscription réussie, on le dit.
    try {
      await requestJoin(idea.id, note.trim());
      await onDone(
        `Demande envoyée à « ${idea.title} ». Les membres de l'équipe reçoivent votre mot par mail et répondent sous 48 h.`
      );
    } catch (actionErr) {
      if (!me) setSplitError(actionErr.message);
      else setErr({ form: actionErr.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" id="join-panel">
      <h3 id="join-title">Rejoindre « {idea.title} »</h3>
      <p className="small mut" style={{ margin: "8px 0 24px", maxWidth: "58ch" }}>
        Votre demande part au coordinateur de l'idée, qui répond sous 48 h. Votre adresse mail ne lui
        est pas communiquée.
      </p>

      {splitError && (
        // TODO à valider — message nouveau (compte créé mais demande échouée).
        <div className="warn" style={{ maxWidth: "62ch", marginBottom: "22px" }}>
          <p>
            Votre compte a bien été créé, mais votre demande n'a pas pu être envoyée : {splitError}{" "}
            Vous êtes maintenant identifié — réessayez, votre message est conservé.
          </p>
          <button type="button" className="btn btn-s btn-p" style={{ marginTop: "14px" }} disabled={busy} onClick={() => submit()}>
            Réessayer d'envoyer
          </button>
        </div>
      )}

      <form id="join-form" noValidate onSubmit={submit}>
        {identityNeeded && <IdentityFields value={ident} onChange={setIdent} errors={err} />}
        <div>
          <label htmlFor="j-note">Un mot pour l'équipe</label>
          <textarea id="j-note" rows="3" placeholder="Ce que vous pouvez apporter sur ce défi." value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="hint">Les membres de l'équipe reçoivent ce message avec votre demande.</p>
          {err.form && <p className="err">{err.form}</p>}
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-p" disabled={busy}>
            Envoyer ma demande
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
