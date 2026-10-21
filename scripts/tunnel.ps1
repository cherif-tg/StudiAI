#Requires -Version 7
<#
.SYNOPSIS
    Publie Nunya sur Internet avec un tunnel Cloudflare éphémère.

.DESCRIPTION
    Démarre le serveur local s'il ne répond pas, ouvre un tunnel `trycloudflare.com`
    vers lui, puis affiche l'adresse publique.

    L'adresse change à chaque lancement. Toute personne qui la possède peut
    déposer des fichiers et poser des questions : les garde-fous de taille, de
    stockage et de débit sont actifs, mais il n'y a pas d'authentification.

.PARAMETER Port
    Port local du serveur (8000 par défaut).

.PARAMETER SansServeur
    Ne démarre pas le serveur : le tunnel se contente de relier un serveur déjà
    lancé.

.EXAMPLE
    .\scripts\tunnel.ps1
#>
[CmdletBinding()]
param(
    [int]$Port = 8000,
    [switch]$SansServeur
)

$ErrorActionPreference = "Stop"
$racine = Split-Path -Parent $PSScriptRoot
$cloudflared = Join-Path $racine "tools\cloudflared.exe"
$journal = Join-Path $racine ".zwork\tunnel.log"
$erreurs = Join-Path $racine ".zwork\tunnel.err.log"

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

if (-not (Test-Path $cloudflared)) {
    throw "cloudflared introuvable : $cloudflared. Télécharge-le depuis https://github.com/cloudflare/cloudflared/releases"
}

New-Item -ItemType Directory -Force -Path (Split-Path $journal) | Out-Null
Remove-Item $journal, $erreurs -ErrorAction SilentlyContinue

$serveurDemarre = $null
if (-not (ServeurRepond -port $Port)) {
    if ($SansServeur) {
        throw "Aucun serveur ne répond sur le port $Port et -SansServeur est demandé."
    }

    $python = Join-Path $racine ".venv\Scripts\python.exe"
    if (-not (Test-Path $python)) {
        throw "Environnement Python introuvable : $python"
    }

    Ecrire "Démarrage du serveur sur le port $Port…" "Cyan"
    $serveurDemarre = Start-Process -FilePath $python `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$Port" `
        -WorkingDirectory (Join-Path $racine "backend") `
        -PassThru -WindowStyle Hidden

    $limite = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $limite -and -not (ServeurRepond -port $Port)) {
        Start-Sleep -Milliseconds 700
    }
    if (-not (ServeurRepond -port $Port)) {
        throw "Le serveur n'a pas répondu dans les 45 secondes. Regarde backend/ et relance."
    }
    Ecrire "Serveur prêt." "Green"
} else {
    Ecrire "Un serveur répond déjà sur le port $Port." "Green"
}

Ecrire "Ouverture du tunnel…" "Cyan"
$tunnel = Start-Process -FilePath $cloudflared `
    -ArgumentList "tunnel", "--url", "http://127.0.0.1:$Port", "--no-autoupdate" `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $journal -RedirectStandardError $erreurs

try {
    $adresse = $null
    $limite = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $limite -and -not $adresse) {
        Start-Sleep -Milliseconds 800
        foreach ($fichier in @($journal, $erreurs)) {
            if (-not (Test-Path $fichier)) { continue }
            $trouve = Select-String -Path $fichier -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches -ErrorAction SilentlyContinue |
                ForEach-Object { $_.Matches.Value } | Select-Object -First 1
            if ($trouve) { $adresse = $trouve; break }
        }
    }

    if (-not $adresse) {
        throw "Adresse publique introuvable. Détail dans $erreurs"
    }

    Write-Host ""
    Ecrire "  Nunya est en ligne" "Green"
    Write-Host ""
    Ecrire "  Application   $adresse" "White"
    Ecrire "  Documentation $adresse/documentation" "White"
    Ecrire "  Santé         $adresse/health" "White"
    Write-Host ""
    Ecrire "  Cette adresse est éphémère : elle change à chaque lancement." "Yellow"
    Ecrire "  Toute personne qui la possède peut déposer des documents." "Yellow"
    Ecrire "  Garde cette fenêtre ouverte. Ctrl+C pour arrêter." "DarkGray"
    Write-Host ""

    while (-not $tunnel.HasExited) {
        Start-Sleep -Seconds 2
    }
} finally {
    if ($tunnel -and -not $tunnel.HasExited) {
        Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
    }
    if ($serveurDemarre -and -not $serveurDemarre.HasExited) {
        Ecrire "Arrêt du serveur local…" "DarkGray"
        Stop-Process -Id $serveurDemarre.Id -Force -ErrorAction SilentlyContinue
    }
}
