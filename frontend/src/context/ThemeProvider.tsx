import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
};

const CLE = "nunya.theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function themeSysteme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function preferenceInitiale(): ThemePreference {
  try {
    const stocke = localStorage.getItem(CLE);
    if (stocke === "light" || stocke === "dark" || stocke === "system") return stocke;
  } catch {
    /* stockage refusé : on suit le système */
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(preferenceInitiale);
  const [systeme, setSysteme] = useState<"light" | "dark">(themeSysteme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const ecouter = () => setSysteme(media.matches ? "dark" : "light");
    media.addEventListener("change", ecouter);
    return () => media.removeEventListener("change", ecouter);
  }, []);

  const resolved = preference === "system" ? systeme : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved === "dark" ? "#121A19" : "#EFEAE1");
  }, [resolved]);

  const setPreference = useCallback((valeur: ThemePreference) => {
    setPreferenceState(valeur);
    try {
      localStorage.setItem(CLE, valeur);
    } catch {
      /* tant pis, le choix ne survivra pas au rechargement */
    }
  }, []);

  const valeur = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={valeur}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const contexte = useContext(ThemeContext);
  if (!contexte) throw new Error("useTheme doit être utilisé dans <ThemeProvider>");
  return contexte;
}
