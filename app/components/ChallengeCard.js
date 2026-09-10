"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { THEMES, MOTIF } from "@/lib/constants";

/**
 * Carte de défi — port fidèle de `challengeCard` / `setMedia` de la maquette
 * (open-challenge-ulhn-haropa.html:1076 et :896). Mêmes classes, même markup.
 *
 * La trame duotone (motif) tient lieu de photo ; si images/hp-0x.jpg existe,
 * elle prend le relais avec un voile sombre par-dessus. Sinon, rien de cassé.
 */
export default function ChallengeCard({ ch }) {
  const router = useRouter();
  const mediaRef = useRef(null);

  const motif = MOTIF[ch.theme] || MOTIF.donnees;

  useEffect(() => {
    const node = mediaRef.current;
    if (!node) return;
    const src = "/images/" + ch.ref.toLowerCase() + ".jpg";
    const probe = new Image();
    probe.onload = () => {
      node.style.backgroundImage =
        "linear-gradient(rgba(32,27,54,.42),rgba(32,27,54,.42)), url('" + src + "')";
    };
    probe.src = src;
  }, [ch.ref]);

  const n = ch.ideaCount;
  const open = ch.openCount;
  const desc = ch.desc.length > 118 ? ch.desc.slice(0, 118).trim() + "…" : ch.desc;

  return (
    <button type="button" className="ch" onClick={() => router.push("/defis/" + ch.ref)}>
      <div className="ch-media" ref={mediaRef} style={{ backgroundImage: motif }}>
        <span className="m-lab">{ch.ref + " · " + (THEMES[ch.theme] || "").toUpperCase()}</span>
      </div>
      <div className="ch-body">
        <h3>{ch.title}</h3>
        <p className="d">{desc}</p>
        <div className="ch-foot">
          <span>{n ? n + (n > 1 ? " idées déposées" : " idée déposée") : "aucune idée"}</span>
          <span className={"pill " + (open ? "g" : "")}>
            {open ? open + (open > 1 ? " équipes ouvertes" : " équipe ouverte") : "rien d'ouvert"}
          </span>
        </div>
      </div>
    </button>
  );
}
