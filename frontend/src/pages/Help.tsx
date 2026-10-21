import { Link } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { Icon } from "../components/Icon";

const SOMMAIRE = [
  { id: "demarrer", label: "Démarrer" },
  { id: "documents", label: "Déposer des documents" },
  { id: "questions", label: "Poser une question" },
  { id: "atelier", label: "Résumé et quiz" },
  { id: "carnet", label: "Le carnet" },
  { id: "confidentialite", label: "Confidentialité" },
  { id: "limites", label: "Limites connues" },
  { id: "raccourcis", label: "Raccourcis" },
  { id: "depannage", label: "Dépannage" },
];

export function Help() {
  return (
    <AppShell>
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Documentation</p>
            <h1 style={{ marginTop: 6 }}>Mode d'emploi</h1>
            <p>
              Ce que fait Nunya, ce qu'il ne fait pas encore, et comment l'utiliser sans mauvaise
              surprise.
            </p>
          </div>
          <Link to="/atelier" className="btn btn--primary">
            <Icon name="atelier" size={15} />
            Ouvrir l'atelier
          </Link>
        </div>

        <div className="doc-layout">
          <nav className="doc-toc" aria-label="Sommaire">
            {SOMMAIRE.map((entree) => (
              <a key={entree.id} href={`#${entree.id}`}>
                {entree.label}
              </a>
            ))}
          </nav>

          <article className="doc">
            <h2 id="demarrer">Démarrer</h2>
            <p>
              L'atelier s'ouvre sans inscription : ta session est identifiée par un code stocké
              dans ton navigateur. Tu peux la retrouver dans Réglages → Session, et la copier pour
              la réutiliser sur le même appareil.
            </p>
            <p>
              Tant que le badge en haut à droite indique « Moteur en préparation », le modèle de
              recherche se charge encore. Tu peux déjà déposer des documents : l'indexation
              attendra qu'il soit prêt.
            </p>

            <h2 id="documents">Déposer des documents</h2>
            <p>
              Utilise le bouton <strong>Ajouter</strong> ou la zone de dépôt du volet Sources.
              Formats acceptés : <strong>PDF</strong>, <strong>Word (.docx)</strong>, texte et
              Markdown. Un document est découpé en passages d'environ 1 000 caractères, avec un
              recouvrement, puis indexé.
            </p>
            <ul>
              <li>Le nombre de passages s'affiche sous chaque document.</li>
              <li>
                Les tableaux des fichiers Word sont indexés : un cours présenté sous forme de
                tableau reste interrogeable.
              </li>
              <li>Un PDF scanné sans couche texte est refusé avec un message explicite.</li>
              <li>
                Cocher ou décocher un document limite la recherche aux sources actives ; le
                compteur du volet Discussion indique combien sont utilisées.
              </li>
            </ul>

            <h2 id="questions">Poser une question</h2>
            <p>
              L'agent décide lui-même quand chercher dans tes documents. Il ne répond qu'à partir
              des passages trouvés : si l'information est absente, il le dit plutôt que d'inventer.
            </p>
            <p>
              Sous chaque réponse, un badge indique l'outil réellement utilisé —{" "}
              <span className="mono">recherche</span>, <span className="mono">résumé</span> ou{" "}
              <span className="mono">quiz</span>. C'est la trace de son raisonnement, pas une
              décoration.
            </p>

            <h2 id="atelier">Résumé et quiz</h2>
            <p>
              Demande par exemple « fais-moi un résumé en 5 points » ou « génère un quiz de 5
              questions ». Le résultat apparaît dans le volet <strong>Atelier</strong>, à droite.
            </p>
            <p>
              <strong>Rien n'est enregistré automatiquement.</strong> Un résumé ou un quiz reste à
              l'écran tant que tu ne cliques pas sur « Ajouter au Carnet ». C'est une règle du
              produit, pas un réglage.
            </p>
            <p>
              Le quiz se joue directement dans l'atelier : une réponse par question, une
              explication, puis un score. Tu peux le rejouer avant de le garder.
            </p>

            <h2 id="carnet">Le carnet</h2>
            <p>
              Le carnet — « Mon Nunyati » — liste les artefacts que tu as explicitement enregistrés,
              du plus récent au plus ancien. Chaque entrée s'ouvre dans un onglet ou se télécharge.
            </p>
            <p>
              Les artefacts sont rattachés à la session. Une nouvelle session repart avec un carnet
              vide ; les documents, eux, restent disponibles.
            </p>

            <h2 id="confidentialite">Confidentialité</h2>
            <ul>
              <li>Les documents sont stockés côté serveur, dans ton espace de travail.</li>
              <li>Ils ne sont jamais publiés ni partagés avec un autre utilisateur.</li>
              <li>
                Supprimer un document retire aussi ses passages de l'index de recherche : il ne
                peut plus apparaître dans une réponse.
              </li>
              <li>
                Les échanges avec le modèle de langage passent par l'API du fournisseur configuré
                sur le serveur. Ne dépose pas de documents que tu ne peux pas transmettre.
              </li>
            </ul>

            <h2 id="limites">Limites connues</h2>
            <ul>
              <li>
                <strong>Langues locales</strong> — la traduction en éwé existe côté serveur mais
                n'est pas active dans cette version. Les boutons concernés l'indiquent.
              </li>
              <li>
                <strong>Fiche bilingue, export PDF/Word, graphiques</strong> — annoncés dans
                l'interface comme « bientôt disponibles ». Ils ne sont pas branchés, et rien ne
                simule leur fonctionnement.
              </li>
              <li>
                <strong>Comptes</strong> — l'authentification arrive avec le déploiement. La page de
                connexion l'explique et propose une session locale.
              </li>
              <li>
                <strong>Historique</strong> — les messages de discussion ne sont pas conservés après
                un redémarrage du serveur. Les artefacts et les documents, si.
              </li>
            </ul>

            <h2 id="raccourcis">Raccourcis</h2>
            <ul>
              <li>
                <span className="kbd">Entrée</span> envoyer le message
              </li>
              <li>
                <span className="kbd">Maj</span> + <span className="kbd">Entrée</span> nouvelle
                ligne
              </li>
              <li>
                <span className="kbd">Échap</span> fermer une fenêtre
              </li>
            </ul>

            <h2 id="depannage">Dépannage</h2>
            <h3>« Serveur injoignable »</h3>
            <p>
              Le backend n'est pas démarré, ou il tourne sur un autre port. Démarre-le, puis
              recharge la page.
            </p>
            <h3>« Moteur en préparation » reste affiché</h3>
            <p>
              Le premier chargement du modèle d'embedding peut prendre plusieurs minutes sur une
              machine modeste, surtout si l'antivirus analyse les bibliothèques à chaque démarrage.
              Laisse le serveur tranquille : le badge passera à « Prêt ».
            </p>
            <h3>« GROQ_API_KEY manquant »</h3>
            <p>
              La clé du modèle de langage est absente du fichier <span className="mono">.env</span>{" "}
              à la racine du projet. La recherche documentaire fonctionne, mais aucune réponse ne
              peut être générée.
            </p>
            <h3>Un document n'est pas indexé</h3>
            <p>
              Vérifie qu'il s'agit d'un PDF avec du texte sélectionnable, ou d'un .docx. Un scan
              photographique ne contient pas de texte exploitable.
            </p>
          </article>
        </div>
      </div>
    </AppShell>
  );
}
