# Ce fichier est copié à la racine du Space par scripts/publier-space.ps1.
# Le contexte de construction est la racine du Space : app/ et requirements.txt
# doivent s'y trouver, d'où les chemins relatifs ci-dessous.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/srv/.cache/huggingface \
    OMP_NUM_THREADS=2

WORKDIR /srv/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-rag.txt ./
RUN pip install -r requirements.txt -r requirements-rag.txt \
    && apt-get purge -y build-essential \
    && apt-get autoremove -y \
    && rm -rf /root/.cache

# Le modèle voyage dans l'image : le réveil du Space ne dépend pas du réseau.
ARG PRELOAD_EMBEDDING=true
ENV EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
RUN if [ "$PRELOAD_EMBEDDING" = "true" ]; then \
        python -c "import os; from sentence_transformers import SentenceTransformer; SentenceTransformer(os.environ['EMBEDDING_MODEL'])"; \
    fi

COPY app ./app

RUN mkdir -p /srv/data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=240s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
