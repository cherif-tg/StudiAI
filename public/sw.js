/* Nunya : service worker.
 *
 * - Coquille de l'application : l'interface s'ouvre même sans réseau.
 * - Carnet hors ligne : la liste des artefacts et leurs fichiers sont gardés
 *   en cache dès qu'ils ont été chargés une fois, avec le profil et la liste
 *   des documents ; ils restent consultables sans connexion.
 * - Rien d'autre n'est mis en cache côté API : les questions, les dépôts et
 *   les exports passent toujours par le réseau.
 * - Le cache des données est vidé à la connexion, à la déconnexion et à la
 *   suppression du compte : un autre utilisateur de l'appareil ne le voit pas.
 */

const VERSION = "nunya-v2";
const COQUILLE = `${VERSION}-coquille`;
const DONNEES = `${VERSION}-donnees`;
const POLICES = `${VERSION}-polices`;

// Base de l'API passée à l'enregistrement (?api=...), vide = même origine.
const BASE_API = new URL(self.location.href).searchParams.get("api") || self.location.origin;
const ORIGINE_API = new URL(BASE_API, self.location.origin).origin;

const A_PRECHARGER = ["/", "/manifest.json", "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

// Lectures d'API gardées pour le mode hors ligne (GET uniquement).
const API_HORS_LIGNE = [/^\/artifacts(\/|$)/, /^\/auth\/me$/, /^\/sources$/];
// Écritures après lesquelles le cache de données doit être vidé.
const API_RESET = [/^\/auth\/(login|logout|register)$/, /^\/auth\/me$/, /^\/auth\/password\//];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(COQUILLE)
      .then((cache) => cache.addAll(A_PRECHARGER))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((cle) => !cle.startsWith(VERSION)).map((cle) => caches.delete(cle))))
      .then(() => self.clients.claim()),
  );
});

function chemin(url) {
  const base = new URL(BASE_API, self.location.origin);
  const prefixe = base.pathname.replace(/\/+$/, "");
  return prefixe && url.pathname.startsWith(prefixe) ? url.pathname.slice(prefixe.length) || "/" : url.pathname;
}

async function reseauPuisCache(requete, nomCache, cle) {
  const cache = await caches.open(nomCache);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) await cache.put(cle || requete, reponse.clone());
    return reponse;
  } catch (erreur) {
    const enCache = await cache.match(cle || requete);
    if (enCache) return enCache;
    throw erreur;
  }
}

async function cacheDabord(requete, nomCache) {
  const cache = await caches.open(nomCache);
  const enCache = await cache.match(requete);
  if (enCache) return enCache;
  const reponse = await fetch(requete);
  if (reponse.ok || reponse.type === "opaque") await cache.put(requete, reponse.clone());
  return reponse;
}

/** Après la liste du carnet, on garde aussi chaque artefact pour la lecture hors ligne. */
async function prechargerCarnet(reponse) {
  try {
    const liste = await reponse.clone().json();
    if (!Array.isArray(liste)) return;
    const cache = await caches.open(DONNEES);
    await Promise.all(
      liste
        .filter((artefact) => artefact && typeof artefact.url === "string")
        .map(async (artefact) => {
          const url = new URL(artefact.url, BASE_API.endsWith("/") ? BASE_API : `${BASE_API}/`).href;
          if (await cache.match(url)) return;
          const fichier = await fetch(url, { credentials: "include" });
          if (fichier.ok) await cache.put(url, fichier);
        }),
    );
  } catch {
    /* préchargement facultatif */
  }
}

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  const url = new URL(requete.url);
  const memeOrigine = url.origin === self.location.origin;
  const surApi = url.origin === ORIGINE_API;
  const route = chemin(url);

  // Écritures : jamais de cache ; on vide les données à chaque changement de compte.
  if (requete.method !== "GET") {
    if (surApi && API_RESET.some((motif) => motif.test(route))) {
      evenement.respondWith(
        fetch(requete).then((reponse) => {
          if (reponse.ok) caches.delete(DONNEES);
          return reponse;
        }),
      );
    }
    return;
  }

  // Polices Google : servies depuis le cache, rafraîchies au besoin.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    evenement.respondWith(cacheDabord(requete, POLICES));
    return;
  }

  // Données lues hors ligne (profil, documents, carnet).
  if (surApi && API_HORS_LIGNE.some((motif) => motif.test(route))) {
    evenement.respondWith(
      reseauPuisCache(requete, DONNEES).then((reponse) => {
        if (route === "/artifacts" && reponse.ok) evenement.waitUntil(prechargerCarnet(reponse));
        return reponse;
      }),
    );
    return;
  }

  if (!memeOrigine) return;

  // Navigation : réseau d'abord (version à jour), sinon la coquille en cache.
  if (requete.mode === "navigate") {
    evenement.respondWith(
      reseauPuisCache(requete, COQUILLE, "/").catch(async () => (await caches.match("/")) || Response.error()),
    );
    return;
  }

  // Fichiers compilés (noms hachés, donc immuables) et icônes.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    evenement.respondWith(cacheDabord(requete, COQUILLE));
  }
});
