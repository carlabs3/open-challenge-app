"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, acceptRequest, refuseRequest, leaveIdea } from "@/lib/api";
import { DISC } from "@/lib/constants";
import { useAuth } from "../components/AuthProvider";
import ProfileEditor from "../components/ProfileEditor";

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
  // Quitter l'équipe : panneau de confirmation + successeur choisi (coordinateur).
  const [leaving, setLeaving] = useState(false);
  const [successor, setSuccessor] = useState("");
  const [leaveErr, setLeaveErr] = useState("");

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
  const invitations = data.invitations ?? [];
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

  // Autres membres (hors moi) : sert au sélecteur de successeur du coordinateur.
  const otherMembers = (idea?.membresList || []).filter((m) => String(m.id) !== String(me.id));

  async function doLeave() {
    setLeaveErr("");
    try {
      await leaveIdea(idea.id, isCoord ? successor : undefined);
      setLeaving(false);
      setSuccessor("");
      await refresh();
      // TODO à valider — message après le départ de l'équipe.
      setNotice("Vous avez quitté l'équipe.");
    } catch (e) {
      setLeaveErr(e.message);
    }
  }

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
            <ProfileEditor me={me} refresh={refresh} />
          </div>

          <div className="block-head" style={{ marginTop: "44px" }}>
            <h3 id="esp-team-count">{idea ? "Mon équipe" : "Vous n'êtes dans aucune équipe"}</h3>
            <p>Une seule équipe et un seul défi par personne.</p>
          </div>
          <div className="ideas" id="esp-team">
            {!idea ? (
              <div className="empty">
                <p>Choisissez un défi : proposez votre idée, ou rejoignez une équipe qui cherche votre profil.</p>
                {/* TODO à valider — quatre voies équivalentes après l'inscription (4.5). Toutes
                    mènent vers l'existant : rien de neuf n'est construit derrière. */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "18px" }}>
                  <button type="button" className="btn btn-s btn-g" onClick={() => router.push("/defis")}>
                    Proposer une idée
                  </button>
                  <button type="button" className="btn btn-s btn-ghost" onClick={() => router.push("/equipes")}>
                    Explorer les équipes ouvertes
                  </button>
                  <button type="button" className="btn btn-s btn-ghost" onClick={() => router.push("/defis")}>
                    Parcourir les défis
                  </button>
                  <button
                    type="button"
                    className="btn btn-s btn-ghost"
                    onClick={() => document.getElementById("esp-ident")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    Rester visible sans idée
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                        Voir le défi
                      </button>
                      <button type="button" className="btn btn-s btn-ghost" onClick={openEditMyIdea}>
                        Modifier l'idée
                      </button>
                      {/* TODO à valider — quitter l'équipe. */}
                      <button
                        type="button"
                        className="btn btn-s btn-ghost"
                        onClick={() => {
                          setLeaveErr("");
                          setSuccessor("");
                          setLeaving(true);
                        }}
                      >
                        Quitter l'équipe
                      </button>
                    </div>
                  </div>
                </div>

                {leaving && (
                  <div className="panel" id="leave-panel">
                    {!isCoord ? (
                      <>
                        {/* TODO à valider — confirmation, membre. */}
                        <p style={{ maxWidth: "60ch" }}>
                          Vous allez quitter l'équipe « {idea.title} ». Pour y revenir, il faudra
                          envoyer une nouvelle demande au coordinateur.
                        </p>
                        {leaveErr && <p className="err">{leaveErr}</p>}
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
                          <button type="button" className="btn btn-s btn-g" onClick={doLeave}>
                            Quitter l'équipe
                          </button>
                          <button type="button" className="btn btn-s btn-ghost" onClick={() => setLeaving(false)}>
                            Annuler
                          </button>
                        </div>
                      </>
                    ) : otherMembers.length === 0 ? (
                      <>
                        {/* TODO à valider — coordinateur seul membre. */}
                        <p style={{ maxWidth: "60ch" }}>
                          Vous êtes le seul membre de cette équipe : il n'y a personne à qui transmettre
                          la coordination. Vous pouvez supprimer l'idée.
                        </p>
                        <div style={{ marginTop: "16px" }}>
                          <button type="button" className="btn btn-s btn-ghost" onClick={() => setLeaving(false)}>
                            Annuler
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* TODO à valider — panneau du coordinateur qui quitte. */}
                        <h3 style={{ margin: "0 0 12px" }}>Quitter l'équipe et transmettre la coordination</h3>
                        <p style={{ maxWidth: "60ch" }}>
                          Vous coordonnez cette équipe. Pour la quitter, désignez la personne qui
                          reprendra la coordination : elle décidera des demandes en cours.
                        </p>
                        <div style={{ marginTop: "16px", maxWidth: "40ch" }}>
                          <label htmlFor="leave-successor">Nouveau coordinateur</label>
                          <select id="leave-successor" value={successor} onChange={(e) => setSuccessor(e.target.value)}>
                            <option value="">Choisir…</option>
                            {otherMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {leaveErr && <p className="err">{leaveErr}</p>}
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
                          <button type="button" className="btn btn-s btn-g" disabled={!successor} onClick={doLeave}>
                            Transmettre et quitter
                          </button>
                          <button type="button" className="btn btn-s btn-ghost" onClick={() => setLeaving(false)}>
                            Annuler
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Trois listes distinctes et étiquetées (phase 2) : demandes reçues sur mon
              équipe, mes demandes envoyées, et invitations que j'ai reçues. Avant, les
              invitations n'apparaissaient nulle part et étaient inacceptables. */}

          {/* 1. Demandes reçues sur mon équipe — je décide (Accepter / Refuser). */}
          <div className="block-head">
            <h3 id="esp-req-count">
              {incoming.length ? `Demandes reçues sur mon équipe (${incoming.length})` : "Demandes reçues sur mon équipe"}
            </h3>
            <p>Les personnes qui souhaitent rejoindre votre équipe.</p>
          </div>
          <div className="ideas" id="esp-requests">
            {!incoming.length && <div className="empty">Aucune demande pour l'instant.</div>}
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
          </div>

          {/* 2. Mes demandes envoyées — état seul, sans boutons. */}
          <div className="block-head">
            <h3>{outgoing.length ? `Mes demandes envoyées (${outgoing.length})` : "Mes demandes envoyées"}</h3>
            <p>L'état des demandes que vous avez envoyées pour rejoindre une équipe.</p>
          </div>
          <div className="ideas" id="esp-sent">
            {!outgoing.length && <div className="empty">Aucune demande envoyée.</div>}
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

          {/* 3. Invitations reçues — je décide (Accepter l'invitation / Refuser). */}
          <div className="block-head">
            <h3>{invitations.length ? `Invitations reçues (${invitations.length})` : "Invitations reçues"}</h3>
            <p>Les équipes qui vous invitent à les rejoindre.</p>
          </div>
          <div className="ideas" id="esp-invitations">
            {!invitations.length && <div className="empty">Aucune invitation.</div>}
            {invitations.map((inv) => (
              <div className="idea" key={String(inv.id)}>
                <div className="idea-top">
                  <h3>
                    {inv.inviterName
                      ? `${inv.inviterName} vous invite à rejoindre « ${inv.idea.title} »`
                      : `Vous êtes invité à rejoindre « ${inv.idea.title} »`}
                    {inv.idea.challengeRef ? ` sur le défi ${inv.idea.challengeRef}` : ""}
                  </h3>
                  <span className="pill b">invitation reçue</span>
                </div>
                <div className="idea-foot">
                  <span>Reçue le {shortDate(inv.createdAt)}</span>
                  <div className="acts">
                    <button type="button" className="btn btn-s btn-g" onClick={() => decide(inv.id, true)}>
                      Accepter l'invitation
                    </button>
                    <button type="button" className="btn btn-s btn-ghost" onClick={() => decide(inv.id, false)}>
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "44px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-ghost" onClick={() => router.push("/defis")}>
              Voir les défis
            </button>
            <button type="button" className="btn btn-ghost" id="esp-out" onClick={logout}>
              Se déconnecter
            </button>
          </div>

          {/* Droit à l'effacement : pour l'instant un mailto (supprimer un compte
              qui coordonne une équipe a des conséquences — pas encore automatisé). */}
          <p className="small mut" style={{ marginTop: "30px" }}>
            <a href="mailto:open-challenge@univ-lehavre.fr?subject=Open%20Challenge%20%E2%80%94%20suppression%20de%20mon%20compte">
              Supprimer mon compte
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
