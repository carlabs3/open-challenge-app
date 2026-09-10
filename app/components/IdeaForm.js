"use client";

import { useState } from "react";
import { auth, createIdea, updateIdea } from "@/lib/api";
import { DISC } from "@/lib/constants";
import IdentityFields, { EMPTY_IDENTITY, validateIdentity } from "./IdentityFields";

/**
 * Formulaire proposer / modifier une idée — port de #idea-form (maquette:529)
 * et de son handler (:1548). Deux champs publics (titre, angle), une description
 * privée, disciplines présentes et profils recherchés.
 *
 * Si la personne n'est pas connectée, le bloc identité l'inscrit d'abord
 * (auth.register pose la cookie), puis on crée l'idée.
 */
export default function IdeaForm({ challengeRef, editing, me, onDone, onCancel }) {
  const [title, setTitle] = useState(editing?.title || "");
  const [angle, setAngle] = useState(editing?.angle || "");
  const [full, setFull] = useState(editing?.full || "");
  const [has, setHas] = useState(editing?.has || []);
  const [want, setWant] = useState(editing?.want || []);
  const [ident, setIdent] = useState(EMPTY_IDENTITY);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  const toggle = (arr, setArr, k) => setArr(arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]);
  const Err = ({ msg }) => (msg ? <p className="err">{msg}</p> : null);

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (title.trim().length < 8) next.title = "Donnez un titre d'au moins huit caractères.";
    if (angle.trim().length < 20) next.angle = "Décrivez votre angle en une phrase complète.";
    let identErr = {};
    if (!me) identErr = validateIdentity(ident);
    setErr({ ...next, ...identErr });
    if (Object.keys(next).length || Object.keys(identErr).length) return;

    setBusy(true);
    try {
      if (!me) {
        await auth.register({
          name: ident.name.trim(),
          email: ident.email.trim(),
          password: ident.pass,
          lab: ident.lab,
          disc: ident.disc,
          visible: ident.visible,
        });
      }
      // Sans profil présent coché, le serveur reprend les disciplines de la personne.
      const payload = { title: title.trim(), angle: angle.trim(), full: full.trim(), has, want };
      if (editing) await updateIdea(editing.id, payload);
      else await createIdea({ challengeRef, ...payload });
      await onDone(editing ? "Modifications enregistrées." : "Idée publiée et inscription enregistrée.");
    } catch (e2) {
      setErr({ form: e2.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" id="idea-form-panel">
      <h3 id="idea-form-title">{editing ? "Modifier l'idée" : "Proposer une idée"}</h3>
      <p className="small mut" style={{ margin: "8px 0 24px", maxWidth: "58ch" }}>
        Deux champs sont publics : le titre et l'angle. La description complète n'est lue que par
        l'organisation et le porteur du défi.
      </p>
      <form id="idea-form" noValidate onSubmit={submit}>
        {!me && <IdentityFields value={ident} onChange={setIdent} errors={err} />}
        <div>
          <label htmlFor="i-title">
            Titre de l'idée <span className="hint" style={{ display: "inline" }}>public</span>
          </label>
          <input type="text" id="i-title" maxLength="70" placeholder="Pilotage prédictif du froid par données de quai" value={title} onChange={(e) => setTitle(e.target.value)} />
          <p className={"counter" + (title.length >= 70 ? " over" : "")}>{title.length} / 70</p>
          <Err msg={err.title} />
        </div>
        <div>
          <label htmlFor="i-angle">
            Votre angle en une phrase <span className="hint" style={{ display: "inline" }}>public</span>
          </label>
          <textarea id="i-angle" rows="2" maxLength="140" placeholder="Ce que vous voulez essayer, sans détailler la méthode." value={angle} onChange={(e) => setAngle(e.target.value)} />
          <p className={"counter" + (angle.length >= 140 ? " over" : "")}>{angle.length} / 140</p>
          <Err msg={err.angle} />
        </div>
        <div>
          <label htmlFor="i-full">
            Description complète <span className="hint" style={{ display: "inline" }}>privé</span>
          </label>
          <textarea id="i-full" rows="5" placeholder="Méthode envisagée, données nécessaires, travaux antérieurs." value={full} onChange={(e) => setFull(e.target.value)} />
        </div>
        <div>
          <label>Disciplines déjà dans l'équipe</label>
          <div className="checks">
            {Object.keys(DISC).map((k) => (
              <label key={k}>
                <input type="checkbox" checked={has.includes(k)} onChange={() => toggle(has, setHas, k)} />
                {DISC[k]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label>Profils recherchés</label>
          <div className="checks">
            {Object.keys(DISC).map((k) => (
              <label key={k}>
                <input type="checkbox" checked={want.includes(k)} onChange={() => toggle(want, setWant, k)} />
                {DISC[k]}
              </label>
            ))}
          </div>
          <p className="hint">
            C'est ce qui rend votre idée visible dans les filtres. Sans profil recherché, l'idée
            apparaît comme équipe complète.
          </p>
        </div>
        <Err msg={err.form} />
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-p" disabled={busy}>
            {editing ? "Enregistrer" : "Publier l'idée"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
