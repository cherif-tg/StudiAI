import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import { Icon } from "./Icon";
import { useFocusTrap } from "../hooks/useFocusTrap";

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reference = useRef<HTMLDivElement>(null);
  const idTitre = useId();

  // La fonction de fermeture change souvent (fonction recréée par le parent) :
  // on la garde dans une référence pour ne pas relancer l'effet à chaque frappe.
  const fermer = useRef(onClose);
  fermer.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") fermer.current();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [open]);

  // Focus : premier champ s'il y en a un, sinon le premier bouton du contenu ;
  // Tab reste dans la fenêtre ; à la fermeture, retour à l'élément d'origine.
  useFocusTrap(open, [reference], {
    initial: () =>
      reference.current?.querySelector<HTMLElement>(".modal-body input, .modal-body textarea, .modal-body select") ??
      reference.current?.querySelector<HTMLElement>(".modal-body button, .modal-body [href], .modal-foot button") ??
      reference.current?.querySelector<HTMLElement>("button"),
  });

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={idTitre} ref={reference}>
        <div className="modal-head">
          <h2 id={idTitre}>{title}</h2>
          <button className="btn btn--quiet btn--icon" onClick={onClose} aria-label="Fermer">
            <Icon name="fermer" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
