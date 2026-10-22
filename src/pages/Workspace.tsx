import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "../components/AppShell";
import { AtelierPane } from "../components/workspace/AtelierPane";
import type { CleOutil } from "../components/workspace/AtelierPane";
import { ChatPane } from "../components/workspace/ChatPane";
import { SourcesPane } from "../components/workspace/SourcesPane";
import { useAppData } from "../context/AppDataProvider";
import { useAuth } from "../context/AuthProvider";
import { useToast } from "../context/ToastProvider";
import { ApiError, api } from "../lib/api";
import {
  EVENEMENT_HISTORIQUE,
  chargerConversation,
  enregistrerConversation,
  listerConversations,
  oublierConversation,
} from "../lib/conversations";
import type { ResumeConversation } from "../lib/conversations";
import { identifiant, titreDepuisMarkdown } from "../lib/format";
import type { AgentMode, ChatMessage, Quiz, ToolStep } from "../lib/types";

function extraireEtape(etapes: ToolStep[], outil: string): ToolStep | undefined {
  return [...etapes].reverse().find((etape) => etape.tool === outil);
}

export function Workspace() {
  const { sessionId, nouvelleSession, reprendreSession, sources, selection, enregistrerArtefact } =
    useAppData();
  const { user } = useAuth();
  const { push } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [resume, setResume] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [outil, setOutil] = useState<CleOutil>("resume");
  const [enregistrement, setEnregistrement] = useState(false);

  /** Résumé et quiz renvoyés par l'agent : affichés dans l'atelier (inchangé). */
  const appliquerEtapes = useCallback((etapes: ToolStep[]) => {
    const etapeResume = extraireEtape(etapes, "summarize");
    const markdown = etapeResume?.data?.markdown;
    if (typeof markdown === "string" && markdown.trim()) {
      setResume(markdown);
      setOutil("resume");
    }

    const etapeQuiz = extraireEtape(etapes, "generate_quiz");
    const donneesQuiz = etapeQuiz?.data as Quiz | undefined;
    if (donneesQuiz?.questions?.length) {
      setQuiz(donneesQuiz);
      setOutil("quiz");
    }
  }, []);

  const envoyer = useCallback(
    async (texte: string, mode: AgentMode) => {
      if (envoi) return;

      if (!sources.length) {
        push("Dépose d'abord un document", {
          message: "L'agent répond uniquement à partir de tes sources.",
          tone: "info",
        });
        return;
      }

      if (!selection.length) {
        push("Aucune source sélectionnée", {
          message: "Coche au moins un document dans le volet Sources, sinon je n'ai rien à lire.",
          tone: "info",
        });
        return;
      }

      const idQuestion = identifiant();
      const idReponse = identifiant();
      setMessages((liste) => [
        ...liste,
        { id: idQuestion, role: "me", text: texte },
        { id: idReponse, role: "agent", text: "", pending: true },
      ]);
      setEnvoi(true);

      try {
        const reponse = await api.chat({
          session_id: sessionId,
          message: texte,
          source_ids: selection,
          mode,
        });

        setMessages((liste) =>
          liste.map((message) =>
            message.id === idReponse
              ? { ...message, text: reponse.answer, steps: reponse.steps, pending: false }
              : message,
          ),
        );

        appliquerEtapes(reponse.steps);
      } catch (erreur) {
        const message =
          erreur instanceof ApiError ? erreur.message : "Une erreur inattendue est survenue.";
        setMessages((liste) =>
          liste.map((element) =>
            element.id === idReponse
              ? {
                  ...element,
                  pending: false,
                  error: true,
                  text: `Je n'ai pas pu répondre : ${message}`,
                }
              : element,
          ),
        );
        push("Réponse interrompue", { message, tone: "error" });
      } finally {
        setEnvoi(false);
      }
    },
    [appliquerEtapes, envoi, push, selection, sessionId, sources.length],
  );

  // --- Régénérer une réponse ----------------------------------------------
  // On repose la même question ; chaque réponse obtenue est gardée comme une
  // version, consultable avec les flèches sous le message.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const regenerer = useCallback(
    async (idReponse: string, mode: AgentMode) => {
      if (envoi) return;
      const liste = messagesRef.current;
      const position = liste.findIndex((message) => message.id === idReponse);
      const question = liste
        .slice(0, position)
        .reverse()
        .find((message) => message.role === "me");
      if (position < 0 || !question) return;

      if (!sources.length || !selection.length) {
        push("Aucune source sélectionnée", {
          message: "Coche au moins un document dans le volet Sources pour régénérer la réponse.",
          tone: "info",
        });
        return;
      }

      const ancienne = liste[position];
      const versions =
        ancienne.versions ?? (ancienne.error ? [] : [{ text: ancienne.text, steps: ancienne.steps }]);
      setMessages((courants) =>
        courants.map((message) =>
          message.id === idReponse ? { ...message, pending: true, error: false, versions } : message,
        ),
      );
      setEnvoi(true);

      try {
        const reponse = await api.chat({
          session_id: sessionId,
          message: question.text,
          source_ids: selection,
          mode,
        });
        const nouvelles = [...versions, { text: reponse.answer, steps: reponse.steps }];
        setMessages((courants) =>
          courants.map((message) =>
            message.id === idReponse
              ? {
                  ...message,
                  pending: false,
                  text: reponse.answer,
                  steps: reponse.steps,
                  versions: nouvelles,
                  version: nouvelles.length - 1,
                }
              : message,
          ),
        );
        appliquerEtapes(reponse.steps);
      } catch (erreur) {
        const message = erreur instanceof ApiError ? erreur.message : "Une erreur inattendue est survenue.";
        // On revient à la dernière réponse valable, s'il y en a une.
        setMessages((courants) =>
          courants.map((element) => {
            if (element.id !== idReponse) return element;
            const derniere = versions[versions.length - 1];
            return derniere
              ? { ...element, pending: false, text: derniere.text, steps: derniere.steps, version: versions.length - 1 }
              : { ...element, pending: false, error: true, text: `Je n'ai pas pu répondre : ${message}` };
          }),
        );
        push("Régénération interrompue", { message, tone: "error" });
      } finally {
        setEnvoi(false);
      }
    },
    [appliquerEtapes, envoi, push, selection, sessionId, sources.length],
  );

  // --- Modifier une question déjà envoyée ---------------------------------
  // La question réécrite repart par le même chemin qu'un envoi normal
  // (`envoyer`) ; la discussion est d'abord coupée juste avant l'ancienne
  // question, pour que la nouvelle réponse prenne sa place.
  const modifierQuestion = useCallback(
    (idQuestion: string, texte: string, mode: AgentMode) => {
      if (envoi) return;
      // Mêmes vérifications qu'`envoyer`, faites avant de couper la discussion
      // pour ne rien perdre si l'envoi est refusé.
      if (!sources.length || !selection.length) {
        void envoyer(texte, mode);
        return;
      }
      setMessages((courants) => {
        const position = courants.findIndex((message) => message.id === idQuestion);
        return position < 0 ? courants : courants.slice(0, position);
      });
      void envoyer(texte, mode);
    },
    [envoi, envoyer, selection.length, sources.length],
  );

  const changerVersion = useCallback((idReponse: string, index: number) => {
    setMessages((courants) =>
      courants.map((message) => {
        const version = message.versions?.[index];
        return message.id === idReponse && version
          ? { ...message, text: version.text, steps: version.steps, version: index }
          : message;
      }),
    );
  }, []);

  const ajouterResume = useCallback(async () => {
    if (!resume) return;
    setEnregistrement(true);
    await enregistrerArtefact("summary", titreDepuisMarkdown(resume, "Résumé des sources"), resume);
    setEnregistrement(false);
  }, [enregistrerArtefact, resume]);

  const ajouterQuiz = useCallback(async () => {
    if (!quiz) return;
    setEnregistrement(true);
    await enregistrerArtefact("quiz", quiz.title || "Quiz", JSON.stringify(quiz, null, 2));
    setEnregistrement(false);
  }, [enregistrerArtefact, quiz]);

  const sourcesActives = useMemo(() => selection.length, [selection]);

  // --- Historique : la conversation est gardée dans ce navigateur ---------
  const compte = user?.id ?? "";
  const sessionChargee = useRef<string | null>(null);
  const [historique, setHistorique] = useState<ResumeConversation[]>([]);

  // À l'ouverture (ou à la reprise d'une conversation), on recharge ses messages
  // et on retrouve le dernier résumé et le dernier quiz pour l'atelier.
  useEffect(() => {
    if (!compte) return;
    const charges = chargerConversation(compte, sessionId);
    sessionChargee.current = sessionId;
    setMessages(charges);
    if (!charges.length) return;
    const etapes = charges.flatMap((message) => message.steps ?? []);
    const markdown = extraireEtape(etapes, "summarize")?.data?.markdown;
    const donneesQuiz = extraireEtape(etapes, "generate_quiz")?.data as Quiz | undefined;
    setResume(typeof markdown === "string" ? markdown : "");
    setQuiz(donneesQuiz?.questions?.length ? donneesQuiz : null);
  }, [compte, sessionId]);

  // Chaque changement de la discussion est enregistré (hors message en attente).
  useEffect(() => {
    if (!compte || sessionChargee.current !== sessionId) return;
    enregistrerConversation(compte, sessionId, messages);
    // Volontairement déclenché par les messages seuls (voir l'effet précédent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (!compte) return undefined;
    const actualiser = () => setHistorique(listerConversations(compte));
    actualiser();
    window.addEventListener(EVENEMENT_HISTORIQUE, actualiser);
    return () => window.removeEventListener(EVENEMENT_HISTORIQUE, actualiser);
  }, [compte]);

  const demarrerNouvelle = () => {
    nouvelleSession();
    setMessages([]);
    setResume("");
    setQuiz(null);
    setOutil("resume");
  };

  // Affichage mobile uniquement : quel volet est visible (aucun effet sur la logique).
  const [volet, setVolet] = useState<"sources" | "chat" | "atelier">("chat");
  const VOLETS = [
    { cle: "sources", label: "Sources", compte: sources.length || null, nouveau: false },
    { cle: "chat", label: "Discussion", compte: null, nouveau: false },
    { cle: "atelier", label: "Atelier", compte: null, nouveau: Boolean(resume || quiz) },
  ] as const;

  return (
    <AppShell variant="full">
      <div className="workspace" data-volet={volet}>
        <h1 className="sr-only">Atelier</h1>
        <div className="wk-tabs" role="tablist" aria-label="Volets de l'atelier">
          {VOLETS.map((element) => (
            <button
              key={element.cle}
              type="button"
              role="tab"
              className="wk-tab"
              aria-selected={volet === element.cle}
              onClick={() => setVolet(element.cle)}
            >
              {element.label}
              {element.compte ? <span className="wk-tab__count">{element.compte}</span> : null}
              {element.nouveau ? <span className="wk-tab__dot" aria-label="contenu disponible" /> : null}
            </button>
          ))}
        </div>
        <SourcesPane />
        <ChatPane
          messages={messages}
          envoi={envoi}
          envoyer={(texte, mode) => void envoyer(texte, mode)}
          nouvelleSession={demarrerNouvelle}
          historique={historique}
          sessionActive={sessionId}
          onReprendre={(id) => {
            if (id === sessionId) return;
            reprendreSession(id);
            setOutil("resume");
            setVolet("chat");
          }}
          onRegenerer={(id, mode) => void regenerer(id, mode)}
          onVersion={changerVersion}
          onModifier={modifierQuestion}
          onOublier={(id) => {
            oublierConversation(compte, id);
            if (id === sessionId) demarrerNouvelle();
          }}
          sourcesActives={sourcesActives}
          nombreSources={sources.length}
          onOuvrirAtelier={() => setOutil("resume")}
        />
        <AtelierPane
          outil={outil}
          setOutil={setOutil}
          resume={resume}
          quiz={quiz}
          onAjouterResume={() => void ajouterResume()}
          onAjouterQuiz={() => void ajouterQuiz()}
          enregistrement={enregistrement}
        />
      </div>
    </AppShell>
  );
}
