/**
 * Petit accès sûr au stockage local du navigateur : il peut être plein,
 * désactivé (navigation privée) ou effacé ; l'application doit continuer.
 */

export function lireJSON<T>(cle: string, defaut: T): T {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}

export function ecrireJSON(cle: string, valeur: unknown): boolean {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch {
    return false;
  }
}

export function supprimer(cle: string): void {
  try {
    localStorage.removeItem(cle);
  } catch {
    /* rien à faire */
  }
}

/** Efface toutes les clés qui commencent par `prefixe`. */
export function supprimerPrefixe(prefixe: string): void {
  try {
    const cles: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const cle = localStorage.key(i);
      if (cle?.startsWith(prefixe)) cles.push(cle);
    }
    cles.forEach((cle) => localStorage.removeItem(cle));
  } catch {
    /* rien à faire */
  }
}

/** Déclenche le téléchargement d'un fichier généré dans la page. */
export function telechargerFichier(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
