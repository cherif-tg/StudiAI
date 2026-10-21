import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { Mark } from "./Brand";
import { useAuth } from "../context/AuthProvider";

function Chargement() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Mark size={40} />
        <span className="row gap-2 small muted">
          <span className="spinner" />
          Vérification de la session…
        </span>
      </div>
    </div>
  );
}

/** L'atelier, le carnet et les réglages exigent un compte. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, pret } = useAuth();
  const location = useLocation();

  if (!pret) return <Chargement />;
  if (!user) {
    return <Navigate to="/connexion" replace state={{ depuis: location.pathname }} />;
  }
  return <>{children}</>;
}
