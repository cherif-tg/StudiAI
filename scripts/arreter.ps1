#Requires -Version 7
<#
.SYNOPSIS
    Arrête Nunya : serveur local et tunnel public.

.DESCRIPTION
    Arrête le processus qui écoute sur le port demandé et les tunnels cloudflared
    lancés depuis ce projet. Les autres programmes ne sont pas touchés : si le
    port est occupé par autre chose que Python, le script s'arrête.

.PARAMETER Port
    Port du serveur à arrêter (8000 par défaut).

.EXAMPLE
    .\scripts\arreter.ps1

.EXAMPLE
    .\scripts\arreter.ps1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

function Ecrire([string]$message, [string]$couleur = "Gray") {
    Write-Host $message -ForegroundColor $couleur
}

$arretes = 0
$cibles = 0

# --- Serveur local ---------------------------------------------------------
$connexions = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($connexions) {
    foreach ($connexion in $connexions) {
        $processus = Get-Process -Id $connexion.OwningProcess -ErrorAction SilentlyContinue
        if (-not $processus) { continue }

        if ($processus.ProcessName -notin @("python", "pythonw")) {
            Ecrire "Le port $Port est occupé par « $($processus.ProcessName) » (PID $($processus.Id)) : je ne le touche pas." "Yellow"
            continue
        }

        if ($PSCmdlet.ShouldProcess("PID $($processus.Id) ($($processus.ProcessName))", "Arrêter le serveur")) {
            $cibles++
            Stop-Process -Id $processus.Id -Force -ErrorAction SilentlyContinue
            Ecrire "Serveur arrêté (PID $($processus.Id))." "Green"
            $arretes++
        }
    }
} else {
    Ecrire "Aucun serveur n'écoute sur le port $Port." "DarkGray"
}

# --- Tunnel ----------------------------------------------------------------
$tunnels = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($tunnels) {
    if ($PSCmdlet.ShouldProcess("$($tunnels.Count) processus cloudflared", "Arrêter le tunnel")) {
        $cibles++
        $tunnels | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
        Ecrire "Tunnel fermé : l'adresse publique ne répond plus." "Green"
        $arretes++
    }
} else {
    Ecrire "Aucun tunnel ouvert." "DarkGray"
}

Write-Host ""
if ($WhatIfPreference) {
    Ecrire "Simulation : $cibles arrêt(s) prévu(s), rien n'a été modifié." "DarkGray"
} elseif ($arretes -eq 0) {
    Ecrire "Rien à arrêter." "DarkGray"
} else {
    Ecrire "Nunya est fermé. Pour le rouvrir : .\scripts\demarrer.ps1" "Cyan"
}
