#Requires -Version 7
<#
.SYNOPSIS
    Publie l'API Nunya dans un Space Hugging Face (SDK Docker).

.DESCRIPTION
    Clone le dépôt du Space (ou le met à jour), y copie le code du backend et les
    fichiers de déploiement, puis pousse. Le Space reconstruit son image à partir
    de ces fichiers : il n'y a donc qu'une seule source de vérité, le dépôt
    principal.

    Le dossier du Space est un clone git : ne le modifie pas à la main, la
    prochaine synchronisation écraserait tes changements.

.PARAMETER Space
    URL du Space, ex. https://huggingface.co/spaces/cherif-tg/nunya-api

.PARAMETER Dossier
    Où cloner le Space (par défaut dans le dossier temporaire).

.PARAMETER SansPush
    Prépare et commite sans pousser : utile pour inspecter avant d'envoyer.

.EXAMPLE
    .\scripts\publier-space.ps1 -Space https://huggingface.co/spaces/cherif-tg/nunya-api
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Space,
    [string]$Dossier = (Join-Path ([System.IO.Path]::GetTempPath()) "nunya-space"),
    [switch]$SansPush
)

$ErrorActionPreference = "Stop"
$racine = Split-Path -Parent $PSScriptRoot

function Ecrire([string]$message, [string]$couleur = "Gray") {
    Write-Host $message -ForegroundColor $couleur
}

if ($Space -notmatch 'huggingface\.co/spaces/') {
    Ecrire "Attention : cette adresse ne ressemble pas à un Space Hugging Face." "Yellow"
}

# --- 1. Récupérer le dépôt du Space ---------------------------------------
if (-not (Test-Path (Join-Path $Dossier ".git"))) {
    if (Test-Path $Dossier) {
        throw "Le dossier $Dossier existe sans dépôt git. Supprime-le ou choisis un autre -Dossier."
    }
    Ecrire "Clonage du Space…" "Cyan"
    git clone $Space $Dossier
    if ($LASTEXITCODE -ne 0) {
        throw "Clonage impossible. Vérifie l'adresse et tes droits sur le Space."
    }
} else {
    Ecrire "Mise à jour du clone existant…" "Cyan"
    git -C $Dossier pull --ff-only
    if ($LASTEXITCODE -ne 0) {
        throw "Mise à jour impossible : le clone local a peut-être divergé. Regarde $Dossier."
    }
}

# Le dossier temporaire peut arriver en nom court (C:\Users\CEPC~1) : on le
# normalise, sinon les suppressions de fichiers echouent.
$Dossier = (Get-Item -LiteralPath $Dossier).FullName

# --- 2. Copier le code ------------------------------------------------------
Ecrire "Copie du backend…" "Cyan"
$appCible = Join-Path $Dossier "app"
if ([System.IO.Directory]::Exists($appCible)) { [System.IO.Directory]::Delete($appCible, $true) }
Copy-Item (Join-Path $racine "backend\app") $appCible -Recurse
Copy-Item (Join-Path $racine "backend\requirements.txt") $Dossier -Force
Copy-Item (Join-Path $racine "backend\requirements-rag.txt") $Dossier -Force
Copy-Item (Join-Path $racine "deploy\huggingface\Dockerfile") (Join-Path $Dossier "Dockerfile") -Force
Copy-Item (Join-Path $racine "deploy\huggingface\README.md") (Join-Path $Dossier "README.md") -Force

# Les caches Python ne doivent jamais partir dans le Space.
Get-ChildItem $Dossier -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force

# --- 3. Commiter ------------------------------------------------------------
git -C $Dossier add -A
$resume = git -C $Dossier status --porcelain
if (-not $resume) {
    Ecrire "Aucun changement : le Space est déjà à jour." "Green"
    return
}

$commit = git -C $Dossier log -1 --format=%h 2>$null
git -C $Dossier -c user.name="Nunya" -c user.email="nunya@localhost" commit -m "sync: backend depuis le depot principal ($commit)" | Out-Null
Ecrire "Commit créé." "Green"

if ($SansPush) {
    Ecrire "SansPush : rien n'a été envoyé. Pour pousser :" "Yellow"
    Ecrire "  git -C `"$Dossier`" push" "DarkGray"
    return
}

# --- 4. Pousser -------------------------------------------------------------
Ecrire "Envoi vers le Space…" "Cyan"
git -C $Dossier push -u origin HEAD
if ($LASTEXITCODE -ne 0) {
    Ecrire "Échec de l'envoi." "Red"
    Ecrire "Hugging Face demande un jeton d'écriture :" "Yellow"
    Ecrire "  1. https://huggingface.co/settings/tokens (rôle write)" "DarkGray"
    Ecrire "  2. git -C `"$Dossier`" push  → identifiant = ton nom, mot de passe = le jeton" "DarkGray"
    exit 1
}

Ecrire "Publié. Le Space reconstruit son image ; suis l'avancement sur sa page." "Green"
Ecrire "URL publique : onglet « Embed this Space » de la page du Space." "DarkGray"
