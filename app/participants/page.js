"use client";

import { useEffect, useState } from "react";
import { getParticipants, invite } from "@/lib/api";
import { DISC } from "@/lib/constants";
import { useAuth } from "../components/AuthProvider";

/**
 * Participants — port de la vue #v-participants (maquette:601) et de renderDir
 * (:1308). Seuls les `visible: true` (filtré côté serveur), jamais d'adresse mail.
 */
export default function ParticipantsPage() {
  const { me, data, refresh } = useAuth();
  const [people, setPeople] = useState([]);
  const [dirFilter, setDirFilter] = useState("all");
  const [notice, setNotice] = useState("");

  const load = () => getParticipants().then(setPeople).catch(() => setPeople([]));
  useEffect(() => {
    load();
  }, []);

  const myIdea = data?.idea ?? null;

  async function doInvite(p) {
    try {
      await invite(myIdea.id, p.id);
      // TODO à valider — même intention que la maquette (invite() notice).
      setNotice(`Invitation envoyée à ${p.name}. Elle part par mail : la personne accepte ou refuse depuis le message.`);
      refresh();
    } catch (e) {
      setNotice(e.message);
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
                const canInvite = me && myIdea && !p.challengeRef && String(p.id) !== String(me.id);
                return (
                  <div className="pers" key={String(p.id)}>
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
                      ) : (
                        <span className="pill g">cherche une équipe</span>
                      )}
                    </div>
                    {(p.li || canInvite) && (
                      <div className="foot">
                        {p.li && (
                          <a className="li" href={p.li} target="_blank" rel="noopener">
                            LinkedIn ↗
                          </a>
                        )}
                        {canInvite && (
                          <button type="button" className="btn btn-s btn-g" onClick={() => doInvite(p)}>
                            Inviter dans mon équipe
                          </button>
                        )}
                      </div>
                    )}
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
