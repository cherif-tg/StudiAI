# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Étape 1 — interface React
# ---------------------------------------------------------------------------
FROM node:24-alpine AS interface

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Étape 2 — exécution : Python + RAG + interface compilée
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS execution

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/srv/.cache/huggingface \
    # Un seul thread par worker : évite que torch sature le CPU d'un petit VPS.
    OMP_NUM_THREADS=2

WORKDIR /srv/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements-rag.txt ./
RUN pip install -r requirements.txt -r requirements-rag.txt \
    && apt-get purge -y build-essential \
    && apt-get autoremove -y \
    && rm -rf /root/.cache

# Le modèle d'embedding est téléchargé à la construction : le premier démarrage
# en production ne dépend plus du réseau, et le préchauffage est rapide.
ARG PRELOAD_EMBEDDING=true
ENV EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
RUN if [ "$PRELOAD_EMBEDDING" = "true" ]; then \
        python -c "import os; from sentence_transformers import SentenceTransformer; SentenceTransformer(os.environ['EMBEDDING_MODEL'])"; \
    fi

COPY backend/app ./app
COPY --from=interface /app/dist /srv/frontend/dist
COPY Charte_visuel /srv/Charte_visuel

# Utilisateur non privilégié ; /srv/data recevra le volume persistant.
RUN useradd --create-home --uid 10001 nunya \
    && mkdir -p /srv/data \
    && chown -R nunya:nunya /srv

USER nunya

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
