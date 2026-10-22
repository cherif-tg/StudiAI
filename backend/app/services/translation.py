"""Traduction vers les langues locales (Éwé, Kabiyè).

Deux modes (TRANSLATION_MODE) :
- local  : NLLB-200 + adaptateur LoRA chargés dans ce processus (GPU conseillé) ;
- remote : appel HTTP vers un service séparé (ex. ton HF Space) — recommandé pour
           garder l'API légère. Contrat attendu : POST {"text","target"} -> {"translation"}.

À aligner avec tg_nlp_toolkit : `LANG_CODES` et `_translate_local_sync` sont les deux
seuls endroits à adapter.
"""
import asyncio
import re

import httpx

from app.config import Settings

LANG_CODES = {
    "fr": "fra_Latn",
    "ee": "ewe_Latn",
}


class TranslationUnavailable(RuntimeError):
    pass


class TranslationService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._model = None
        self._tokenizer = None

    @property
    def enabled(self) -> bool:
        return self.settings.translation_mode in {"local", "remote"}

    async def translate(self, text: str, target: str, source: str = "fr") -> str:
        mode = self.settings.translation_mode
        if mode == "remote":
            return await self._translate_remote(text, target)
        if mode == "local":
            return await asyncio.to_thread(self._translate_local_sync, text, target, source)
        raise TranslationUnavailable("Traduction désactivée (TRANSLATION_MODE=disabled)")

    async def _translate_remote(self, text: str, target: str) -> str:
        if not self.settings.translation_remote_url:
            raise TranslationUnavailable("TRANSLATION_REMOTE_URL manquant")
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(self.settings.translation_remote_url, json={"text": text, "target": target})
            r.raise_for_status()
            return r.json()["translation"]

    def _load_local(self):
        if self._model is not None:
            return
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        except ImportError as e:
            raise TranslationUnavailable("Installe requirements-translation.txt") from e
        s = self.settings
        self._tokenizer = AutoTokenizer.from_pretrained(s.translation_base_model)
        model = AutoModelForSeq2SeqLM.from_pretrained(s.translation_base_model)
        if s.translation_adapter_path:
            from peft import PeftModel

            model = PeftModel.from_pretrained(model, s.translation_adapter_path)
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._model = model.to(self._device).eval()

    def _translate_local_sync(self, text: str, target: str, source: str) -> str:
        import torch

        self._load_local()
        tok = self._tokenizer
        tok.src_lang = LANG_CODES[source]
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text) if s.strip()]
        out = []
        for i in range(0, len(sentences), 8):
            batch = tok(sentences[i:i + 8], return_tensors="pt", padding=True, truncation=True, max_length=256)
            batch = {k: v.to(self._device) for k, v in batch.items()}
            with torch.no_grad():
                gen = self._model.generate(
                    **batch,
                    forced_bos_token_id=tok.convert_tokens_to_ids(LANG_CODES[target]),
                    max_new_tokens=256,
                    num_beams=4,
                )
            out.extend(tok.batch_decode(gen, skip_special_tokens=True))
        return " ".join(out)
