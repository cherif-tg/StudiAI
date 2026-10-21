import { NavLink, Link } from "react-router-dom";
import type { ReactNode } from "react";

import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { StatusPill } from "./StatusPill";
import { useAuth } from "../context/AuthProvider";
import { useTheme } from "../context/ThemeProvider";

function BasculeTheme() {
  const { resolved, setPreference } = useTheme();
  const suivant = resolved === "dark" ? "light" : "dark";
  return (
    <button
      className="btn btn--quiet btn--icon"
      onClick={() => setPreference(suivant)}
      aria-label={`Passer en thème ${suivant === "dark" ? "sombre" : "clair"}`}
      title={`Passer en thème ${suivant === "dark" ? "sombre" : "clair"}`}
    >
      <Icon name={resolved === "dark" ? "soleil" : "lune"} size={17} />
    </button>
  );
}

export function AppShell({
  children,
  variant = "page",
}: {
  children: ReactNode;
  variant?: "page" | "full";
}) {
  const { user, deconnecter } = useAuth();
  const initiale = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Nunya, accueil">
          <Brand />
        </Link>

        <nav className="nav" aria-label="Navigation principale">
          {user ? (
            <>
              <NavLink to="/atelier">Atelier</NavLink>
              <NavLink to="/carnet">Carnet</NavLink>
            </>
          ) : null}
          <NavLink to="/documentation">Documentation</NavLink>
        </nav>

        <div className="topbar__end">
          <StatusPill />
          <BasculeTheme />

          {user ? (
            <>
              <NavLink
                to="/reglages"
                className="btn btn--quiet btn--icon"
                aria-label="Réglages"
                title="Réglages"
              >
                <Icon name="reglages" size={17} />
              </NavLink>
              <span className="avatar" title={user.email} aria-hidden="true">
                {initiale}
              </span>
              <button
                className="btn btn--quiet btn--sm"
                onClick={() => void deconnecter()}
                title="Se déconnecter"
              >
                Quitter
              </button>
            </>
          ) : (
            <NavLink to="/connexion" className="btn btn--sm">
              Se connecter
            </NavLink>
          )}
        </div>
      </header>

      <main id="contenu" data-variant={variant}>
        {children}
      </main>
    </>
  );
}
