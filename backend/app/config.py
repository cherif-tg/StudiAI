from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_name: str = "edu-agent"
    api_keys: str = "dev-key"
    cors_origins: str = "http://localhost:5173"
    data_dir: Path = Path("../data")

    # LLM principal de l'agent (function calling) : Groq par défaut, voir README
    # pour pourquoi Ollama n'est pas recommandé pour cette boucle précise.
    llm_provider: str = "groq"
    groq_api_key: str = ""
    llm_model: str = "llama-3.3-70b-versatile"
    max_agent_steps: int = 5

    # LLM local (Ollama) : usage ponctuel / expérimentations hors-ligne, voir README.
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    tavily_api_key: str = ""
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    translation_mode: str = "disabled"  # disabled | local | remote
    translation_base_model: str = "facebook/nllb-200-distilled-600M"
    translation_adapter_path: str = ""
    translation_remote_url: str = ""

    @property
    def api_key_list(self) -> list[str]:
        return [k.strip() for k in self.api_keys.split(",") if k.strip()]

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def artifacts_dir(self) -> Path:
        return self.data_dir / "artifacts"

    @property
    def chroma_dir(self) -> Path:
        return self.data_dir / "chroma"

    @property
    def db_path(self) -> Path:
        return self.data_dir / "journal.db"

    def ensure_dirs(self) -> None:
        for d in (self.uploads_dir, self.artifacts_dir, self.chroma_dir):
            d.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
