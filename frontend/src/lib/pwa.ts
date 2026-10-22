/**
 * Application installable : enregistrement du service worker et invite
 * d'installation (« Ajouter à l'écran d'accueil »).
 */

type InviteInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let invite: InviteInstallation | null = null;
export const EVENEMENT_INSTALLATION = "nunya:installation";

export function demarrerPwa(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (evenement) => {
    evenement.preventDefault(); // on propose l'installation au bon endroit (Réglages)
    invite = evenement as InviteInstallation;
    window.dispatchEvent(new Event(EVENEMENT_INSTALLATION));
  });
  window.addEventListener("appinstalled", () => {
    invite = null;
    window.dispatchEvent(new Event(EVENEMENT_INSTALLATION));
  });

  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw.js${base ? `?api=${encodeURIComponent(base)}` : ""}`)
      .catch(() => {
        /* hors ligne indisponible : l'application fonctionne normalement */
      });
  });
}

/** iPhone / iPad (Safari) : pas d'invite native, l'installation passe par « Partager ». */
export function estIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function installationPossible(): boolean {
  return invite !== null;
}

export function dejaInstallee(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export async function installer(): Promise<boolean> {
  if (!invite) return false;
  await invite.prompt();
  const { outcome } = await invite.userChoice;
  invite = null;
  window.dispatchEvent(new Event(EVENEMENT_INSTALLATION));
  return outcome === "accepted";
}
