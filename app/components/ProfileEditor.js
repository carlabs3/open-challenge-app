"use client";

import { useState } from "react";
import { updateMe, changePassword } from "@/lib/api";
import { DISC, LABS } from "@/lib/constants";

/**
 * Formulaire plié « Modifier mes informations » de Mon espace (RGPD :
 * rectification + retrait du consentement de visibilité). Réutilise les classes
 * et les messages d'erreur du formulaire d'inscription.
 *
 * L'e-mail ne s'édite pas ici (identité du compte). Le mot de passe se change
 * dans son propre bloc, en demandant l'actuel.
 */
const validLi = (s) => s === "" || /^https?:\/\/\S+\.\S+/.test(s);
const ORGA_MAILTO =
  "mailto:open-challenge@univ-lehavre.fr?subject=Open%20Challenge%20%E2%80%94%20changement%20d'adresse%20mail";

export default function ProfileEditor({ me, refresh }) {
  const [open, setOpen] = useState(false);
  const hasTeam = !!me.ideaId;

  // --- infos ---
  const [f, setF] = useState({
    name: me.name || "",
    lab: me.lab || "",
    disc: me.disc || [],
    bio: me.bio || "",
    li: me.li || "",
    visible: !!me.visible,
    chercheEquipe: me.chercheEquipe || "cherche",
  });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // --- mot de passe ---
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwErr, setPwErr] = useState({});
  const [pwShow, setPwShow] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNotice, setPwNotice] = useState("");

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const toggleDisc = (k) =>
    setF((p) => ({ ...p, disc: p.disc.includes(k) ? p.disc.filter((x) => x !== k) : [...p.disc, k] }));
  const Err = ({ msg }) => (msg ? <p className="err">{msg}</p> : null);

  async function saveInfos(e) {
    e.preventDefault();
    const next = {};
    if (f.name.trim().split(" ").filter(Boolean).length < 2) next.name = "Indiquez votre nom et votre prénom.";
    if (!f.lab) next.lab = "Choisissez votre laboratoire.";
    if (!f.disc.length) next.disc = "Cochez au moins une discipline.";
    if (f.bio.length > 220) next.bio = "La bio ne peut pas dépasser 220 caractères.";
    if (!validLi(f.li.trim())) next.li = "Ce lien n'est pas une adresse valide.";
    setErr(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setNotice("");
    try {
      const payload = {
        name: f.name.trim(),
        lab: f.lab,
        disc: f.disc,
        bio: f.bio.trim(),
        li: f.li.trim(),
        visible: f.visible,
      };
      if (!hasTeam) payload.chercheEquipe = f.chercheEquipe;
      await updateMe(payload);
      await refresh();
      setNotice("Vos informations ont été mises à jour.");
    } catch (e2) {
      setErr({ form: e2.message });
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    const next = {};
    if (!pw.current) next.current = "Entrez votre mot de passe actuel.";
    if (pw.next.length < 8) next.next = "Huit caractères minimum.";
    setPwErr(next);
    if (Object.keys(next).length) return;

    setPwBusy(true);
    setPwNotice("");
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "" });
      setPwNotice("Votre mot de passe a été changé. Un mail de confirmation vous a été envoyé.");
    } catch (e2) {
      // 401 -> « Mot de passe actuel incorrect. »
      setPwErr({ current: e2.message });
    } finally {
      setPwBusy(false);
    }
  }

  if (!open) {
    return (
      <div style={{ marginTop: "22px" }}>
        <button type="button" className="btn btn-s btn-ghost" onClick={() => setOpen(true)}>
          Modifier mes informations
        </button>
      </div>
    );
  }

  return (
    <div className="panel" id="profile-editor">
      <h3>Modifier mes informations</h3>

      {notice && <div className="notice" style={{ margin: "12px 0" }}>{notice}</div>}

      <form noValidate onSubmit={saveInfos}>
        <div>
          <label htmlFor="me-name">Nom et prénom</label>
          <input type="text" id="me-name" autoComplete="name" value={f.name} onChange={set("name")} />
          <Err msg={err.name} />
        </div>
        <div>
          <label htmlFor="me-lab">Laboratoire</label>
          <select id="me-lab" value={f.lab} onChange={set("lab")}>
            <option value="">Choisir…</option>
            {LABS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <Err msg={err.lab} />
        </div>
        <div>
          <label>Vos disciplines</label>
          <div className="checks">
            {Object.keys(DISC).map((k) => (
              <label key={k}>
                <input type="checkbox" checked={f.disc.includes(k)} onChange={() => toggleDisc(k)} />
                {DISC[k]}
              </label>
            ))}
          </div>
          <Err msg={err.disc} />
        </div>
        <div>
          <label htmlFor="me-bio">
            Courte bio <span className="hint" style={{ display: "inline" }}>public · optionnel</span>
          </label>
          <textarea id="me-bio" rows="3" maxLength="220" value={f.bio} onChange={set("bio")} />
          <p className={"counter" + (f.bio.length >= 220 ? " over" : "")}>{f.bio.length} / 220</p>
          <Err msg={err.bio} />
        </div>
        <div>
          <label htmlFor="me-li">
            Profil LinkedIn <span className="hint" style={{ display: "inline" }}>public · optionnel</span>
          </label>
          <input type="url" id="me-li" placeholder="https://www.linkedin.com/in/…" value={f.li} onChange={set("li")} />
          <Err msg={err.li} />
        </div>

        {/* Statut auto-déclaré : éditable seulement sans équipe. */}
        {hasTeam ? (
          <div>
            <label>Statut</label>
            <p className="small mut">Vous faites déjà partie d'une équipe.</p>
          </div>
        ) : (
          <div>
            <label htmlFor="me-cherche">Votre situation</label>
            <select id="me-cherche" value={f.chercheEquipe} onChange={set("chercheEquipe")}>
              <option value="cherche">Je cherche une équipe</option>
              <option value="idee">J'ai une idée</option>
            </select>
          </div>
        )}

        <div className="consent">
          <input type="checkbox" id="me-visible" checked={f.visible} onChange={(e) => setF((p) => ({ ...p, visible: e.target.checked }))} />
          <label htmlFor="me-visible">
            J'accepte que mon nom, mon laboratoire, mes disciplines, ma bio et mon lien LinkedIn
            soient visibles par les autres participants. Mon adresse mail n'est jamais affichée.
          </label>
        </div>
        {/* TODO à valider — précision sur la portée du consentement de visibilité. */}
        <p className="small mut" style={{ maxWidth: "60ch" }}>
          Si vous rejoignez une équipe, vous restez visible pour ses membres et sur la fiche de son
          idée, même si cette case est décochée : ce consentement ne couvre que la liste publique des
          participants.
        </p>

        <Err msg={err.form} />
        <div>
          <button type="submit" className="btn btn-p" disabled={busy}>
            Enregistrer
          </button>
        </div>
      </form>

      {/* E-mail non éditable */}
      <p className="small mut" style={{ maxWidth: "60ch", marginTop: "22px" }}>
        {/* TODO à valider — texte « l'e-mail ne se change pas ici ». */}
        L'adresse mail ne peut pas être changée ici : c'est l'identifiant de votre compte. Pour en
        changer, <a href={ORGA_MAILTO}>écrivez à l'organisation</a>.
      </p>

      {/* Changement de mot de passe */}
      <div style={{ borderTop: "1px solid var(--line)", marginTop: "26px", paddingTop: "26px" }}>
        <h3>Changer le mot de passe</h3>
        {pwNotice && <div className="notice" style={{ margin: "12px 0" }}>{pwNotice}</div>}
        <form noValidate onSubmit={savePassword} style={{ maxWidth: "42ch" }}>
          <div>
            <label htmlFor="me-cur">Mot de passe actuel</label>
            <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
              <input
                type={pwShow ? "text" : "password"}
                id="me-cur"
                autoComplete="current-password"
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              />
              <button type="button" className="btn btn-s btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => setPwShow((s) => !s)}>
                {pwShow ? "Masquer" : "Afficher"}
              </button>
            </div>
            <Err msg={pwErr.current} />
          </div>
          <div>
            <label htmlFor="me-new">Nouveau mot de passe</label>
            <input
              type={pwShow ? "text" : "password"}
              id="me-new"
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
            />
            <p className="hint">Huit caractères minimum.</p>
            <Err msg={pwErr.next} />
          </div>
          <div>
            <button type="submit" className="btn btn-p" disabled={pwBusy}>
              Changer le mot de passe
            </button>
          </div>
        </form>
      </div>

      <div style={{ marginTop: "22px" }}>
        <button type="button" className="link" onClick={() => setOpen(false)}>
          Fermer
        </button>
      </div>
    </div>
  );
}
