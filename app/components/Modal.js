"use client";

import { useEffect, useRef } from "react";

/**
 * Modal réutilisable — overlay assombri plein écran, panneau centré au-dessus.
 * Le contenu de la page ne bouge pas. Utilisé par la fiche participant et par le
 * formulaire « Rejoindre » depuis « Les équipes ».
 *
 * L'enfant fournit son propre `.panel` (la fiche comme JoinForm en sont déjà un) ;
 * ce composant n'ajoute que l'overlay, le centrage et le comportement :
 *  - ferme au clic sur le fond, à Escape, et via le bouton « Fermer »/« Annuler »
 *    de l'enfant (qui appelle onClose) ;
 *  - bloque le défilement du body tant qu'il est ouvert ;
 *  - donne le focus au panneau à l'ouverture et le rend à l'élément déclencheur
 *    (celui qui avait le focus) à la fermeture.
 *
 * `labelledBy` : id d'un élément de l'enfant qui nomme la boîte (aria-labelledby).
 */
export default function Modal({ onClose, labelledBy, children }) {
  const windowRef = useRef(null);

  useEffect(() => {
    const trigger = document.activeElement; // la carte / le bouton qui a ouvert le modal
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    windowRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      if (trigger && typeof trigger.focus === "function") trigger.focus();
    };
    // onClose est stable pour notre usage ; l'effet ne tourne qu'au montage/démontage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={windowRef}
      >
        {children}
      </div>
    </div>
  );
}
