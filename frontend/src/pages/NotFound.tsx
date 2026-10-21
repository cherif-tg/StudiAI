import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { Mark } from "../components/Brand";

export function NotFound() {
  return (
    <AppShell>
      <div className="page page--narrow" style={{ textAlign: "center", paddingTop: "var(--sp-9)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Mark size={52} />
        </div>
        <p className="eyebrow">Erreur 404</p>
        <h1 style={{ marginTop: 8 }}>Cette page n'existe pas</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Le lien est peut-être ancien, ou la page a changé de nom.
        </p>
        <div className="row gap-2" style={{ justifyContent: "center", marginTop: 22 }}>
          <Link to="/" className="btn">
            Accueil
          </Link>
          <Link to="/atelier" className="btn btn--primary">
            Ouvrir l'atelier
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
