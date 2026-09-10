"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getChallenge, closeIdea } from "@/lib/api";
import { DISC, THEMES, MOTIF } from "@/lib/constants";
import { useAuth } from "../../components/AuthProvider";
import IdeaCard from "../../components/IdeaCard";
import IdeaForm from "../../components/IdeaForm";
import JoinForm from "../../components/JoinForm";

/**
 * Détail d'un défi — port de la vue #v-challenge (maquette:507) et de
 * renderChallenge/renderIdeas (:1115, :1217). Idées ouvertes et équipes
 * constituées, formulaires proposer / rejoindre, actions de coordinateur.
 */
export default function ChallengeDetailPage({ params }) {
  const ref = params.ref;
  const router = useRouter();
  const { me, data, refresh } = useAuth();
  const [payload, setPayload] = useState(null); // { challenge, open, closed }
  const [profileFilter, setProfileFilter] = useState("all");
  const [panel, setPanel] = useState(null); // { mode:"propose"|"edit"|"join", idea? }
  const [notice, setNotice] = useState("");
  const mediaRef = useRef(null);

  const load = () => getChallenge(ref).then(setPayload).catch(() => setPayload(false));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const ch = payload && payload.challenge;

  // Média du défi : trame duotone, remplacée par la photo si elle existe.
  useEffect(() => {
    const node = mediaRef.current;
    if (!node || !ch) return;
    node.style.backgroundImage = MOTIF[ch.theme] || MOTIF.donnees;
    const src = "/images/" + ch.ref.toLowerCase() + ".jpg";
    const probe = new Image();
    probe.onload = () => {
      node.style.backgroundImage = "linear-gradient(rgba(32,27,54,.42),rgba(32,27,54,.42)), url('" + src + "')";
    };
    probe.src = src;
  }, [ch]);

  // Arrivée depuis « Modifier l'idée » de Mon espace : ouvrir directement l'édition.
  useEffect(() => {
    if (!payload || !payload.challenge) return;
    const wanted = sessionStorage.getItem("open-edit");
    if (!wanted) return;
    sessionStorage.removeItem("open-edit");
    const found = [...payload.open, ...payload.closed].find((i) => String(i.id) === wanted && i.mine);
    if (found) setPanel({ mode: "edit", idea: found });
  }, [payload]);

  if (payload === false) {
    return (
      <div className="view on">
        <section>
          <div className="wrap">
            <p className="mut">Ce défi n'existe pas.</p>
          </div>
        </section>
      </div>
    );
  }
  if (!payload) return <div className="view on" />;

  const myIdea = data?.idea ?? null;
  const opens = payload.open;
  const closed = payload.closed;

  async function refreshAll(msg) {
    setPanel(null);
    if (msg) setNotice(msg);
    await Promise.all([load(), refresh()]);
  }

  async function onClose(idea) {
    try {
      await closeIdea(idea.id);
      await refreshAll(
        "Candidatures closes. Votre idée n'apparaît plus dans les idées ouvertes et son détail n'est plus public."
      );
    } catch (e) {
      setNotice(e.message);
    }
  }

  // Bouton « Proposer » : désactivé si j'ai déjà une équipe, avec le motif écrit.
  const proposeHint = myIdea
    ? myIdea.challengeRef === ch.ref
      ? "Vous portez déjà une idée sur ce défi. Une seule équipe par personne."
      : `Vous faites déjà partie d'une équipe sur le défi ${myIdea.challengeRef}. Une seule équipe et un seul défi par personne.`
    : "ou rejoignez une équipe qui cherche votre profil";

  const shownOpen = opens.filter((i) => profileFilter === "all" || (i.want || []).includes(profileFilter));

  const metaRows = [
    ["Proposé par", ch.owner],
    ["Référent", ch.referent || "—"],
    ["Idées déposées", String(opens.length + closed.length)],
    ["Équipes ouvertes", String(opens.length)],
    ["Nombre d'équipes", "non limité"],
    ["Clôture des équipes", "26 octobre"],
  ];

  const Chip = ({ k, label }) => (
    <button type="button" className="chip" aria-pressed={k === profileFilter} onClick={() => setProfileFilter(k)}>
      {label}
    </button>
  );

  return (
    <div className="view on" id="v-challenge">
      <div className="d-hero">
        <div className="m" id="d-media" ref={mediaRef} aria-hidden="true"></div>
        <div className="wrap">
          <button className="link" style={{ color: "var(--green)" }} onClick={() => router.push("/defis")}>
            ← Tous les défis
          </button>
          <p className="lab" id="d-code" style={{ marginTop: "18px" }}>
            {ch.ref + " · " + THEMES[ch.theme]}
          </p>
          <h1 id="d-title">{ch.title}</h1>
          <p className="lead" id="d-desc">
            {ch.desc}
          </p>
          {ch.pdf && (
            <a className="dl" id="d-pdf" href={"/documents/" + ch.pdf} download>
              ↓ <span id="d-pdf-name">{ch.pdf}</span>
            </a>
          )}
          <div className="d-meta" id="d-meta">
            {metaRows.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="tight">
        <div className="wrap">
          <div id="notices">{notice && <div className="notice">{notice}</div>}</div>
          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-p" id="open-form" disabled={!!myIdea} onClick={() => setPanel({ mode: "propose" })}>
              Proposer une idée
            </button>
            <span className="small mut" id="propose-hint">
              {proposeHint}
            </span>
          </div>

          {panel?.mode === "propose" && (
            <IdeaForm challengeRef={ch.ref} editing={null} me={me} onDone={refreshAll} onCancel={() => setPanel(null)} />
          )}
          {panel?.mode === "edit" && (
            <IdeaForm challengeRef={ch.ref} editing={panel.idea} me={me} onDone={refreshAll} onCancel={() => setPanel(null)} />
          )}
          {panel?.mode === "join" && (
            <JoinForm idea={panel.idea} me={me} onDone={refreshAll} onCancel={() => setPanel(null)} />
          )}

          <div className="block-head">
            <h3 id="open-count">{opens.length ? `Idées ouvertes (${opens.length})` : "Aucune idée ouverte"}</h3>
            <p>Ces équipes cherchent encore des membres. C'est ici que vous pouvez entrer.</p>
          </div>
          <div className="filters" id="profile-filters">
            <span className="small mut" style={{ marginRight: "4px" }}>
              Mon profil
            </span>
            <Chip k="all" label="Tous" />
            {Object.keys(DISC).map((k) => (
              <Chip key={k} k={k} label={DISC[k]} />
            ))}
          </div>
          <div className="ideas" id="ideas-list">
            {!shownOpen.length ? (
              <div className="empty">
                <p>
                  {opens.length
                    ? "Aucune équipe ne cherche ce profil sur ce défi."
                    : "Personne ne cherche de membres sur ce défi pour l'instant."}
                </p>
                {!myIdea && (
                  <button type="button" className="btn btn-s btn-g" style={{ marginTop: "18px" }} onClick={() => setPanel({ mode: "propose" })}>
                    Proposer une idée
                  </button>
                )}
              </div>
            ) : (
              shownOpen.map((i) => (
                <IdeaCard
                  key={String(i.id)}
                  idea={i}
                  open
                  myIdea={myIdea}
                  onEdit={(idea) => setPanel({ mode: "edit", idea })}
                  onJoin={(idea) => setPanel({ mode: "join", idea })}
                  onClose={onClose}
                />
              ))
            )}
          </div>

          <div className="block-head">
            <h3 id="closed-count">{closed.length ? `Équipes constituées (${closed.length})` : "Aucune équipe constituée"}</h3>
            <p>
              Candidatures closes. Seul le titre est public : le contenu reste entre l'équipe,
              l'organisation et le porteur du défi.
            </p>
          </div>
          <div className="ideas" id="teams-list">
            {!closed.length ? (
              <div className="empty">Aucune équipe n'a encore clôturé ses candidatures.</div>
            ) : (
              closed.map((i) => (
                <IdeaCard
                  key={String(i.id)}
                  idea={i}
                  open={false}
                  myIdea={myIdea}
                  onEdit={(idea) => setPanel({ mode: "edit", idea })}
                  onJoin={(idea) => setPanel({ mode: "join", idea })}
                  onClose={onClose}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
