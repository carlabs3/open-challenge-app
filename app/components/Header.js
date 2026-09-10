"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { markNotificationsRead } from "@/lib/api";

/**
 * En-tête + panneau de notifications — port fidèle de la maquette
 * (open-challenge-ulhn-haropa.html:287, :309 et renderWho/renderBell).
 * Mêmes classes. La nav reste en <button> pour conserver le CSS `.nav button`.
 */

// Date courte « j/m » comme dans la maquette (fonction today()).
function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.getDate() + "/" + (d.getMonth() + 1);
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { me, data, refresh } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  const accountHref = me ? "/mon-espace" : "/participer";
  const accountLabel = me ? "Mon espace" : "Participer";

  const NAV = [
    { label: "Le challenge", href: "/" },
    { label: "Les défis", href: "/defis" },
    { label: "Participants", href: "/participants" },
    { label: accountLabel, href: accountHref, id: "nav-account" },
  ];

  const isCurrent = (href) => {
    if (href === "/") return pathname === "/";
    if (href === "/mon-espace" || href === "/participer") {
      // L'onglet « compte » reste actif sur les deux pages liées (maquette:1478).
      return pathname === "/mon-espace" || pathname === "/participer";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  async function toggleNotif() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && me && unread) {
      await markNotificationsRead().catch(() => {});
      refresh();
    }
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            {/* Pas de logo ici : sur le fond sombre (Midnight Violet), un wordmark
                noir serait invisible. Les logos partenaires vivent dans la
                section « Organisé par » de l'accueil (fond clair). */}
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
              className={"bell" + (me ? " on" : "")}
              id="bell"
              type="button"
              aria-label="Notifications"
              onClick={toggleNotif}
            >
              ✱
              <i id="bell-n" style={{ display: unread ? "flex" : "none" }}>
                {unread}
              </i>
            </button>
            <span className="who" id="who">
              <span className={"dot" + (me ? "" : " off")}></span>
              <span>{me ? me.name.split(" ")[0] : "non identifié"}</span>
            </span>
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
        <ul id="notif-list">
          {!notifications.length ? (
            <li>
              <span>Aucune notification pour l'instant.</span>
            </li>
          ) : (
            notifications.map((n) => (
              <li key={String(n._id)} className={n.read ? "" : "unread"}>
                <span className="k">{n.kind}</span>
                <div>
                  <p>{n.text}</p>
                  <p className="small mut">{shortDate(n.createdAt)}</p>
                </div>
              </li>
            ))
          )}
        </ul>
        <footer>
          Tout passe aussi par mail : vous n'avez pas besoin de revenir ici pour être prévenu.
        </footer>
      </aside>
    </>
  );
}
