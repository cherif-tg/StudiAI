import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ToastTone = "info" | "success" | "error";

type Toast = {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (title: string, options?: { message?: string; tone?: ToastTone }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let compteur = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const retirer = useCallback((id: number) => {
    setToasts((liste) => liste.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback<ToastContextValue["push"]>(
    (title, options) => {
      const id = ++compteur;
      setToasts((liste) => [
        ...liste.slice(-2),
        { id, title, message: options?.message, tone: options?.tone ?? "info" },
      ]);
      window.setTimeout(() => retirer(id), options?.tone === "error" ? 7000 : 4500);
    },
    [retirer],
  );

  const valeur = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={valeur}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <span
              className="dot"
              style={{
                marginTop: 7,
                color:
                  toast.tone === "error"
                    ? "var(--red)"
                    : toast.tone === "success"
                      ? "var(--green)"
                      : "var(--info)",
              }}
              aria-hidden="true"
            />
            <div className="grow">
              <strong>{toast.title}</strong>
              {toast.message ? <span className="muted small">{toast.message}</span> : null}
            </div>
            <button className="btn btn--quiet btn--sm" onClick={() => retirer(toast.id)}>
              Fermer
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const contexte = useContext(ToastContext);
  if (!contexte) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return contexte;
}
