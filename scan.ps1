# Script de Diagnostic Automatique AudioFix pour Windows (G733 + ASRock A520M)
# Exécution sans installation pour détecter les pilotes, BIOS et réglages USB

[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  AUDIOFIX SCANNER — DIAGNOSTIC AUTOMATIQUE WINDOWS / AMD / G733  " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$actionsCount = 0

# 1. Détection du BIOS & Carte Mère
$board = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue
$bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue

Write-Host "🖥️ Carte mère détectée : $($board.Manufacturer) $($board.Product)" -ForegroundColor Gray
Write-Host "💾 Version du BIOS actuel : $($bios.SMBIOSBIOSVersion) ($($bios.ReleaseDate.ToString('dd/MM/yyyy')))" -ForegroundColor Gray

if ($board.Product -like "*A520*" -or $board.Product -like "*B550*" -or $board.Product -like "*X570*") {
    # Check BIOS version for AMD USB bug patch (AGESA 1.2.0.7 / P2.10+)
    $verNum = [regex]::Match($bios.SMBIOSBIOSVersion, '\d+\.\d+').Value
    if ($verNum -and [float]$verNum -lt 2.10) {
        $actionsCount++
        Write-Host ""
        Write-Host "❌ [ACTION REQUISE] Mettre à jour le BIOS vers P2.10+ (Patch USB AMD AGESA 1.2.0.7)" -ForegroundColor Red
        Write-Host "   Actuel : $($bios.SMBIOSBIOSVersion) (Ancien BIOS sujet aux déconnexions/grésillements USB AMD)" -ForegroundColor Yellow
        Write-Host "   Lien   : https://www.asrock.com/support/index.asp" -ForegroundColor Gray
    } else {
        Write-Host "✓ BIOS à jour avec le correctif USB AMD AGESA." -ForegroundColor Green
    }
}

# 2. Détection du Mode d'Alimentation Windows
$activePlan = Get-CimInstance -Namespace root\cimv2\power -ClassName Win32_PowerPlan -Filter "IsActive=True" -ErrorAction SilentlyContinue
if ($activePlan) {
    if ($activePlan.ElementName -notlike "*Performances*" -and $activePlan.ElementName -notlike "*High*") {
        $actionsCount++
        Write-Host ""
        Write-Host "⚠️ [ACTION REQUISE] Mettre 'Performances Élevées' sur le Mode d'Alimentation Windows" -ForegroundColor Yellow
        Write-Host "   Actuel : $($activePlan.ElementName) (Risque de pic de latence DPC lors des micro-silences)" -ForegroundColor Yellow
        Write-Host "   Fix    : Appuyez sur Win + R -> powercfg.cpl -> Performances Élevées." -ForegroundColor Gray
    } else {
        Write-Host "✓ Mode d'alimentation Performances Élevées actif." -ForegroundColor Green
    }
}

# 3. Détection du Casque Logitech G733
$g733 = Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -like "*G733*" -or $_.Name -like "*Logitech Wireless*" } -ErrorAction SilentlyContinue
if ($g733) {
    Write-Host ""
    Write-Host "🎧 Périphérique Logitech détecté : $($g733[0].Name)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "🎧 Recherche du récepteur USB Logitech G733..." -ForegroundColor Gray
}

# 4. Suspension Sélective USB
$usbScheme = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\USB" -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
if ($actionsCount -eq 0) {
    Write-Host "🎉 AUCUN PROBLÈME MATÉRIEL OU BIOS DÉTECTÉ !" -ForegroundColor Green
    Write-Host "   Si le son grésille encore, vérifiez les réglages dans le navigateur (https://ikxa.github.io/micro/)." -ForegroundColor White
} else {
    Write-Host "⚠️ $actionsCount ACTION(S) NÉCESSAIRE(S) TROUVÉE(S) CI-DESSUS." -ForegroundColor Red
}
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
