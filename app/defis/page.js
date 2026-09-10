"use client";

import { useEffect, useState } from "react";
import { getChallenges } from "@/lib/api";
import { THEMES } from "@/lib/constants";
import ChallengeCard from "../components/ChallengeCard";

/**
 * Liste des défis — port de la vue #v-challenges (maquette:494) et de
 * renderGrids (:1100). L'API renvoie déjà les défis triés par ideaCount
 * ascendant ; on filtre par thématique côté client.
 */
export default function DefisPage() {
  const [challenges, setChallenges] = useState([]);
  const [themeFilter, setThemeFilter] = useState("all");

  useEffect(() => {
    getChallenges()
      .then(setChallenges)
      .catch(() => setChallenges([]));
  }, []);

  const shown = challenges.filter((c) => themeFilter === "all" || c.theme === themeFilter);

  const Chip = ({ k, label }) => (
    <button type="button" className="chip" aria-pressed={k === themeFilter} onClick={() => setThemeFilter(k)}>
      {label}
    </button>
  );

  return (
    <div className="view on" id="v-challenges">
      <section>
        <div className="wrap">
          <p className="lab">Les défis</p>
          <h2 style={{ margin: "14px 0 16px" }}>Sept problématiques posées par HAROPA Port.</h2>
          <p className="mut" style={{ maxWidth: "62ch", marginBottom: "34px" }}>
            Les défis les moins investis apparaissent en premier. Le nombre d'équipes par défi n'est
            pas limité : proposez votre idée même si d'autres sont déjà déposées.
          </p>
          <div className="filters" id="theme-filters">
            <Chip k="all" label="Tous les défis" />
            {Object.keys(THEMES).map((k) => (
              <Chip key={k} k={k} label={THEMES[k]} />
            ))}
          </div>
          <div className="cgrid" id="all-grid">
            {shown.map((ch) => (
              <ChallengeCard key={ch.ref} ch={ch} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
