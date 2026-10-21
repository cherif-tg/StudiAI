import { useEffect, useRef, useState } from "react";

import { Icon } from "../Icon";
import { Markdown } from "../Markdown";
import type { ChatMessage } from "../../lib/types";

const SUGGESTIONS = [
  "Résume le document principal en 5 points",
  "Fais-moi un quiz de 5 questions",
  "Quelles sont les idées clés du chapitre 2 ?",
];

const LIBELLES_OUTILS: Record<string, string> = {
  rag_search: "recherche",
  summarize: "résumé",
  generate_quiz: "quiz",
};

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
  envoyer: (texte: string) => void;
  nouvelleSession: () => void;
  sourcesActives: number;
  nombreSources: number;
  onOuvrirAtelier: () => void;
}) {
  const [brouillon, setBrouillon] = useState("");
  const zone = useRef<HTMLTextAreaElement>(null);
  const journal = useRef<HTMLDivElement>(null);

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

  const soumettre = () => {
    const texte = brouillon.trim();
    if (!texte || envoi) return;
    setBrouillon("");
    envoyer(texte);
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
            Nouvelle session
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
                    envoyer(suggestion);
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
        <form
          className="composer"
          onSubmit={(evenement) => {
            evenement.preventDefault();
            soumettre();
          }}
        >
          <label className="sr-only" htmlFor="question">
            Ta question
          </label>
          <textarea
            id="question"
            ref={zone}
            rows={1}
            placeholder={
              nombreSources
                ? "Pose une question sur tes sources…"
                : "Dépose d'abord un document…"
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
