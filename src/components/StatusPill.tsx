import { useAppData } from "../context/AppDataProvider";

type Etat = { tone: "ok" | "warn" | "danger"; label: string; live?: boolean; titre: string };

export function StatusPill() {
  const { sante } = useAppData();

  let etat: Etat;
  if (!sante) {
    etat = {
      tone: "danger",
      label: "Serveur injoignable",
      titre: "Le backend ne répond pas. Démarre-le puis recharge la page.",
    };
  } else if (!sante.rag) {
    etat = {
      tone: "warn",
      label: "Moteur en préparation",
      live: true,
      titre:
        "Le modèle de recherche se charge. Tu peux déposer des documents, l'indexation attendra qu'il soit prêt.",
    };
  } else if (!sante.llm) {
    etat = {
      tone: "warn",
      label: "LLM non configuré",
      titre: "GROQ_API_KEY est absente du fichier .env : les réponses ne peuvent pas être générées.",
    };
  } else {
    etat = { tone: "ok", label: "Prêt", titre: "Recherche documentaire et génération disponibles." };
  }

  return (
    <span className={`badge badge--${etat.tone} status-pill`} title={etat.titre}>
      <span className={`dot${etat.live ? " dot--live" : ""}`} aria-hidden="true" />
      <span className="status-pill__label">{etat.label}</span>
    </span>
  );
}
