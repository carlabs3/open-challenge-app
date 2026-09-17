"use client";

import { useEffect, useState } from "react";
import { getParticipants, invite } from "@/lib/api";
import { DISC } from "@/lib/constants";
import { useAuth } from "../components/AuthProvider";

/**
 * Participants — port de la vue #v-participants (maquette:601) et de renderDir
 * (:1308). Seuls les `visible: true` (filtré côté serveur), jamais d'adresse mail.
 *
 * Nouveau (phase 2) : cliquer sur une personne ouvre sa fiche (panneau `.panel`,
 * même motif que le formulaire de demande). Depuis la fiche, un membre d'équipe
 * peut inviter la personne. Les conditions d'invitation sont revalidées côté
 * serveur (voir app/api/ideas/[id]/invite/route.js).
 */
export default function ParticipantsPage() {
  const { me, data, refresh } = useAuth();
  const [people, setPeople] = useState([]);
  const [dirFilter, setDirFilter] = useState("all");
  const [notice, setNotice] = useState("");

  // Fiche ouverte + état du sous-formulaire d'invitation.
  const [selected, setSelected] = useState(null); // le participant dont la fiche est ouverte
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteNote, setInviteNote] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => getParticipants().then(setPeople).catch(() => setPeople([]));
  useEffect(() => {
    load();
  }, []);

  const myIdea = data?.idea ?? null;

  function openFiche(p) {
    setSelected(p);
    setInviteOpen(false);
    setInviteNote("");
    setInviteErr("");
  }

  // Conditions d'invitation pour la personne `p`, calculées à partir de MON équipe
  // (data.idea). Le serveur revalide « personne sans équipe » et « rien en cours ».
  function inviteState(p) {
    if (!p) return { canShow: false };
    const iAmInTeam = !!myIdea;
    const teamOpen = myIdea?.status === "ouverte";
    const isSelf = me && String(p.id) === String(me.id);
    // Le bouton n'apparaît que si je suis dans une équipe ouverte et que ce n'est pas moi.
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

  async function doInvite() {
    if (!selected || !myIdea) return;
    setBusy(true);
    setInviteErr("");
    try {
      await invite(myIdea.id, selected.id, inviteNote.trim());
      const name = selected.name;
      setSelected(null);
      setInviteOpen(false);
      setInviteNote("");
      // TODO à valider — message de confirmation.
      setNotice(`Invitation envoyée à ${name}. Elle part par mail : la personne accepte ou refuse depuis son espace.`);
      await Promise.all([load(), refresh()]);
    } catch (e) {
      // Le serveur fait foi : une collision d'index ou un cas limite arrive ici en
      // message clair (jamais un 500).
      setInviteErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const shown = people.filter((p) =>
    dirFilter === "all" ? true : dirFilter === "free" ? !p.challengeRef : Boolean(p.challengeRef)
  );

  const Chip = ({ k, label }) => (
    <button type="button" className="chip" aria-pressed={k === dirFilter} onClick={() => setDirFilter(k)}>
      {label}
    </button>
  );

  const invSt = inviteState(selected);

  return (
    <div className="view on" id="v-participants">
      <section>
        <div className="wrap">
          <p className="lab">Participants</p>
          <h2 style={{ margin: "14px 0 16px" }}>Qui participe.</h2>
          <p className="mut" style={{ maxWidth: "62ch", marginBottom: "30px" }}>
            Seuls les participants ayant accepté d'être visibles apparaissent ici. Aucune adresse
            mail n'est affichée. Un participant ne peut être que dans une seule équipe, sur un seul
            défi.
          </p>
          <div id="dir-notices">{notice && <div className="notice">{notice}</div>}</div>

          {/* Fiche du participant sélectionné — même motif de panneau que le formulaire de
              demande. Profil complet, jamais l'adresse mail. */}
          {selected && (
            <div className="panel" id="fiche-panel">
              <h3>{selected.name}</h3>
              <p className="small mut" style={{ margin: "6px 0 14px" }}>
                {selected.lab}
                {selected.challengeRef ? ` · participe au défi ${selected.challengeRef}` : ""}
              </p>
              {selected.bio && <p style={{ maxWidth: "60ch" }}>{selected.bio}</p>}
              <div className="tags" style={{ marginTop: "14px" }}>
                {selected.disc.map((k) => (
                  <span className="pill s" key={k}>
                    {DISC[k]}
                  </span>
                ))}
              </div>
              {selected.li && (
                <p style={{ marginTop: "16px" }}>
                  <a className="li" href={selected.li} target="_blank" rel="noopener">
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
                        Inviter {selected.name} dans « {myIdea.title} »
                      </h4>
                      <label htmlFor="inv-note">Un mot pour {selected.name} (facultatif)</label>
                      <textarea
                        id="inv-note"
                        rows="3"
                        value={inviteNote}
                        onChange={(e) => setInviteNote(e.target.value)}
                      />
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
                <button type="button" className="btn btn-s btn-ghost" onClick={() => setSelected(null)}>
                  Fermer
                </button>
              </p>
            </div>
          )}

          <div className="filters" id="dir-filters">
            <Chip k="all" label="Tout le monde" />
            <Chip k="free" label="Sans équipe" />
            <Chip k="engaged" label="Déjà en équipe" />
          </div>
          <div className="dir" id="dir-list">
            {!shown.length ? (
              <div className="empty">Personne ne correspond à ce filtre.</div>
            ) : (
              shown.map((p) => {
                const isSel = selected && String(selected.id) === String(p.id);
                return (
                  <div
                    className="pers"
                    key={String(p.id)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={!!isSel}
                    style={{ cursor: "pointer" }}
                    onClick={() => openFiche(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openFiche(p);
                      }
                    }}
                  >
                    <p className="n">{p.name}</p>
                    <p className="small mut">{p.lab}</p>
                    {p.bio && <p className="bio">{p.bio}</p>}
                    <div className="tags">
                      {p.disc.map((k) => (
                        <span className="pill s" key={k}>
                          {DISC[k]}
                        </span>
                      ))}
                    </div>
                    <div className="tags">
                      {p.challengeRef ? (
                        <span className="pill b">participe au défi {p.challengeRef}</span>
                      ) : p.chercheEquipe === "idee" ? (
                        <span className="pill g">a une idée</span>
                      ) : (
                        <span className="pill g">cherche une équipe</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
