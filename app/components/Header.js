"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * En-tête + panneau de notifications — port fidèle de la maquette
 * (open-challenge-ulhn-haropa.html:287 et :309). Mêmes classes.
 *
 * État déconnecté pour l'instant : `who` vide, cloche à 0, bouton « Participer ».
 * L'affichage connecté (nom, notifications réelles) sera câblé avec « Mon espace ».
 */

// Correspondance onglet -> route. Les libellés restent VERBATIM.
const NAV = [
  { label: "Le challenge", href: "/" },
  { label: "Les défis", href: "/defis" },
  { label: "Participants", href: "/participants" },
  { label: "Participer", href: "/participer", id: "nav-account" },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);

  const isCurrent = (href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/haropa-port.svg" alt="" onError={(e) => e.currentTarget.remove()} />
            <span style={{ display: "block" }}>
              <b>Open Challenge</b>
              <span>ULHN × HAROPA PORT</span>
            </span>
          </div>
          <nav className="nav" id="nav">
            {NAV.map((item) => (
              <button
                key={item.href}
                type="button"
                id={item.id}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                onClick={() => router.push(item.href)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="utils">
            <button
              className="bell"
              id="bell"
              type="button"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              ✱<i id="bell-n">0</i>
            </button>
            <span className="who" id="who"></span>
          </div>
        </div>
      </header>

      <aside className="notif" id="notif" hidden={!notifOpen} aria-label="Notifications">
        <header>
          <b style={{ fontWeight: 500 }}>Notifications</b>
          <button className="link" id="notif-close" onClick={() => setNotifOpen(false)}>
            Fermer
          </button>
        </header>
        <ul id="notif-list"></ul>
        <footer>
          Tout passe aussi par mail : vous n'avez pas besoin de revenir ici pour être prévenu.
        </footer>
      </aside>
    </>
  );
}
