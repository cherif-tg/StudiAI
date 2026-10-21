import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Icon } from "../Icon";
import { Markdown } from "../Markdown";
import { api } from "../../lib/api";
import type { AgentMode, AgentModeInfo, ChatMessage } from "../../lib/types";

const SUGGESTIONS = [
  "Résume le document principal en 5 points",
  "Fais-moi un quiz de 5 questions",
  "Explique-moi ce chapitre étape par étape",
];

const LIBELLES_OUTILS: Record<string, string> = {
  rag_search: "recherche",
  summarize: "résumé",
  generate_quiz: "quiz",
};

/** Repli si le catalogue du serveur est indisponible : mêmes libellés. */
const MODES_REPLI: AgentModeInfo[] = [
  { id: "standard", label: "Standard", description: "Réponse directe, appuyée sur les passages." },
  {
    id: "socratique",
    label: "Tuteur socratique",
    description: "Guide par des questions, avec exemples et analogies.",
  },
  {
    id: "reflexion",
    label: "Réflexion",
    description: "Décompose un problème complexe, montre le plan.",
  },
  { id: "precis", label: "Précis", description: "Court, factuel, chiffres et termes exacts." },
];

const CLE_MODE = "nunya.mode";

function modeMemorise(): AgentMode {
  try {
    const valeur = localStorage.getItem(CLE_MODE);
    if (valeur && MODES_REPLI.some((m) => m.id === valeur)) return valeur as AgentMode;
  } catch {
    /* stockage refusé */
  }
  return "standard";
}

