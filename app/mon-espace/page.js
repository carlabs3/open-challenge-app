"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, acceptRequest, refuseRequest } from "@/lib/api";
import { DISC } from "@/lib/constants";
import { useAuth } from "../components/AuthProvider";

/**
 * Mon espace — port de la vue #v-espace (maquette:727) et de renderEspace
 * (:1365). Mon identité, mon équipe, les demandes reçues et envoyées.
 */
function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.getDate() + "/" + (d.getMonth() + 1);
}

export default function MonEspacePage() {
  const router = useRouter();
  const { me, data, loading, refresh } = useAuth();
  const [notice, setNotice] = useState("");
  const [warn, setWarn] = useState("");

  // Redirection si non connecté (une fois l'état chargé).
  useEffect(() => {
    if (!loading && !me) router.replace("/participer");
  }, [loading, me, router]);

  // Notices reprises de l'inscription (posées par la page « Participer »).
  useEffect(() => {
    const n = sessionStorage.getItem("esp-notice");
    const w = sessionStorage.getItem("esp-warn");
    if (n) {
      setNotice(n);
      sessionStorage.removeItem("esp-notice");
    }
    if (w) {
      setWarn(w);
      sessionStorage.removeItem("esp-warn");
    }
  }, []);

  if (loading || !me) return <div className="view on" />;

  const idea = data.idea;
  const incoming = data.requests?.incoming ?? [];
  const outgoing = data.requests?.outgoing ?? [];
  const isCoord = idea && String(idea.coord) === String(me.id);

  async function decide(reqId, accept) {
    try {
      if (accept) await acceptRequest(reqId);
      else await refuseRequest(reqId);
      await refresh();
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function logout() {
    await auth.logout().catch(() => {});
    await refresh();
    router.push("/participer");
  }

  function openEditMyIdea() {
    sessionStorage.setItem("open-edit", String(idea.id));
    router.push("/defis/" + idea.challengeRef);
  }

  const reqCount = incoming.length + outgoing.length;

  return (
    <div className="view on" id="v-espace">
      <section>
        <div className="wrap">
          <p className="lab">Mon espace</p>
          <h2 style={{ margin: "14px 0 20px" }} id="esp-hello">
            Bonjour {me.name.split(" ")[0]}.
          </h2>
          <div id="esp-notices">
            {notice && <div className="notice">{notice}</div>}
            {warn && (
              <div className="warn" style={{ maxWidth: "62ch", margin: "0 0 22px" }}>
                {warn}
              </div>
            )}
          </div>

          <div id="esp-ident">
            <div className="ident-known">
              <span>
                {me.name} · {me.lab} · {me.disc.map((d) => DISC[d]).join(", ")}
              </span>
              <span className={"pill " + (me.visible ? "s" : "")}>
                {me.visible ? "visible dans la liste" : "non visible"}
              </span>
            </div>
          </div>

          <div className="block-head" style={{ marginTop: "44px" }}>
            <h3 id="esp-team-count">{idea ? "Mon équipe" : "Vous n'êtes dans aucune équipe"}</h3>
            <p>Une seule équipe et un seul défi par personne.</p>
          </div>
          <div className="ideas" id="esp-team">
            {!idea ? (
              <div className="empty">
                <p>Choisissez un défi : proposez votre idée, ou rejoignez une équipe qui cherche votre profil.</p>
                <button type="button" className="btn btn-s btn-g" style={{ marginTop: "18px" }} onClick={() => router.push("/defis")}>
                  Voir les défis
                </button>
              </div>
            ) : (
              <div className="idea mine">
                <div className="idea-top">
                  <h3>{idea.title}</h3>
                  <span className="pill b">{isCoord ? "vous coordonnez" : "membre"}</span>
                </div>
                <p className="angle">{(idea.challengeRef ? idea.challengeRef + " · " : "") + (idea.challengeTitle || "")}</p>
                <div className="idea-foot">
                  <span>{(idea.membresNames || []).join(", ")}</span>
                  <div className="acts">
                    <button type="button" className="btn btn-s btn-ghost" onClick={() => router.push("/defis/" + idea.challengeRef)}>
                      Ouvrir le défi
                    </button>
                    <button type="button" className="btn btn-s btn-ghost" onClick={openEditMyIdea}>
                      Modifier l'idée
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="block-head">
            <h3 id="esp-req-count">{reqCount ? `Demandes (${reqCount})` : "Aucune demande"}</h3>
            <p>Les demandes reçues sur votre idée et celles que vous avez envoyées.</p>
          </div>
          <div className="ideas" id="esp-requests">
            {!reqCount && <div className="empty">Rien en attente.</div>}

            {incoming.map((r) => (
              <div className="idea" key={String(r.id)}>
                <div className="idea-top">
                  <h3>{r.from.name} veut rejoindre votre équipe</h3>
                  <span className="pill a">à traiter</span>
                </div>
                <p className="angle">
                  {r.from.lab} · {(r.from.disc || []).map((x) => DISC[x]).join(", ")}
                </p>
                {r.note && <p className="small mut">« {r.note} »</p>}
                <div className="idea-foot">
                  <span>Reçue le {shortDate(r.createdAt)}</span>
                  <div className="acts">
                    <button type="button" className="btn btn-s btn-g" onClick={() => decide(r.id, true)}>
                      Accepter
                    </button>
                    <button type="button" className="btn btn-s btn-ghost" onClick={() => decide(r.id, false)}>
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {outgoing.map((r) => {
              const lbl = { en_attente: "en attente", acceptee: "acceptée", refusee: "refusée", annulee: "annulée" }[r.status];
              const pillCls = r.status === "acceptee" ? "g" : r.status === "refusee" || r.status === "annulee" ? "" : "a";
              return (
                <div className="idea" key={String(r.id)}>
                  <div className="idea-top">
                    <h3>{r.idea.title}</h3>
                    <span className={"pill " + pillCls}>{lbl}</span>
                  </div>
                  <p className="angle">
                    Demande envoyée le {shortDate(r.createdAt)}
                    {r.idea.challengeRef ? " · défi " + r.idea.challengeRef : ""}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "44px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-ghost" onClick={() => router.push("/defis")}>
              Voir les défis
            </button>
            <button type="button" className="btn btn-ghost" id="esp-out" onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
