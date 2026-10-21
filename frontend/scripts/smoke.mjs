/**
 * Test de rendu du bundle : exécute l'application compilée dans jsdom et vérifie
 * qu'il n'y a ni page blanche ni erreur d'exécution.
 *
 * Il ne remplace pas un contrôle visuel : il attrape les crashs de rendu
 * (provider manquant, import cassé, exception au montage).
 *
 * Usage :
 *   npm run build:smoke
 *   npm run smoke -- /atelier
 */
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

const chemin = process.argv[2] ?? "/atelier";
const url = `http://127.0.0.1:8000${chemin}`;

const erreurs = [];
const consoleVirtuelle = new VirtualConsole();
consoleVirtuelle.on("jsdomError", (erreur) => erreurs.push(String(erreur)));
consoleVirtuelle.on("error", (...arguments_) => erreurs.push(arguments_.join(" ")));

const reponses = {
  "/health": { status: "ok", rag: true, llm: true },
  "/sources": [{ id: "src-smoke", filename: "cours-exemple.docx", chunks: 7 }],
  "/artifacts": [],
};

const code = readFileSync(new URL("../dist-smoke/app.js", import.meta.url), "utf8");

const dom = new JSDOM("<!doctype html><html lang='fr'><head><title>smoke</title></head><body><div id='root'></div></body></html>", {
  url,
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole: consoleVirtuelle,
});

// jsdom n'implémente pas matchMedia : on fournit le contrat minimal attendu par
// le thème et par React Router. Les navigateurs réels l'implémentent nativement.
dom.window.matchMedia = (requete) => ({
  matches: false,
  media: requete,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});

dom.window.scrollTo = () => {}; // non implémenté par jsdom

dom.window.fetch = async (cible) => {
  const cheminDemande = String(cible);
  const cle = Object.keys(reponses).find((prefixe) => cheminDemande.startsWith(prefixe));
  const corps = cle ? reponses[cle] : { detail: "route non simulée en smoke test" };
  return {
    ok: Boolean(cle),
    status: cle ? 200 : 404,
    json: async () => corps,
    text: async () => JSON.stringify(corps),
  };
};

try {
  dom.window.eval(code);
} catch (erreur) {
  erreurs.push(`exception au montage : ${erreur?.message ?? erreur}`);
}

await new Promise((resoudre) => setTimeout(resoudre, 1800));

const racine = dom.window.document.getElementById("root");
const contenu = racine?.innerHTML ?? "";
const texte = (racine?.textContent ?? "").replace(/\s+/g, " ").trim();

console.log(`route     : ${chemin}`);
console.log(`rendu     : ${contenu.length} caractères`);
console.log(`extrait   : ${texte.slice(0, 180) || "(vide)"}`);

if (erreurs.length) {
  console.error("ERREURS D'EXÉCUTION :");
  for (const erreur of erreurs.slice(0, 6)) console.error(` - ${erreur}`);
}

if (!contenu.length || erreurs.length) {
  console.error("ÉCHEC");
  process.exit(1);
}

console.log("OK : rendu sans erreur");
dom.window.close();
