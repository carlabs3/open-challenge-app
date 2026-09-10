"use client";

import { useEffect, useRef } from "react";

/**
 * Bandeau d'accueil — port fidèle du probe hero de la maquette
 * (open-challenge-ulhn-haropa.html:1687). Trame duotone par défaut ; si
 * images/hero.jpg existe, elle prend le relais avec un voile sombre par-dessus.
 * Aucun code à changer pour ajouter la photo.
 */
export default function HeroMedia() {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const probe = new Image();
    probe.onload = () => {
      node.classList.remove("motif");
      node.style.backgroundImage =
        "linear-gradient(rgba(32,27,54,.55),rgba(32,27,54,.55)), url('/images/hero.jpg')";
      node.style.opacity = 1;
    };
    probe.src = "/images/hero.jpg";
  }, []);

  return <div className="hero-media motif" id="hero-media" ref={ref} aria-hidden="true"></div>;
}
