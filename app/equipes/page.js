"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIdeas, getChallenges } from "@/lib/api";
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
  const [challenges, setChallenges] = useState([]); // les 7 défis, pour l'ordre des pastilles
  const [defi, setDefi] = useState("all");
  const [theme, setTheme] = useState("all");
  const [profil, setProfil] = useState("all");
  const [statut, setStatut] = useState("all"); // all | ouvertes | constituees

  useEffect(() => {
    getIdeas()
      .then(setPayload)
      .catch(() => setPayload(false));
    // Liste des défis : sert à afficher TOUTES les pastilles de défi, dans l'ordre
    // des ref (HP-01 → HP-07), y compris les défis sans aucune idée.
    getChallenges()
      .then(setChallenges)
      .catch(() => setChallenges([]));
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

  // Pastilles de défi : TOUS les défis, toujours triés par ref croissante
  // (HP-01 → HP-07), indépendamment de l'ordre des résultats. Un défi sans aucune
  // idée visible ici est affiché mais désactivé, pour qu'il ne semble pas manquer.
  const presentRefs = new Set(everything.map((i) => i.challengeRef).filter(Boolean));
  const refSource = challenges.length ? challenges.map((c) => c.ref) : [...presentRefs];
  const defiOptions = [...new Set(refSource)]
    .sort((a, b) => a.localeCompare(b))
    .map((ref) => ({ ref, present: presentRefs.has(ref) }));

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

  const anyActive = defi !== "all" || theme !== "all" || profil !== "all" || statut !== "all";
  const resetAll = () => {
    setDefi("all");
    setTheme("all");
    setProfil("all");
    setStatut("all");
  };

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

          {/* Filtres en colonne latérale gauche (sticky), liste à droite. La logique
              de filtrage ne change pas : seule la disposition. Sous 900px, la colonne
              repasse au-dessus de la liste (voir globals.css), sans repli ni bouton. */}
          <div className="eq-layout">
            <aside className="eq-side" aria-label="Filtres">
              <div className="filters">
                <span className="small mut" style={{ marginRight: "4px" }}>
                  Défi
                </span>
                <Chip active={defi === "all"} onClick={() => setDefi("all")}>
                  Tous
                </Chip>
                {defiOptions.map((d) => (
                  <button
                    type="button"
                    key={d.ref}
                    className="chip"
                    aria-pressed={defi === d.ref}
                    disabled={!d.present}
                    onClick={() => setDefi(d.ref)}
                  >
                    {d.ref}
                  </button>
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

              {anyActive && (
                // TODO à valider — lien de réinitialisation des filtres.
                <button type="button" className="link" onClick={resetAll}>
                  Tout réinitialiser
                </button>
              )}
            </aside>

            <div className="eq-list">
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
          </div>
        </div>
      </section>
    </div>
  );
}
