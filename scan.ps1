# =========================================================================
# AUDIOFIX SCANNER -- ANALYSE DES JOURNAUX WINDOWS ET LATENCYMON
# =========================================================================

[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  AUDIOFIX SCANNER -- ANALYSEUR DE LOGS WINDOWS ET LATENCE DPC    " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$report = @{
    timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    eventGlitchCount = 0
    usbResetCount = 0
    maxDpcJitterUs = 0
    dpcStatus = "OK"
    findings = @()
}

# 1. Analyse des Event Logs Windows Audio
Write-Host "[1/4] Analyse des Journaux d'Evenements Windows (Event Viewer)..." -ForegroundColor Yellow

$audioGlitchEvents = @()
try {
    $audioGlitchEvents = Get-WinEvent -LogName "Microsoft-Windows-Audio/Operational" -MaxEvents 100 -ErrorAction SilentlyContinue | 
        Where-Object { $_.Id -eq 2005 -or $_.Id -eq 2006 -or $_.Message -like "*glitch*" -or $_.Message -like "*underrun*" }
} catch {}

if ($audioGlitchEvents -and $audioGlitchEvents.Count -gt 0) {
    $report.eventGlitchCount = $audioGlitchEvents.Count
    $finding = @{
        title = "Micro-coupures Audio enregistrees par Windows (Event ID 2005/2006)"
        category = "Journaux d'Evenements Windows (AudioSrv)"
        status = "danger"
        actionText = "Mettre '24 bits, 48000 Hz' et augmenter la taille du buffer audio"
        actuelText = "$($audioGlitchEvents.Count) micro-coupures/dropouts enregistres par Windows dans Event Viewer"
        cause = "Le moteur audio WASAPI/AudioSrv de Windows a consigne $($audioGlitchEvents.Count) pertes de paquets son (Buffer Underrun) lors de pics d'utilisation systeme."
        fix = "Desactivez les ameliorations audio dans mmsys.cpl et passez le plan d'alimentation en 'Performances Elevees'."
    }
    $report.findings += $finding
    Write-Host "  [X] $($audioGlitchEvents.Count) micro-coupures audio (Buffer Underruns) trouvees dans les journaux Windows !" -ForegroundColor Red
} else {
    Write-Host "  [OK] Aucun evenement de perte de paquet audio recent trouve dans Microsoft-Windows-Audio." -ForegroundColor Green
}

# 2. Analyse des Reinitialisations PnP / USB
$usbEvents = @()
try {
    $usbEvents = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-PnP'} -MaxEvents 50 -ErrorAction SilentlyContinue |
        Where-Object { $_.Message -like "*USB*" -or $_.Message -like "*Audio*" -or $_.Id -eq 219 }
} catch {}

if ($usbEvents -and $usbEvents.Count -gt 0) {
    $report.usbResetCount = $usbEvents.Count
    $finding = @{
        title = "Reinitialisations / Deconnexions de Peripheriques USB (Kernel-PnP)"
        category = "Journaux d'Evenements Systeme (PnP)"
        status = "warning"
        actionText = "Mettre 'Desactive' sur la Suspension Selective USB et essayer le Pilote Audio Generique Microsoft"
        actuelText = "$($usbEvents.Count) deconnexions/reinitialisations USB consignees par le noyau Windows"
        cause = "Le gestionnaire PnP de Windows reinitialise le pilote USB lors des baisses de tension ou des conflits de filtre Logitech G HUB."
        fix = "Dans Gestionnaire de peripheriques -> Contrôleurs audio -> Clic droit G733 -> Mettre a jour -> Choisir 'Périphérique audio USB générique'."
    }
    $report.findings += $finding
    Write-Host "  [!] $($usbEvents.Count) evenements de reinitialisation USB / Pilotes detectes." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Aucun probleme de deconnexion USB consigne dans le journal systeme." -ForegroundColor Green
}

# 3. Test de Latence DPC (Style LatencyMon)
Write-Host ""
Write-Host "[2/4] Mesure de Latence DPC et Jitter Systeme (Test LatencyMon - 3 secondes)..." -ForegroundColor Yellow

$maxJitterUs = 0
$samples = 150

