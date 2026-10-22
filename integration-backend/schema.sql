-- Tables à ajouter au journal SQLite de Nunya (idempotent).

-- Jetons de réinitialisation du mot de passe : seule l'empreinte SHA-256 est gardée.
CREATE TABLE IF NOT EXISTS password_resets (
    token_hash  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    expires_at  REAL NOT NULL,
    used_at     REAL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);

-- Historique des conversations (voir historique.py).
CREATE TABLE IF NOT EXISTS conversation_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT    NOT NULL,
    user_id     TEXT    NOT NULL,
    role        TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT    NOT NULL,
    created_at  REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conv_session ON conversation_messages (session_id, id);
CREATE INDEX IF NOT EXISTS idx_conv_user    ON conversation_messages (user_id, created_at);

-- Messages du formulaire de contact (voir contact.py).
CREATE TABLE IF NOT EXISTS contact_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    message     TEXT NOT NULL,
    page        TEXT,
    created_at  REAL NOT NULL
);

-- Avis sur les réponses de l'agent (voir avis.py).
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
CREATE INDEX IF NOT EXISTS idx_feedback_avis ON message_feedback (avis, created_at);
