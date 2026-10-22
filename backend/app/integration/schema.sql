-- Tables utilisées par les routes d'intégration.
--
-- Elles sont créées automatiquement au démarrage :
--   password_resets      -> backend/app/services/journal.py (schéma principal)
--   contact_messages     -> backend/app/integration/contact.py
--   message_feedback     -> backend/app/integration/avis.py
--
-- Ce fichier sert de référence ; il n'est pas exécuté au démarrage.
-- L'historique des conversations n'est pas stocké côté serveur : l'interface le
-- garde dans le navigateur (frontend/src/lib/conversations.ts).

CREATE TABLE IF NOT EXISTS password_resets (
    token_hash  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    expires_at  REAL NOT NULL,
    used_at     REAL
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    message     TEXT NOT NULL,
    page        TEXT,
    created_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS message_feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    message_id  TEXT NOT NULL,
    avis        TEXT NOT NULL CHECK (avis IN ('utile', 'inutile')),
    motif       TEXT,
    question    TEXT,
    reponse     TEXT,
    created_at  REAL NOT NULL,
    UNIQUE (user_id, message_id)
);
