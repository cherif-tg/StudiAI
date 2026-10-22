#Requires -Version 7
<#
.SYNOPSIS
    Démarre le serveur Nunya en local.

.DESCRIPTION
    Lance uvicorn avec le venv du projet, attend que /health réponde, puis
    affiche l'adresse. Le moteur de recherche continue de se charger en arrière-
    plan : le badge de l'interface passe de « Moteur en préparation » à « Prêt ».

.PARAMETER Port
    Port d'écoute (8000 par défaut).

.PARAMETER Public
    Ouvre aussi un tunnel Cloudflare, dans une nouvelle fenêtre.

.EXAMPLE
    .\scripts\demarrer.ps1

.EXAMPLE
    .\scripts\demarrer.ps1 -Public
#>
[CmdletBinding()]
param(
    [int]$Port = 8000,
    [switch]$Public
)

$ErrorActionPreference = "Stop"
$racine = Split-Path -Parent $PSScriptRoot
$python = Join-Path $racine ".venv\Scripts\python.exe"

function Ecrire([string]$message, [string]$couleur = "Gray") {
    Write-Host $message -ForegroundColor $couleur
}

function ServeurRepond {
    param([int]$port)
    try {
        $reponse = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -TimeoutSec 3
        return $null -ne $reponse.status
    } catch {
        return $false
    }
}

if (-not (Test-Path $python)) {
    throw "Environnement Python introuvable : $python. Recrée-le avec « uv venv .venv »."
}

if (ServeurRepond -port $Port) {
    Ecrire "Nunya tourne déjà sur le port $Port : http://127.0.0.1:$Port/" "Green"
} else {
    Ecrire "Démarrage du serveur sur le port $Port…" "Cyan"
    Start-Process -FilePath $python `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$Port" `
        -WorkingDirectory (Join-Path $racine "backend") `
        -WindowStyle Hidden | Out-Null

    $limite = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $limite -and -not (ServeurRepond -port $Port)) {
        Start-Sleep -Milliseconds 800
    }

    if (ServeurRepond -port $Port) {
        Ecrire "Serveur prêt." "Green"
    } else {
        throw "Le serveur n'a pas répondu dans les 60 secondes. Vérifie qu'aucun autre programme n'occupe le port $Port."
    }
}

Write-Host ""
Ecrire "  Application   http://127.0.0.1:$Port/" "White"
Ecrire "  Documentation http://127.0.0.1:$Port/documentation" "White"
Ecrire "  Santé         http://127.0.0.1:$Port/health" "White"
Write-Host ""
Ecrire "  Pour fermer : .\scripts\arreter.ps1" "DarkGray"

if ($Public) {
    Write-Host ""
    Ecrire "Ouverture du tunnel dans une nouvelle fenêtre…" "Cyan"
    Start-Process pwsh -ArgumentList "-NoExit", "-NoProfile", "-File", (Join-Path $PSScriptRoot "tunnel.ps1")
}
