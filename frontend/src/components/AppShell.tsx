import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { SiteFooter } from "./SiteFooter";
import { StatusPill } from "./StatusPill";
import { useAuth } from "../context/AuthProvider";
import { useTheme } from "../context/ThemeProvider";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useRevisionsDues } from "../hooks/useRevision";

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
  const aReviser = useRevisionsDues();
  const pastille = aReviser ? (
    <span className="nav__badge" aria-label={`${aReviser} à revoir`}>
      {aReviser}
    </span>
  ) : null;

  // État purement visuel : ouverture du menu de navigation mobile.
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { pathname, hash } = useLocation();
  const boutonMenu = useRef<HTMLButtonElement>(null);
  const tiroir = useRef<HTMLElement>(null);

  // Menu ouvert : le focus va au premier lien, Tab boucle entre le menu et son
  // bouton, et revient au bouton à la fermeture.
  useFocusTrap(menuOuvert, [boutonMenu, tiroir], {
    initial: () => tiroir.current?.querySelector<HTMLElement>("a, button"),
  });

  useEffect(() => {
    setMenuOuvert(false);
  }, [pathname, hash]);

  useEffect(() => {
    if (!menuOuvert) return undefined;
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setMenuOuvert(false);
    };
    const debordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", surTouche);
    return () => {
      document.body.style.overflow = debordement;
      document.removeEventListener("keydown", surTouche);
    };
  }, [menuOuvert]);

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
              <NavLink to="/revisions">
                Révisions
                {pastille}
              </NavLink>
            </>
          ) : null}
          <NavLink to="/documentation">Documentation</NavLink>
        </nav>

        <div className="topbar__end">
          <StatusPill />
          <BasculeTheme />

          {user ? (
            <span className="topbar__desktop row gap-2">
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
            </span>
          ) : (
            <NavLink to="/connexion" className="btn btn--primary btn--sm">
              Se connecter
            </NavLink>
          )}

          <button
            ref={boutonMenu}
            type="button"
            className="btn btn--quiet btn--icon menu-toggle"
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMenuOuvert((ouvert) => !ouvert)}
          >
            <Icon name={menuOuvert ? "fermer" : "menu"} size={20} />
          </button>
        </div>
      </header>

      {/* Menu mobile : mêmes destinations que la barre, en grand et tactile. */}
      <div
        className="mobile-drawer__backdrop"
        data-open={menuOuvert}
        onClick={() => setMenuOuvert(false)}
        aria-hidden="true"
      />
      <nav
        ref={tiroir}
        id="menu-mobile"
        className="mobile-drawer"
        data-open={menuOuvert}
        aria-label="Navigation mobile"
        aria-hidden={!menuOuvert}
      >
        {user ? (
          <>
            <NavLink to="/atelier" className="mobile-drawer__link" tabIndex={menuOuvert ? 0 : -1}>
              <Icon name="atelier" size={18} />
              Atelier
            </NavLink>
            <NavLink to="/carnet" className="mobile-drawer__link" tabIndex={menuOuvert ? 0 : -1}>
              <Icon name="carnet" size={18} />
              Carnet
            </NavLink>
            <NavLink to="/revisions" className="mobile-drawer__link" tabIndex={menuOuvert ? 0 : -1}>
              <Icon name="horloge" size={18} />
              Révisions
              {pastille}
            </NavLink>
          </>
        ) : null}
        <NavLink to="/documentation" className="mobile-drawer__link" tabIndex={menuOuvert ? 0 : -1}>
          <Icon name="aide" size={18} />
          Documentation
        </NavLink>

        <div className="mobile-drawer__sep" />

        {user ? (
          <>
            <NavLink to="/reglages" className="mobile-drawer__link" tabIndex={menuOuvert ? 0 : -1}>
              <Icon name="reglages" size={18} />
              Réglages
            </NavLink>
            <div className="mobile-drawer__user">
              <span className="avatar" aria-hidden="true">
                {initiale}
              </span>
              <span>{user.email}</span>
            </div>
            <button
              type="button"
              className="btn btn--block"
              tabIndex={menuOuvert ? 0 : -1}
              onClick={() => void deconnecter()}
            >
              Se déconnecter
            </button>
          </>
        ) : (
          <NavLink
            to="/connexion"
            className="btn btn--primary btn--block"
            tabIndex={menuOuvert ? 0 : -1}
          >
            Se connecter
          </NavLink>
        )}

        <div className="mobile-drawer__legal">
          <NavLink to="/a-propos" tabIndex={menuOuvert ? 0 : -1}>À propos</NavLink>
          <NavLink to="/confidentialite" tabIndex={menuOuvert ? 0 : -1}>Confidentialité</NavLink>
          <NavLink to="/conditions" tabIndex={menuOuvert ? 0 : -1}>CGU</NavLink>
        </div>
      </nav>

      <main id="contenu" data-variant={variant}>
        {children}
      </main>

      {/* L'atelier occupe tout l'écran : le pied de page n'y a pas sa place. */}
      {variant === "page" ? <SiteFooter /> : null}
    </>
  );
}
