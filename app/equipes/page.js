"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIdeas } from "@/lib/api";
import { DISC, THEMES } from "@/lib/constants";
import { useAuth } from "../components/AuthProvider";
import IdeaCard from "../components/IdeaCard";

/**
 * « Les équipes » (phase 4.1) — toutes les idées visibles de tous les défis, en
 * un seul endroit. Réutilise IdeaCard tel quel ; chaque carte porte son défi.
 * Filtres combinables (`.chip`) : par défi, par thème, par profil recherché, et
 * ouvertes / constituées. Ordre et visibilité viennent du serveur (GET /api/ideas).
 *
 * Les boutons d'action des cartes renvoient vers la page du défi, où vivent déjà
 * les formulaires (proposer / rejoindre / clôturer) : cette page reste un lieu de
 * découverte, sans dupliquer ces flux.
 */
export default function EquipesPage() {
  const router = useRouter();
  const { data } = useAuth();
  const [payload, setPayload] = useState(null); // { open, closed } | false (erreur)
  const [defi, setDefi] = useState("all");
  const [theme, setTheme] = useState("all");
  const [profil, setProfil] = useState("all");
  const [statut, setStatut] = useState("all"); // all | ouvertes | constituees

  useEffect(() => {
    getIdeas()
      .then(setPayload)
      .catch(() => setPayload(false));
  }, []);

  const myIdea = data?.idea ?? null;

  function goToDefi(idea, opts = {}) {
    if (opts.edit) sessionStorage.setItem("open-edit", String(idea.id));
    router.push("/defis/" + idea.challengeRef);
  }

  if (payload === false) {
    return (
      <div className="view on">
        <section>
          <div className="wrap">
            <p className="mut">Impossible de charger les équipes pour l'instant.</p>
          </div>
        </section>
      </div>
    );
  }
  if (!payload) return <div className="view on" />;

  const openAll = payload.open || [];
  const closedAll = payload.closed || [];
  const everything = [...openAll, ...closedAll];

  // Options de filtre dérivées des cartes présentes (dans l'ordre d'apparition,
  // donc l'ordre des défis renvoyé par le serveur).
  const defiOptions = [];
  const seenDefi = new Set();
  for (const i of everything) {
    if (i.challengeRef && !seenDefi.has(i.challengeRef)) {
      seenDefi.add(i.challengeRef);
      defiOptions.push({ ref: i.challengeRef, title: i.challengeTitle });
    }
  }
  const themeOptions = [];
  const seenTheme = new Set();
  for (const i of everything) {
    if (i.challengeTheme && !seenTheme.has(i.challengeTheme)) {
      seenTheme.add(i.challengeTheme);
      themeOptions.push(i.challengeTheme);
    }
  }

  const matchDefi = (i) => defi === "all" || i.challengeRef === defi;
  const matchTheme = (i) => theme === "all" || i.challengeTheme === theme;
  const matchProfil = (i) => profil === "all" || (i.want || []).includes(profil);

  const showOpen = statut !== "constituees";
  // Un profil « recherché » ne concerne que les équipes ouvertes : quand il est
  // actif, les équipes constituées (qui ne cherchent plus) ne s'affichent pas.
  const showClosed = statut !== "ouvertes" && profil === "all";

  const opens = showOpen ? openAll.filter((i) => matchDefi(i) && matchTheme(i) && matchProfil(i)) : [];
  const closeds = showClosed ? closedAll.filter((i) => matchDefi(i) && matchTheme(i)) : [];

  const Chip = ({ active, onClick, children }) => (
    <button type="button" className="chip" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );

  return (
    <div className="view on" id="v-equipes">
      <section>
        <div className="wrap">
          <p className="lab">Les équipes</p>
          <h2 style={{ margin: "14px 0 16px" }}>Toutes les équipes, tous les défis.</h2>
          <p className="mut" style={{ maxWidth: "62ch", marginBottom: "30px" }}>
            {/* TODO à valider — intro de la page « Les équipes ». */}
            Les équipes ouvertes cherchent encore des membres ; les équipes constituées ont clôturé
            leurs candidatures. Filtrez par défi, par thème ou par profil recherché.
          </p>

          <div className="filters">
            <span className="small mut" style={{ marginRight: "4px" }}>
              Défi
            </span>
            <Chip active={defi === "all"} onClick={() => setDefi("all")}>
              Tous
            </Chip>
            {defiOptions.map((d) => (
              <Chip key={d.ref} active={defi === d.ref} onClick={() => setDefi(d.ref)}>
                {d.ref}
              </Chip>
            ))}
          </div>

          <div className="filters">
            <span className="small mut" style={{ marginRight: "4px" }}>
              Thème
            </span>
            <Chip active={theme === "all"} onClick={() => setTheme("all")}>
              Tous
            </Chip>
            {themeOptions.map((t) => (
              <Chip key={t} active={theme === t} onClick={() => setTheme(t)}>
                {THEMES[t] || t}
              </Chip>
            ))}
          </div>

          <div className="filters">
            <span className="small mut" style={{ marginRight: "4px" }}>
              Profil recherché
            </span>
            <Chip active={profil === "all"} onClick={() => setProfil("all")}>
              Tous
            </Chip>
            {Object.keys(DISC).map((k) => (
              <Chip key={k} active={profil === k} onClick={() => setProfil(k)}>
                {DISC[k]}
              </Chip>
            ))}
          </div>

          <div className="filters">
            <span className="small mut" style={{ marginRight: "4px" }}>
              Statut
            </span>
            <Chip active={statut === "all"} onClick={() => setStatut("all")}>
              Toutes
            </Chip>
            <Chip active={statut === "ouvertes"} onClick={() => setStatut("ouvertes")}>
              Ouvertes
            </Chip>
            <Chip active={statut === "constituees"} onClick={() => setStatut("constituees")}>
              Constituées
            </Chip>
          </div>

          {showOpen && (
            <>
              <div className="block-head">
                <h3>{opens.length ? `Équipes ouvertes (${opens.length})` : "Aucune équipe ouverte"}</h3>
                <p>Ces équipes cherchent encore des membres.</p>
              </div>
              <div className="ideas">
                {!opens.length ? (
                  <div className="empty">Aucune équipe ouverte ne correspond à ces filtres.</div>
                ) : (
                  opens.map((i) => (
                    <IdeaCard
                      key={String(i.id)}
                      idea={i}
                      open
                      myIdea={myIdea}
                      onEdit={(idea) => goToDefi(idea, { edit: true })}
                      onJoin={(idea) => goToDefi(idea)}
                      onClose={(idea) => goToDefi(idea)}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {showClosed && (
            <>
              <div className="block-head">
                <h3>{closeds.length ? `Équipes constituées (${closeds.length})` : "Aucune équipe constituée"}</h3>
                <p>Candidatures closes. Seul le titre est public.</p>
              </div>
              <div className="ideas">
                {!closeds.length ? (
                  <div className="empty">Aucune équipe constituée ne correspond à ces filtres.</div>
                ) : (
                  closeds.map((i) => (
                    <IdeaCard
                      key={String(i.id)}
                      idea={i}
                      open={false}
                      myIdea={myIdea}
                      onEdit={(idea) => goToDefi(idea, { edit: true })}
                      onJoin={(idea) => goToDefi(idea)}
                      onClose={(idea) => goToDefi(idea)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
