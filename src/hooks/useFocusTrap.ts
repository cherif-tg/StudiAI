import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCALISABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function elementsFocalisables(conteneurs: RefObject<HTMLElement | null>[]): HTMLElement[] {
  return conteneurs.flatMap((ref) => {
    const racine = ref.current;
    if (!racine) return [];
    const liste = Array.from(racine.querySelectorAll<HTMLElement>(FOCALISABLES));
    if (racine.matches(FOCALISABLES)) liste.unshift(racine); // le conteneur peut être un bouton
    return liste.filter((el) => el.offsetParent !== null || el === document.activeElement);
  });
}

/**
 * Garde le focus clavier dans une fenêtre ou un menu ouvert (Tab / Maj+Tab
 * bouclent), place le focus au bon endroit à l'ouverture et le rend à
 * l'élément d'origine à la fermeture.
 */
export function useFocusTrap(
  actif: boolean,
  conteneurs: RefObject<HTMLElement | null>[],
  options: { initial?: () => HTMLElement | null | undefined; restaurer?: boolean } = {},
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const conteneursRef = useRef(conteneurs);
  conteneursRef.current = conteneurs;

  useEffect(() => {
    if (!actif) return undefined;
    const precedent = document.activeElement as HTMLElement | null;

    const cadre = window.requestAnimationFrame(() => {
      const cible = optionsRef.current.initial?.() ?? elementsFocalisables(conteneursRef.current)[0];
      cible?.focus({ preventScroll: true });
    });

    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key !== "Tab") return;
      const elements = elementsFocalisables(conteneursRef.current);
      if (!elements.length) return;
      const premier = elements[0];
      const dernier = elements[elements.length - 1];
      const courant = document.activeElement as HTMLElement | null;
      const dedans = courant ? elements.includes(courant) : false;
      if (evenement.shiftKey && (courant === premier || !dedans)) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && (courant === dernier || !dedans)) {
        evenement.preventDefault();
        premier.focus();
      }
    };

    document.addEventListener("keydown", surTouche);
    return () => {
      window.cancelAnimationFrame(cadre);
      document.removeEventListener("keydown", surTouche);
      if (optionsRef.current.restaurer !== false && precedent && document.contains(precedent)) {
        precedent.focus({ preventScroll: true });
      }
    };
  }, [actif]);
}
