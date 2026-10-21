/** Petits utilitaires de présentation (dates, tailles, identifiants). */

export function formatDate(horodatage?: number | null): string {
  if (!horodatage) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(horodatage * 1000));
}

export function formatDateHeure(horodatage?: number | null): string {
  if (!horodatage) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(horodatage * 1000));
}

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export function identifiant(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export function tronquer(texte: string, longueur = 90): string {
  const propre = texte.replace(/\s+/g, " ").trim();
  return propre.length > longueur ? `${propre.slice(0, longueur - 1)}…` : propre;
}

/** Extrait un titre lisible d'un résumé Markdown (première ligne non vide). */
export function titreDepuisMarkdown(markdown: string, repli = "Résumé"): string {
  const ligne = markdown.split("\n").find((l) => l.trim().length > 0) ?? "";
  const propre = ligne.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").trim();
  return propre ? tronquer(propre, 80) : repli;
}
