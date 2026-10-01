FROM python:3.12-slim

WORKDIR /app

# Dépendances système minimales (compilation de certains paquets Python, fonts pour matplotlib)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Dépendances RAG séparées : image plus lourde (sentence-transformers), activable à la demande
ARG INSTALL_RAG=true
COPY requirements-rag.txt .
RUN if [ "$INSTALL_RAG" = "true" ]; then pip install --no-cache-dir -r requirements-rag.txt; fi

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
