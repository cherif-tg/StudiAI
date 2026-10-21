import { NavLink, Link } from "react-router-dom";
import type { ReactNode } from "react";

import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { StatusPill } from "./StatusPill";
import { useTheme } from "../context/ThemeProvider";

const LIENS = [
  { to: "/atelier", label: "Atelier" },
  { to: "/carnet", label: "Carnet" },
  { to: "/documentation", label: "Documentation" },
];

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
          {LIENS.map((lien) => (
            <NavLink key={lien.to} to={lien.to}>
              {lien.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar__end">
          <StatusPill />
          <BasculeTheme />
          <NavLink
            to="/reglages"
            className="btn btn--quiet btn--icon"
            aria-label="Réglages"
            title="Réglages"
          >
            <Icon name="reglages" size={17} />
          </NavLink>
        </div>
      </header>

      <main id="contenu" data-variant={variant}>{children}</main>
    </>
  );
}
