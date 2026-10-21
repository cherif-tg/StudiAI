/** Types partagés avec l'API Nunya (backend/app/schemas.py). */

export type Source = {
  id: string;
  filename: string;
  chunks: number;
};

export type ArtifactKind = "summary" | "quiz";

export type Artifact = {
  id: string;
  kind: string;
  title: string;
  mime: string;
  url: string;
  created_at?: number | null;
};

export type ToolStep = {
  tool: string;
  args: Record<string, unknown>;
  result_preview: string;
  data: Record<string, unknown>;
};

export type Translation = {
  language: string;
  text: string;
  error?: string | null;
};

export type ChatResponse = {
  answer: string;
  translation: Translation | null;
  steps: ToolStep[];
  artifacts: Artifact[];
};

export type QuizQuestion = {
  question: string;
  choices: string[];
  answer_index: number;
  explanation?: string;
};

export type Quiz = {
  title: string;
  questions: QuizQuestion[];
};

export type Health = {
  status: string;
  rag: boolean;
  llm: boolean;
};

export type AgentMode = "standard" | "socratique" | "reflexion" | "precis";

export type AgentModeInfo = {
  id: AgentMode;
  label: string;
  description: string;
};

export type User = {
  id: string;
  email: string;
  name?: string | null;
};

export type ChatMessage = {
  id: string;
  role: "me" | "agent";
  text: string;
  steps?: ToolStep[];
  sources?: string[];
  pending?: boolean;
  error?: boolean;
};
