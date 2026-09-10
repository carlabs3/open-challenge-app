"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

/**
 * Page « choisir un nouveau mot de passe » — destination du lien envoyé par mail
 * (mail 8). Le nouveau mot de passe se choisit ICI, jamais depuis le formulaire
 * public (voir CLAUDE.md). Le token vient de l'URL (?token=...).
 *
 * On lit le token via window.location pour éviter useSearchParams (qui imposerait
 * une frontière Suspense au build).
 */
export default function ResetPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setToken(p.get("token") || "");
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (pass.length < 8) return setErr("Huit caractères minimum.");
    setBusy(true);
    try {
      await auth.reset(token, pass);
      setDone(true);
    } catch (e2) {
      // « Ce lien a expiré. Demandez-en un nouveau. » vient du serveur.
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="view on" id="v-reset">
      <section>
        <div className="wrap">
          <p className="lab">Mot de passe</p>
          <h2 style={{ margin: "14px 0 16px" }}>Choisir un nouveau mot de passe.</h2>

          {done ? (
            <div className="notice">
              Votre mot de passe a été changé. Vous pouvez maintenant vous connecter.
              <div style={{ marginTop: "18px" }}>
                <button type="button" className="btn btn-p" onClick={() => router.push("/participer")}>
                  Se connecter
                </button>
              </div>
            </div>
          ) : !token ? (
            <p className="mut" style={{ maxWidth: "62ch" }}>
              Ce lien est incomplet. Ouvrez le lien reçu par mail, ou demandez-en un nouveau depuis
              « Mot de passe oublié ? ».
            </p>
          ) : (
            <form noValidate onSubmit={submit} style={{ maxWidth: "42ch" }}>
              <div>
                <label htmlFor="reset-pass">Nouveau mot de passe</label>
                <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                  <input
                    type={show ? "text" : "password"}
                    id="reset-pass"
                    autoComplete="new-password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                  />
                  <button type="button" className="btn btn-s btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => setShow((s) => !s)}>
                    {show ? "Masquer" : "Afficher"}
                  </button>
                </div>
                <p className="hint">Huit caractères minimum.</p>
                {err && <p className="err">{err}</p>}
              </div>
              <div>
                <button type="submit" className="btn btn-p" disabled={busy}>
                  Enregistrer le nouveau mot de passe
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