export function ChatPane({
  messages,
  envoi,
  envoyer,
  nouvelleSession,
  sourcesActives,
  nombreSources,
  onOuvrirAtelier,
}: {
  messages: ChatMessage[];
  envoi: boolean;
  envoyer: (texte: string, mode: AgentMode) => void;
  nouvelleSession: () => void;
  sourcesActives: number;
  nombreSources: number;
  onOuvrirAtelier: () => void;
}) {
  const [brouillon, setBrouillon] = useState("");
  const [modes, setModes] = useState<AgentModeInfo[]>(MODES_REPLI);
  const [mode, setMode] = useState<AgentMode>(modeMemorise);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const zone = useRef<HTMLTextAreaElement>(null);
  const journal = useRef<HTMLDivElement>(null);
  const selecteur = useRef<HTMLDivElement>(null);

  const modeCourant = modes.find((element) => element.id === mode) ?? modes[0];

  useEffect(() => {
    let vivant = true;
    api
      .modes()
      .then((catalogue) => {
        if (vivant && catalogue.modes.length) setModes(catalogue.modes);
      })
      .catch(() => {
        /* le repli local suffit : le serveur validera de son côté */
      });
    return () => {
      vivant = false;
    };
  }, []);

  useEffect(() => {
    const element = journal.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const element = zone.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
  }, [brouillon]);

  // Fermeture du menu : Échap, ou clic en dehors.
  useEffect(() => {
    if (!menuOuvert) return undefined;
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setMenuOuvert(false);
    };
    const surClic = (evenement: MouseEvent) => {
      if (!selecteur.current?.contains(evenement.target as Node)) setMenuOuvert(false);
    };
    document.addEventListener("keydown", surTouche);
    document.addEventListener("mousedown", surClic);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.removeEventListener("mousedown", surClic);
    };
  }, [menuOuvert]);

  const choisirMode = (valeur: AgentMode) => {
    setMode(valeur);
    setMenuOuvert(false);
    try {
      localStorage.setItem(CLE_MODE, valeur);
    } catch {
      /* le choix ne survivra pas au rechargement */
    }
    zone.current?.focus();
  };

  const soumettre = (evenement?: FormEvent) => {
    evenement?.preventDefault();
    const texte = brouillon.trim();
    if (!texte || envoi) return;
    setBrouillon("");
    envoyer(texte, mode);
  };

  return (
    <section className="pane pane--chat" aria-label="Discussion">
      <div className="pane__head">
        <span className="pane__title">
          <Icon name="discussion" size={15} />
          Discussion
        </span>
        <div className="row gap-2">
          <span className="badge" title="Documents utilisés pour répondre">
            {sourcesActives}/{nombreSources} sources
          </span>
          <button className="btn btn--quiet btn--sm" onClick={nouvelleSession}>
            <Icon name="rafraichir" size={13} />
            Nouvelle conversation
          </button>
        </div>
      </div>

      <div className="pane__body" ref={journal}>
        {!messages.length ? (
          <div style={{ margin: "auto 0", padding: "var(--sp-4)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)" }}>
              Bonjour, je suis Nunya.
            </h3>
            <p className="muted" style={{ marginTop: 8, maxWidth: "46ch" }}>
              Dépose un cours, puis pose ta question. Je réponds à partir de tes documents, et
              seulement d'eux. Tu peux aussi me demander un résumé ou un quiz.
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  className="chip"
                  onClick={() => {
                    if (nombreSources === 0) {
                      onOuvrirAtelier();
                      return;
                    }
                    envoyer(suggestion, mode);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="chat-log">
          {messages.map((message) => (
            <div key={message.id} className={`msg msg--${message.role}`}>
              {message.pending ? (
                <span className="row gap-2 small muted">
                  <span className="spinner" />
                  Recherche dans tes documents…
                </span>
              ) : message.role === "agent" ? (
                <>
                  <Markdown text={message.text} className="prose" />
                  {message.steps?.length ? (
                    <div className="trace" aria-label="Outils utilisés">
                      {message.steps.map((etape, index) => (
                        <span className="trace__item" key={`${message.id}-${index}`}>
                          <Icon name="etincelle" size={11} />
                          {LIBELLES_OUTILS[etape.tool] ?? etape.tool}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                message.text
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pane__foot">
        <form className="composer" onSubmit={soumettre}>
          <label className="sr-only" htmlFor="question">
            Ta question
          </label>
          <textarea
            id="question"
            ref={zone}
            rows={1}
            placeholder={
              nombreSources ? "Pose une question sur tes sources…" : "Dépose d'abord un document…"
            }
            value={brouillon}
            onChange={(evenement) => setBrouillon(evenement.target.value)}
            onKeyDown={(evenement) => {
              if (evenement.key === "Enter" && !evenement.shiftKey) {
                evenement.preventDefault();
                soumettre();
              }
            }}
            disabled={envoi}
          />

          <div className="mode-picker" ref={selecteur}>
            <button
              type="button"
              className="mode-btn"
              aria-haspopup="listbox"
              aria-expanded={menuOuvert}
              onClick={() => setMenuOuvert((ouvert) => !ouvert)}
              title={`Mode de réponse : ${modeCourant?.label}. Cliquer pour changer.`}
            >
              <Icon name="etincelle" size={14} />
              <span className="mode-btn__label">{modeCourant?.label ?? "Standard"}</span>
            </button>

            {menuOuvert ? (
              <ul className="mode-menu" role="listbox" aria-label="Mode de réponse">
                {modes.map((element) => (
                  <li key={element.id} role="option" aria-selected={element.id === mode}>
                    <button type="button" onClick={() => choisirMode(element.id)}>
                      <span className="mode-menu__label">
                        {element.label}
                        {element.id === mode ? <Icon name="coche" size={13} /> : null}
                      </span>
                      <span className="mode-menu__desc">{element.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--icon"
            disabled={envoi || !brouillon.trim()}
            aria-label="Envoyer la question"
            title="Envoyer (Entrée)"
          >
            {envoi ? <span className="spinner" /> : <Icon name="fleche" size={17} />}
          </button>
        </form>
        <p className="hint" style={{ marginTop: 6 }}>
          Entrée pour envoyer · Maj+Entrée pour aller à la ligne
        </p>
      </div>
    </section>
  );
}
