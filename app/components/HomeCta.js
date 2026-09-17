"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/**
 * Appel à l'action de l'accueil (C.2). Paire de boutons selon la session, avec les
 * classes de bouton existantes. `tone="dark"` pour le hero (fond sombre : on
 * s'appuie sur les règles `.on-dark .btn*`), `tone="light"` pour le bloc de clôture
 * (fond clair). Aucun style nouveau ; les libellés sont à valider.
 */
export default function HomeCta({ tone = "light" }) {
  const router = useRouter();
  const { me } = useAuth();

  // TODO à valider — libellés de l'appel à l'action.
  const primary = me
    ? { label: "Voir les défis", href: "/defis" }
    : { label: "Rejoindre le Challenge", href: "/participer" };
  const secondary = me
    ? { label: "Voir les équipes", href: "/equipes" }
    : { label: "Voir les défis", href: "/defis" };

  const wrapClass = tone === "dark" ? "on-dark" : "";
  const primaryClass = tone === "dark" ? "btn btn-g" : "btn btn-p";
  const secondaryClass = tone === "dark" ? "btn" : "btn btn-ghost";

  return (
    <div
      className={wrapClass}
      style={{ background: "transparent", display: "flex", gap: "14px", flexWrap: "wrap", marginTop: tone === "dark" ? "34px" : 0 }}
    >
      <button type="button" className={primaryClass} onClick={() => router.push(primary.href)}>
        {primary.label}
      </button>
      <button type="button" className={secondaryClass} onClick={() => router.push(secondary.href)}>
        {secondary.label}
      </button>
    </div>
  );
}
