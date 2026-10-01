import asyncio
import json

from pydantic import BaseModel, Field, ValidationError

from app.tools.base import Tool, ToolContext, ToolResult

SYSTEM = (
    "Tu es un enseignant. À partir du texte fourni, crée un quiz à choix multiples en français. "
    "Réponds UNIQUEMENT par un objet JSON de la forme : "
    '{"title": str, "questions": [{"question": str, "choices": [str, str, str, str], '
    '"answer_index": int, "explanation": str}]}. '
    "Chaque question a exactement 4 choix, une seule bonne réponse, et une explication courte. "
    "Les questions doivent porter uniquement sur le texte fourni."
)


class QuizQuestion(BaseModel):
    question: str
    choices: list[str] = Field(min_length=2, max_length=6)
    answer_index: int
    explanation: str = ""


class Quiz(BaseModel):
    title: str
    questions: list[QuizQuestion] = Field(min_length=1)


class QuizTool(Tool):
    name = "generate_quiz"
    description = "Génère un QCM / quiz d'auto-évaluation à partir des sources sélectionnées."
    parameters = {
        "type": "object",
        "properties": {
            "topic": {"type": "string", "description": "Thème du quiz (optionnel)"},
            "n_questions": {"type": "integer", "description": "Nombre de questions (défaut 5, max 15)"},
        },
    }

    async def run(self, ctx: ToolContext, topic: str = "", n_questions: int = 5) -> ToolResult:
        n = max(1, min(int(n_questions), 15))
        context = await asyncio.to_thread(ctx.services.rag.context_for, topic, ctx.source_ids)
        if not context:
            return ToolResult("Aucune source disponible : ajoute d'abord un document.")
        user = f"Nombre de questions : {n}.\n\nTEXTE :\n{context}"
        quiz = None
        for _ in range(2):
            raw = await ctx.services.llm.ajson(
                [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}])
            try:
                quiz = Quiz.model_validate(raw)
                if all(0 <= q.answer_index < len(q.choices) for q in quiz.questions):
                    break
                quiz = None
            except ValidationError:
                quiz = None
        if quiz is None:
            return ToolResult("Échec de génération du quiz (format invalide). Réessaie.")
        payload = quiz.model_dump()
        art = ctx.save_artifact("quiz", quiz.title, json.dumps(payload, ensure_ascii=False).encode(), "json", "application/json")
        return ToolResult(f"Quiz « {quiz.title} » généré ({len(quiz.questions)} questions).", data=payload, artifacts=[art])
