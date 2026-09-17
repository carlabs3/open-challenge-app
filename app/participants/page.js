"use client";

import { useEffect, useState } from "react";
import { getParticipants } from "@/lib/api";
import { DISC } from "@/lib/constants";
import { useAuth } from "../components/AuthProvider";
import Modal from "../components/Modal";
import ParticipantFiche from "../components/ParticipantFiche";

/**
 * Participants — port de la vue #v-participants (maquette:601) et de renderDir
 * (:1308). Seuls les `visible: true` (filtré côté serveur), jamais d'adresse mail.
 *
 * Cliquer sur une personne ouvre sa fiche (<Modal> + <ParticipantFiche>), la même
 * que « Mon équipe ». Depuis la fiche, un membre d'équipe peut inviter la personne.
 */
export default function ParticipantsPage() {
  const { me, data, refresh } = useAuth();
  const [people, setPeople] = useState([]);
  const [dirFilter, setDirFilter] = useState("all");
  // Filtre par discipline (4.3), combinable avec le filtre d'équipe. Les codes
  // viennent de DISC (lib/constants), qui reprend à l'identique DISCIPLINES de
  // lib/models.js : on n'importe pas lib/models côté client (il embarquerait
  // mongoose dans le bundle).
  const [discFilter, setDiscFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null); // le participant dont la fiche est ouverte

  const load = () => getParticipants().then(setPeople).catch(() => setPeople([]));
  useEffect(() => {
    load();
  }, []);

  const myIdea = data?.idea ?? null;

  async function onInvited(message) {
    setSelected(null);
    setNotice(message);
    await Promise.all([load(), refresh()]);
  }

  const shown = people.filter((p) => {
    const okDir = dirFilter === "all" ? true : dirFilter === "free" ? !p.challengeRef : Boolean(p.challengeRef);
    const okDisc = discFilter === "all" || (p.disc || []).includes(discFilter);
    return okDir && okDisc;
  });

  const Chip = ({ k, label }) => (
    <button type="button" className="chip" aria-pressed={k === dirFilter} onClick={() => setDirFilter(k)}>
      {label}
    </button>
  );

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

          {selected && (
            <Modal onClose={() => setSelected(null)} labelledBy="fiche-name">
              <ParticipantFiche
                participant={selected}
                onClose={() => setSelected(null)}
                me={me}
                myIdea={myIdea}
                onInvited={onInvited}
              />
            </Modal>
          )}

          <div className="filters" id="dir-filters">
            <span className="small mut" style={{ marginRight: "4px" }}>
              Équipe
            </span>
            <Chip k="all" label="Tout le monde" />
            <Chip k="free" label="Sans équipe" />
            <Chip k="engaged" label="Déjà en équipe" />
          </div>
          <div className="filters" id="dir-disc-filters">
            <span className="small mut" style={{ marginRight: "4px" }}>
              Discipline
            </span>
            <button type="button" className="chip" aria-pressed={discFilter === "all"} onClick={() => setDiscFilter("all")}>
              Toutes
            </button>
            {Object.keys(DISC).map((k) => (
              <button
                type="button"
                key={k}
                className="chip"
                aria-pressed={discFilter === k}
                onClick={() => setDiscFilter(k)}
              >
                {DISC[k]}
              </button>
            ))}
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
                    onClick={() => setSelected(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(p);
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
