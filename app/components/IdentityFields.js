"use client";

import { useRouter } from "next/navigation";
import { DISC, LABS } from "@/lib/constants";

/**
 * Bloc « identité » des formulaires proposer / rejoindre, quand la personne
 * n'est pas encore identifiée — port de identityBlock (maquette:956).
 *
 * Contrôlé par le parent (value / onChange). Le parent, à la soumission,
 * appelle d'abord auth.register() avec ces champs (ce qui pose la cookie), puis
 * exécute l'action. C'est ainsi qu'on garde le parcours « première action =
 * inscription » de la maquette avec la session par cookie.
 */
export const EMPTY_IDENTITY = { name: "", email: "", pass: "", lab: "", disc: [], visible: false };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateIdentity(v) {
  const err = {};
  if (v.name.trim().split(" ").filter(Boolean).length < 2) err.name = "Indiquez votre nom et votre prénom.";
  if (!EMAIL_RE.test(v.email.trim())) err.email = "Cette adresse n'est pas valide.";
  if (v.pass.length < 8) err.pass = "Huit caractères minimum.";
  if (!v.lab) err.lab = "Choisissez votre laboratoire.";
  if (!v.disc.length) err.disc = "Cochez au moins une discipline.";
  return err;
}

export default function IdentityFields({ value, onChange, errors = {} }) {
  const router = useRouter();
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const toggleDisc = (k) =>
    onChange({ ...value, disc: value.disc.includes(k) ? value.disc.filter((x) => x !== k) : [...value.disc, k] });
  const Err = ({ msg }) => (msg ? <p className="err">{msg}</p> : null);

  return (
    <div className="ident">
      <div style={{ display: "flex", gap: "14px", alignItems: "baseline", flexWrap: "wrap" }}>
        <p className="small mut">Première action sur le site : ce formulaire vous inscrit en même temps.</p>
        <button type="button" className="link" onClick={() => router.push("/participer")}>
          Déjà inscrit ? Se connecter
        </button>
      </div>

      <div>
        <label>Nom et prénom</label>
        <input type="text" autoComplete="name" value={value.name} onChange={set("name")} />
        <Err msg={errors.name} />
      </div>
      <div>
        <label>Adresse mail institutionnelle</label>
        <input type="email" autoComplete="email" placeholder="prenom.nom@univ-lehavre.fr" value={value.email} onChange={set("email")} />
        <p className="hint">Jamais affichée sur le site.</p>
        <Err msg={errors.email} />
      </div>
      <div>
        <label>Mot de passe</label>
        <input type="password" autoComplete="new-password" value={value.pass} onChange={set("pass")} />
        <p className="hint">Huit caractères minimum.</p>
        <Err msg={errors.pass} />
      </div>
      <div>
        <label>Laboratoire</label>
        <select value={value.lab} onChange={set("lab")}>
          <option value="">Choisir…</option>
          {LABS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <Err msg={errors.lab} />
      </div>
      <div>
        <label>Vos disciplines</label>
        <div className="checks">
          {Object.keys(DISC).map((k) => (
            <label key={k}>
              <input type="checkbox" checked={value.disc.includes(k)} onChange={() => toggleDisc(k)} />
              {DISC[k]}
            </label>
          ))}
        </div>
        <Err msg={errors.disc} />
      </div>
      <div className="consent">
        <input type="checkbox" checked={value.visible} onChange={(e) => onChange({ ...value, visible: e.target.checked })} />
        <label>
          J'accepte d'apparaître sur la page « Qui participe » avec mon nom, mon laboratoire et mes
          disciplines.
        </label>
      </div>
    </div>
  );
}
