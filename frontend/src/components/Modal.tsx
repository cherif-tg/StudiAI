import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

import { Icon } from "./Icon";

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

  useEffect(() => {
    if (!open) return undefined;
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") onClose();
    };
    document.addEventListener("keydown", surTouche);
    const focusInitial = reference.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusInitial?.focus();
    return () => document.removeEventListener("keydown", surTouche);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(evenement) => {
        if (evenement.target === evenement.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={reference}>
        <div className="modal-head">
          <h2 style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600 }}>
            {title}
          </h2>
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