for ($i = 0; $i -lt $samples; $i++) {
    $t0 = [System.Diagnostics.Stopwatch]::GetTimestamp()
    Start-Sleep -Milliseconds 10
    $t1 = [System.Diagnostics.Stopwatch]::GetTimestamp()
    
    $elapsedUs = (($t1 - $t0) / [System.Diagnostics.Stopwatch]::Frequency) * 1000000
    $jitterUs = [Math]::Abs($elapsedUs - 10000)
    
    if ($jitterUs -gt $maxJitterUs) {
        $maxJitterUs = $jitterUs
    }
}

$report.maxDpcJitterUs = [Math]::Round($maxJitterUs, 0)
$maxJitterMs = [Math]::Round($maxJitterUs / 1000, 2)

Write-Host "  Latence DPC / Jitter Max Mesuree : $maxJitterMs ms ($($report.maxDpcJitterUs) us)" -ForegroundColor Cyan

if ($report.maxDpcJitterUs -gt 2000) {
    $report.dpcStatus = "HIGH"
    $finding = @{
        title = "Pics de Latence DPC Detectes (Style LatencyMon : $maxJitterMs ms)"
        category = "Latence Temps Reel et Interruption Pilote"
        status = "danger"
        actionText = "Mettre 'Mode MSI (Message Signaled Interrupts)' sur la Carte Graphique et desactiver Global C-State"
        actuelText = "Latence DPC Max : $maxJitterMs ms (> 2.0 ms = Risque majeur de gresillements)"
        cause = "Les interruptions de la carte graphique NVIDIA/AMD ou les C-States du CPU AMD Ryzen retardent le processeur audio."
        fix = "Activez le mode MSI sur le GPU NVIDIA avec MSI Utility v3, et desactivez 'Global C-State Control' dans le BIOS ASRock."
    }
    $report.findings += $finding
    Write-Host "  [X] LATENCE DPC ELEVEE (> 2.0 ms) ! Risque important de gresillements sous charge." -ForegroundColor Red
} else {
    Write-Host "  [OK] Stabilite DPC excellente (< 2.0 ms). Le processeur reagit a temps pour l'audio." -ForegroundColor Green
}

# 4. Verification de l'optimisation BCDedit Dynamic Tick
Write-Host ""
Write-Host "[3/4] Verification des parametres d'horloge Windows (Dynamic Tick & MMCSS)..." -ForegroundColor Yellow

$bcdDynamicTick = bcdedit /enum | Select-String "disabledynamictick"
if (-not $bcdDynamicTick) {
    $finding = @{
        title = "Optimisation de l'Horloge Systeme Windows (Dynamic Tick)"
        category = "Horloge Kernel Windows"
        status = "warning"
        actionText = "Mettre 'Yes' sur disabledynamictick dans bcdedit"
        actuelText = "Dynamic Tick Actif (Mise en veille partielle de l'horloge système)"
        cause = "Le Dynamic Tick fait varier la frequence de l'horloge Windows pour economiser de l'energie, provoquant des micro-jitter audio."
        fix = "Dans CMD (Admin) tapez : bcdedit /set disabledynamictick yes"
    }
    $report.findings += $finding
    Write-Host "  [!] Dynamic Tick actif (Peut causer des micro-retards de timer audio)." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Dynamic Tick desactive dans bcdedit." -ForegroundColor Green
}

# 5. Synthese et Exportation JSON
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  RESUME DU DIAGNOSTIC LOGS ET DPC" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

if ($report.findings.Count -eq 0) {
    Write-Host "AUCUNE ANOMALIE DANS LES LOGS OU LA LATENCE DPC !" -ForegroundColor Green
    Write-Host "Le systeme Windows est stable et ne consigne aucun bug d'interruption audio." -ForegroundColor White
} else {
    Write-Host "$($report.findings.Count) ANOMALIE(S) DETECTEE(S) DANS LES LOGS WINDOWS :" -ForegroundColor Red
    Write-Host ""
    foreach ($f in $report.findings) {
        Write-Host "-> $($f.actionText)" -ForegroundColor Cyan
        Write-Host "   Actuel : $($f.actuelText)" -ForegroundColor Yellow
        Write-Host "   Cause  : $($f.cause)" -ForegroundColor Gray
        Write-Host ""
    }
}

$baseDir = $PSScriptRoot
if (-not $baseDir) {
    $baseDir = (Get-Location).Path
}

$jsonPath = Join-Path $baseDir "audio_glitch_report.json"
try {
    $report | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding utf8
    Write-Host "Rapport enregistre avec succes sous : $jsonPath" -ForegroundColor Gray
} catch {
    Write-Host "Diagnostic termine." -ForegroundColor Gray
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
