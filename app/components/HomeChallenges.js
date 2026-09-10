"use client";

import { useEffect, useState } from "react";
import { getChallenges } from "@/lib/api";
import ChallengeCard from "./ChallengeCard";

/**
 * Grille « Les défis » de l'accueil : les trois défis les moins investis.
 * L'API renvoie déjà les défis triés par ideaCount ascendant, on prend les 3
 * premiers (maquette:1098).
 */
export default function HomeChallenges() {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    getChallenges()
      .then((list) => setChallenges(list.slice(0, 3)))
      .catch(() => setChallenges([]));
  }, []);

  return (
    <div className="cgrid" id="home-grid">
      {challenges.map((ch) => (
        <ChallengeCard key={ch.ref} ch={ch} />
      ))}
    </div>
  );
}
