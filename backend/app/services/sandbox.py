"""Exécution encadrée de scripts matplotlib générés par l'agent.

Protections v0 : liste blanche d'imports, mots interdits (AST), sous-processus isolé
(`-I`), dossier temporaire, environnement minimal, limites CPU/mémoire (POSIX) et timeout.
Ce n'est PAS une isolation forte : en production, exécuter dans un conteneur dédié
sans réseau (`docker run --network none ...`) — voir README.
"""
import ast
import asyncio
import os
import sys
import tempfile
from pathlib import Path

ALLOWED_IMPORTS = {
    "matplotlib", "numpy", "pandas", "math", "statistics", "random",
    "itertools", "collections", "datetime", "json", "textwrap",
}
FORBIDDEN_NAMES = {"open", "exec", "eval", "compile", "__import__", "input", "globals", "locals", "getattr", "setattr", "delattr", "vars"}
OUTPUT_NAME = "chart.png"
PREAMBLE = "import matplotlib\nmatplotlib.use('Agg')\n"


class SandboxError(RuntimeError):
    pass


def validate(code: str) -> None:
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        raise SandboxError(f"Code invalide : {e}") from e
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            mods = [a.name.split(".")[0] for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            mods = [(node.module or "").split(".")[0]]
        else:
            mods = []
        for m in mods:
            if m not in ALLOWED_IMPORTS:
                raise SandboxError(f"Import interdit : {m}")
        if isinstance(node, ast.Name) and node.id in FORBIDDEN_NAMES:
            raise SandboxError(f"Nom interdit : {node.id}")
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise SandboxError("Accès aux attributs spéciaux interdit")


def _limits():
    import resource

    resource.setrlimit(resource.RLIMIT_CPU, (20, 20))
    resource.setrlimit(resource.RLIMIT_AS, (2 * 1024**3, 2 * 1024**3))
    resource.setrlimit(resource.RLIMIT_FSIZE, (20 * 1024**2, 20 * 1024**2))


async def run_chart_code(code: str, timeout: float = 30.0) -> bytes:
    validate(code)
    with tempfile.TemporaryDirectory() as tmp:
        script = Path(tmp) / "script.py"
        script.write_text(PREAMBLE + code, encoding="utf-8")
        env = {"PATH": os.environ.get("PATH", ""), "MPLBACKEND": "Agg", "MPLCONFIGDIR": tmp, "HOME": tmp}
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-I", str(script),
            cwd=tmp, env=env,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            preexec_fn=_limits if os.name == "posix" else None,
        )
        try:
            _, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            raise SandboxError("Délai d'exécution dépassé")
        if proc.returncode != 0:
            raise SandboxError(err.decode(errors="ignore")[-800:] or "Erreur d'exécution")
        out = Path(tmp) / OUTPUT_NAME
        if not out.exists():
            raise SandboxError(f"Le script doit enregistrer la figure sous '{OUTPUT_NAME}'")
        return out.read_bytes()
