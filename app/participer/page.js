"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { DISC, LABS } from "@/lib/constants";
import { useAuth } from "../components/AuthProvider";

/**
 * Participer — port de la vue #v-acces (maquette:615) : inscription + connexion
 * dans une seule page à deux onglets. Validation et messages VERBATIM.
 *
 * Différence d'architecture (assumée) : ici la session est une cookie posée par
 * le serveur ; register/login appellent l'API, puis on recharge et on va sur
 * « Mon espace ». Pas de state en mémoire comme dans la maquette.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function ParticiperPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [tab, setTab] = useState("in");

  return (
    <div className="view on" id="v-acces">
      <section>
        <div className="wrap">
          <p className="lab">Participer</p>
          <h2 style={{ margin: "14px 0 16px" }}>Rejoindre le challenge.</h2>
          <p className="mut" style={{ maxWidth: "62ch", marginBottom: "30px" }}>
            Une seule page pour s'inscrire et pour se connecter. Si vous êtes déjà inscrit, passez
            par le second onglet.
          </p>

          <div className="tabs" role="tablist">
            <button type="button" id="tab-in" role="tab" aria-selected={tab === "in"} onClick={() => setTab("in")}>
              Je m'inscris
            </button>
            <button type="button" id="tab-log" role="tab" aria-selected={tab === "log"} onClick={() => setTab("log")}>
              J'ai déjà un compte
            </button>
          </div>

          {tab === "log" ? (
            <LoginPane router={router} refresh={refresh} />
          ) : (
            <RegisterPane router={router} refresh={refresh} />
          )}

          <div className="demo">
            {/* TODO à valider — cette note d'aide au test peut être retirée avant l'ouverture publique. */}
            <b style={{ fontWeight: 500 }}>Données de test.</b> Comptes de démonstration, mot de passe{" "}
            <b style={{ fontWeight: 500 }}>challenge2026</b>. Pour la vue sans équipe :{" "}
            <b style={{ fontWeight: 500 }}>sophie.marchand@univ-lehavre.fr</b>. Pour la vue
            coordinateur : <b style={{ fontWeight: 500 }}>camille.renaud@univ-lehavre.fr</b>.
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- champ mot de passe avec Afficher/Masquer ---------------- */
function PasswordField({ id, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
      <input
        type={show ? "text" : "password"}
        id={id}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className="btn btn-s btn-ghost"
        style={{ whiteSpace: "nowrap" }}
        onClick={() => setShow((s) => !s)}
      >
        {show ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
}

const Err = ({ msg }) => (msg ? <p className="err">{msg}</p> : null);

/* ---------------- connexion ---------------- */
function LoginPane({ router, refresh }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [errMail, setErrMail] = useState("");
  const [errPass, setErrPass] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotMail, setForgotMail] = useState("");
  const [errForgot, setErrForgot] = useState("");
  const [forgotDone, setForgotDone] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErrMail("");
    setErrPass("");
    if (!EMAIL_RE.test(email.trim())) return setErrMail("Cette adresse n'est pas valide.");
    if (!pass) return setErrPass("Entrez votre mot de passe.");
    try {
      await auth.login(email.trim(), pass);
      await refresh();
      router.push("/mon-espace");
    } catch (err) {
      // Un seul message pour adresse inexistante ou mot de passe incorrect.
      setErrPass(err.message);
    }
  }

  async function submitForgot(e) {
    e.preventDefault();
    setErrForgot("");
    if (!EMAIL_RE.test(forgotMail.trim())) return setErrForgot("Cette adresse n'est pas valide.");
    await auth.forgot(forgotMail.trim()).catch(() => {});
    setForgotOpen(false);
    setForgotMail("");
    setForgotDone(
      "Si cette adresse est inscrite, un mail vient de partir. Le nouveau mot de passe se choisit depuis le lien contenu dans ce mail, valable deux heures."
    );
  }

  return (
    <div id="pane-log">
      <form id="login-form" noValidate onSubmit={submit}>
        <div>
          <label htmlFor="l-mail">Adresse mail</label>
          <input
            type="email"
            id="l-mail"
            autoComplete="email"
            placeholder="prenom.nom@univ-lehavre.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Err msg={errMail} />
        </div>
        <div>
          <label htmlFor="l-pass">Mot de passe</label>
          <PasswordField id="l-pass" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          <Err msg={errPass} />
        </div>
        <div style={{ display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-p">
            Se connecter
          </button>
          <button type="button" className="link" onClick={() => setForgotOpen(true)}>
            Mot de passe oublié ?
          </button>
        </div>
      </form>

      {forgotOpen && (
        <form
          id="forgot-form"
          noValidate
          onSubmit={submitForgot}
          style={{ marginTop: "30px", borderTop: "1px solid var(--line)", paddingTop: "30px" }}
        >
          <div>
            <label htmlFor="f-mail">Recevoir un lien de réinitialisation</label>
            <input
              type="email"
              id="f-mail"
              placeholder="prenom.nom@univ-lehavre.fr"
              value={forgotMail}
              onChange={(e) => setForgotMail(e.target.value)}
            />
            <p className="hint">
              Vous recevrez un mail avec un lien. C'est depuis ce lien que vous choisirez votre
              nouveau mot de passe — jamais depuis cette page. Le lien reste valable deux heures.
            </p>
            <Err msg={errForgot} />
          </div>
          <div>
            <button type="submit" className="btn btn-ghost">
              Envoyer le lien
            </button>
          </div>
        </form>
      )}
      {forgotDone && (
        <div className="notice" style={{ marginTop: "22px" }}>
          {forgotDone}
        </div>
      )}
    </div>
  );
}

/* ---------------- inscription ---------------- */
function RegisterPane({ router, refresh }) {
  const [f, setF] = useState({ name: "", email: "", pass: "", lab: "", disc: [], bio: "", li: "", visible: false });
  const [err, setErr] = useState({});
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const toggleDisc = (k) =>
    setF((prev) => ({ ...prev, disc: prev.disc.includes(k) ? prev.disc.filter((x) => x !== k) : [...prev.disc, k] }));

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (f.name.trim().split(" ").filter(Boolean).length < 2) next.name = "Indiquez votre nom et votre prénom.";
    if (!EMAIL_RE.test(f.email.trim())) next.email = "Cette adresse n'est pas valide.";
    if (f.pass.length < 8) next.pass = "Huit caractères minimum.";
    if (!f.lab) next.lab = "Choisissez votre laboratoire.";
    if (!f.disc.length) next.disc = "Cochez au moins une discipline.";
    setErr(next);
    if (Object.keys(next).length) return;

    try {
      const r = await auth.register({
        name: f.name.trim(),
        email: f.email.trim(),
        password: f.pass,
        lab: f.lab,
        disc: f.disc,
        bio: f.bio.trim(),
        li: f.li.trim(),
        visible: f.visible,
      });
      await refresh();
      // Notice + éventuel avertissement d'homonyme repris sur « Mon espace ».
      sessionStorage.setItem("esp-notice", `Inscription enregistrée. Un mail de confirmation part vers ${f.email.trim()}.`);
      if (r.homonymWarning) sessionStorage.setItem("esp-warn", r.homonymWarning);
      router.push("/mon-espace");
    } catch (err2) {
      // 409 e-mail déjà inscrit, ou message serveur.
      setErr({ email: err2.message });
    }
  }

  return (
    <div id="pane-in">
      <form id="reg-form" noValidate onSubmit={submit}>
        <div>
          <label htmlFor="r-name">Nom et prénom</label>
          <input type="text" id="r-name" autoComplete="name" value={f.name} onChange={set("name")} />
          <Err msg={err.name} />
        </div>
        <div>
          <label htmlFor="r-mail">Adresse mail institutionnelle</label>
          <input
            type="email"
            id="r-mail"
            autoComplete="email"
            placeholder="prenom.nom@univ-lehavre.fr"
            value={f.email}
            onChange={set("email")}
          />
          <p className="hint">Sert à vous prévenir et à vous identifier. Jamais affichée sur le site.</p>
          <Err msg={err.email} />
        </div>
        <div>
          <label htmlFor="r-pass">Mot de passe</label>
          <PasswordField id="r-pass" value={f.pass} onChange={set("pass")} autoComplete="new-password" />
          <p className="hint">Huit caractères minimum.</p>
          <Err msg={err.pass} />
        </div>
        <div>
          <label htmlFor="r-lab">Laboratoire</label>
          <select id="r-lab" value={f.lab} onChange={set("lab")}>
            <option value="">Choisir…</option>
            {LABS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <Err msg={err.lab} />
        </div>
        <div>
          <label>Vos disciplines</label>
          <div className="checks" id="r-disc">
            {Object.keys(DISC).map((k) => (
              <label key={k}>
                <input type="checkbox" checked={f.disc.includes(k)} onChange={() => toggleDisc(k)} />
                {DISC[k]}
              </label>
            ))}
          </div>
          <p className="hint">Une ou deux suffisent. C'est ce qui permet aux équipes de vous trouver.</p>
          <Err msg={err.disc} />
        </div>
        <div>
          <label htmlFor="r-bio">
            Courte bio <span className="hint" style={{ display: "inline" }}>public · optionnel</span>
          </label>
          <textarea id="r-bio" rows="3" maxLength="220" placeholder="Vos sujets de recherche en deux lignes." value={f.bio} onChange={set("bio")} />
          <p className={"counter" + (f.bio.length >= 220 ? " over" : "")} id="c-bio">
            {f.bio.length} / 220
          </p>
        </div>
        <div>
          <label htmlFor="r-li">
            Profil LinkedIn <span className="hint" style={{ display: "inline" }}>public · optionnel</span>
          </label>
          <input type="url" id="r-li" placeholder="https://www.linkedin.com/in/…" value={f.li} onChange={set("li")} />
        </div>
        <div className="consent">
          <input type="checkbox" id="r-visible" checked={f.visible} onChange={(e) => setF((p) => ({ ...p, visible: e.target.checked }))} />
          <label htmlFor="r-visible">
            J'accepte que mon nom, mon laboratoire, mes disciplines, ma bio et mon lien LinkedIn
            soient visibles par les autres participants. Mon adresse mail n'est jamais affichée.
          </label>
        </div>
        <p className="small mut" style={{ maxWidth: "60ch" }}>
          Sans cet accord vous participez normalement, mais vous n'apparaissez pas dans la liste des
          participants et une équipe ne peut pas venir vous chercher.
        </p>
        <div>
          <button type="submit" className="btn btn-p">
            Valider ma participation
          </button>
        </div>
      </form>
    </div>
  );
}
