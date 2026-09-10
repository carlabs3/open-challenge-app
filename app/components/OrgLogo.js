"use client";

/**
 * Logos partenaires — comme dans la maquette, si le fichier n'existe pas encore
 * l'image disparaît (`onerror` -> remove), jamais d'icône cassée.
 * L'`onError` impose un composant client (interdit dans un composant serveur).
 */

/* eslint-disable @next/next/no-img-element */

export function OrgLogo({ src, alt }) {
  return <img src={src} alt={alt} onError={(e) => e.currentTarget.remove()} />;
}

// France 2030 : si le logo manque, on affiche un bloc de repli « Logo France 2030 »
// (reprise VERBATIM du comportement de la maquette).
export function France2030Logo() {
  return (
    <img
      src="/logos/france-2030.svg"
      alt="France 2030"
      onError={(e) => {
        const d = document.createElement("div");
        d.className = "f2030";
        d.textContent = "Logo France 2030";
        e.currentTarget.replaceWith(d);
      }}
    />
  );
}
