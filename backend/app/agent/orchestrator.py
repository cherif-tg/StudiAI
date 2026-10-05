"""Boucle d'orchestration de l'agent .

Squelette prévu (ReAct / function calling) :

    1. Construire les messages (historique de session + message utilisateur).
    2. Appeler services.llm.achat(messages, tools=registry.schemas(services)).
    3. Tant que la réponse contient des tool_calls (limite : settings.max_agent_steps) :
       a. Pour chaque appel, résoudre l'outil via registry.get(name).
       b. L'exécuter : tool.run(ToolContext(services, session_id, source_ids), **arguments).
       c. Journaliser l'appel (services.journal.log_event) pour la traçabilité
          affichée au Carnet / à l'utilisateur.
       d. Ajouter le résultat à l'historique (role="tool") et relancer l'appel LLM.
    4. Retourner la réponse finale + la liste des ToolStep + les artefacts produits.

Point d'attention : la traduction (langue locale) est un outil comme un autre
(app/tools/translate.py) — c'est l'agent qui décide de l'appeler, pas un post-traitement
systématique, pour rester cohérent avec le reste de l'architecture.
"""
