"""Modes de l'agent : chacun ajoute une consigne au prompt système.

Le socle reste identique dans tous les modes : répondre uniquement à partir des
documents, passer par les outils pour un résumé ou un quiz, ne rien enregistrer
sans le geste de l'apprenant. Un mode change la **manière** de répondre, jamais
les garanties.
"""
from __future__ import annotations

MODE_DEFAUT = "standard"

MODES: dict[str, dict[str, str]] = {
    "standard": {
        "label": "Standard",
        "description": "Réponse directe, appuyée sur les passages trouvés.",
        "consigne": (
            "Réponds de façon directe et naturelle, en t'appuyant sur les passages "
            "pertinents. Trois à six phrases, ou une courte liste si la question s'y prête."
        ),
    },
    "socratique": {
        "label": "Tuteur socratique",
        "description": "Guide par des questions, avec exemples et analogies.",
        "consigne": (
            "Mode tuteur socratique. Tu ne donnes pas la réponse immédiatement : tu guides "
            "l'apprenant jusqu'à ce qu'il la trouve lui-même.\n"
            "- Commence par reconnaître ce qu'il semble déjà savoir, en une phrase.\n"
            "- Pose UNE seule question à la fois, courte et concrète.\n"
            "- Appuie chaque question sur un passage de ses documents et cite-le brièvement.\n"
            "- Quand la notion est abstraite, donne un exemple ou une analogie du quotidien "
            "avant de questionner.\n"
            "- Attends sa réponse avant d'avancer. Corrige avec bienveillance, sans jamais "
            "dire qu'il a tort de façon sèche : reformule ce qui est juste et ce qui manque.\n"
            "- Termine chaque message par une question ou une piste d'action.\n"
            "S'il demande explicitement la réponse finale, donne-la, puis propose-lui de "
            "vérifier sa compréhension par une question."
        ),
    },
    "reflexion": {
        "label": "Réflexion",
        "description": "Décompose un problème complexe, montre le plan.",
        "consigne": (
            "Mode réflexion, pour les tâches complexes. Avant de répondre :\n"
            "1. Reformule la demande en une phrase et repère ce qui manque.\n"
            "2. Découpe le problème en deux à quatre sous-questions.\n"
            "3. Pour chaque sous-question, indique le passage des documents qui la traite, "
            "ou dis clairement qu'il manque.\n"
            "4. Rédige ensuite une réponse structurée qui suit ce plan, en explicitant les "
            "limites de ce que les sources permettent d'affirmer.\n"
            "Reste concis : le plan tient en quelques lignes, pas en dissertation. Ne déroule "
            "pas un raisonnement interne détaillé ; montre le plan et les conclusions."
        ),
    },
    "precis": {
        "label": "Précis",
        "description": "Court, factuel, chiffres et termes exacts du cours.",
        "consigne": (
            "Mode réponse précise. Va droit au but.\n"
            "- Une à trois phrases, ou une liste de points si la question en demande plusieurs.\n"
            "- Reprends les termes exacts, les chiffres, les dates et les définitions des "
            "documents, sans les arrondir ni les reformuler.\n"
            "- Cite le passage utilisé entre guillemets courts quand la formulation compte.\n"
            "- Pas d'introduction, pas de conclusion, pas de reformulation de la question.\n"
            "- Si un élément manque dans les sources, dis-le en une ligne au lieu de compléter."
        ),
    },
}


def consigne(mode: str | None) -> str:
    """Consigne du mode demandé ; retombe sur le mode standard si inconnu."""
    choix = MODES.get(mode or MODE_DEFAUT) or MODES[MODE_DEFAUT]
    return f"\n\nMode de réponse — {choix['label']}.\n{choix['consigne']}"


def catalogue() -> list[dict[str, str]]:
    """Modes exposés à l'interface, sans les prompts."""
    return [
        {"id": identifiant, "label": mode["label"], "description": mode["description"]}
        for identifiant, mode in MODES.items()
    ]
