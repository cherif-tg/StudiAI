import { useCallback, useMemo, useState } from "react";

import { AppShell } from "../components/AppShell";
import { AtelierPane } from "../components/workspace/AtelierPane";
import type { CleOutil } from "../components/workspace/AtelierPane";
import { ChatPane } from "../components/workspace/ChatPane";
import { SourcesPane } from "../components/workspace/SourcesPane";
import { useAppData } from "../context/AppDataProvider";
import { useToast } from "../context/ToastProvider";
import { ApiError, api } from "../lib/api";
import { identifiant, titreDepuisMarkdown } from "../lib/format";
import type { ChatMessage, Quiz, ToolStep } from "../lib/types";

function extraireEtape(etapes: ToolStep[], outil: string): ToolStep | undefined {
  return [...etapes].reverse().find((etape) => etape.tool === outil);
}

export function Workspace() {
  const { sessionId, nouvelleSession, sources, selection, enregistrerArtefact } = useAppData();
  const { push } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [resume, setResume] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [outil, setOutil] = useState<CleOutil>("resume");
  const [enregistrement, setEnregistrement] = useState(false);

  const envoyer = useCallback(
    async (texte: string) => {
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
        });

        setMessages((liste) =>
          liste.map((message) =>
            message.id === idReponse
              ? { ...message, text: reponse.answer, steps: reponse.steps, pending: false }
              : message,
          ),
        );

        const etapeResume = extraireEtape(reponse.steps, "summarize");
        const markdown = etapeResume?.data?.markdown;
        if (typeof markdown === "string" && markdown.trim()) {
          setResume(markdown);
          setOutil("resume");
        }

        const etapeQuiz = extraireEtape(reponse.steps, "generate_quiz");
        const donneesQuiz = etapeQuiz?.data as Quiz | undefined;
        if (donneesQuiz?.questions?.length) {
          setQuiz(donneesQuiz);
          setOutil("quiz");
        }
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
    [envoi, push, selection, sessionId, sources.length],
  );

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

  return (
    <AppShell variant="full">
      <div className="workspace">
        <SourcesPane />
        <ChatPane
          messages={messages}
          envoi={envoi}
          envoyer={(texte) => void envoyer(texte)}
          nouvelleSession={() => {
            nouvelleSession();
            setMessages([]);
            setResume("");
            setQuiz(null);
            setOutil("resume");
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
