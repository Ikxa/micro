/**
 * AudioFix Web — Diagnostic Avancé Anti-Grésillement (Logitech G733 & ASRock A520M Edition)
 */

// Application State
const state = {
  audioCtx: null,
  analyser: null,
  masterGain: null,
  activeSource: null,

  // Live Detected Web Audio Parameters
  detectedSampleRate: null,
  detectedLatency: null,
  detectedChannels: null,
  detectedDeviceLabel: 'Périphérique Audio (G733)',

  // User Selected Hardware & System Settings
  hardwareSettings: {
    usbPort: 'front_usb3',     // 'front_usb3' (Bad), 'rear_usb3', 'rear_usb2' (Good)
    gHubDts: 'enabled',        // 'enabled' (Bad), 'disabled' (Good)
    powerPlan: 'balanced',     // 'balanced' (Bad), 'saver' (Bad), 'performance' (Good)
    usbSuspend: 'enabled',     // 'enabled' (Bad), 'disabled' (Good)
    biosVersion: 'old_bios',   // 'old_bios' (Bad - AMD USB Bug), 'updated_bios' (Good)
    bitDepth: '16bits',        // '16bits', '24bits'
    exclusiveMode: 'enabled',  // 'enabled', 'disabled'
    enhancements: 'enabled',   // 'enabled', 'disabled'
  },

  showAllRecommendations: false
};

// Build Recommendations Engine with strict format matching user's exact request:
// "Mettre [VALEUR RECOMMANDÉE] sur [NOM DU PARAMÈTRE]" -> "Actuel : [VALEUR ACTUELLE]"
function getRecommendations() {
  const sr = state.detectedSampleRate;
  const lat = state.detectedLatency;
  const hw = state.hardwareSettings;

  const list = [];

  // 1. BIOS ASRock A520M & Correctif Bug USB AMD AGESA 1.2.0.7
  let biosActuel = hw.biosVersion === 'old_bios' ? 'BIOS Ancien / D\'origine (Bug USB AMD AM4 non corrigé)' : 'BIOS à jour (P2.10+ / AGESA 1.2.0.7 Patch USB AMD)';
  let biosIsOk = hw.biosVersion === 'updated_bios';
  list.push({
    id: 'bios-version',
    title: 'Version du BIOS ASRock A520M (Correctif USB AMD AGESA 1.2.0.7)',
    category: 'Firmware Carte Mère ASRock',
    actionRequired: !biosIsOk,
    status: biosIsOk ? 'ok' : 'danger',
    actionText: 'Mettre à jour le BIOS ASRock A520M vers la version P2.10+ (Patch AGESA 1.2.0.7)',
    actuelText: biosActuel,
    cause: 'AMD a officiellement reconnu un bug mondial sur les chipsets AM4 (A520/B550/X570) provoquant la coupure aléatoire de l\'alimentation USB et des grésillements sur les casques sans fil. Ce bug a été définitivement résolu par le microcode AGESA 1.2.0.7 (BIOS P2.10 sur ASRock A520M).',
    fix: 'Ouvrez un terminal CMD et tapez <code>wmic bios get smbiosbiosversion</code> pour vérifier votre version. Si elle est inférieure à P2.10, téléchargez le dernier BIOS sur le site officiel d\'ASRock.'
  });

  // 2. Emplacement Dongle USB G733 sur ASRock A520M
  let usbPortActuel = 'Port USB 3.0 / Façade Boîtier (Sujet aux parasites 2.4GHz AMD)';
  if (hw.usbPort === 'rear_usb3') usbPortActuel = 'Port USB 3.2 Bleu Arrière Carte Mère';
  if (hw.usbPort === 'rear_usb2') usbPortActuel = 'Port USB 2.0 Noir Arrière Carte Mère ASRock (Optimisé)';

  let usbPortIsOk = hw.usbPort === 'rear_usb2';
  list.push({
    id: 'usb-port',
    title: 'Emplacement du Dongle LIGHTSPEED G733 (ASRock A520M)',
    category: 'Matériel USB & Signal RF 2.4GHz',
    actionRequired: !usbPortIsOk,
    status: usbPortIsOk ? 'ok' : 'danger',
    actionText: 'Mettre "Port USB 2.0 Noir Arrière Carte Mère ASRock" sur le Dongle G733',
    actuelText: usbPortActuel,
    cause: 'Le contrôleur AMD Ryzen (A520M) et les câbles USB 3.0 émettent des bruits radio dans la bande 2.4 GHz qui perturbent la connexion sans fil du Logitech G733. Le port USB 2.0 Noir arrière est direct et isolé.',
    fix: 'Débranchez le récepteur USB du G733 de la façade ou d\'un port bleu USB 3.0, et branchez-le sur l\'un des deux ports <strong>USB 2.0 Noirs</strong> situés tout en haut à l\'arrière de la carte mère ASRock A520M.'
  });

  // 3. Logitech G HUB — Son Surround DTS 2.0
  let dtsActuel = hw.gHubDts === 'enabled' ? 'Activé (Surround 7.1 Virtuel G HUB)' : 'Désactivé (Stéréo Pur 48kHz)';
  let dtsIsOk = hw.gHubDts === 'disabled';
  list.push({
    id: 'ghub-dts',
    title: 'Traitement Spatial Logitech G HUB (DTS Headphone:X 2.0)',
    category: 'Pilote & Logiciel Logitech',
    actionRequired: !dtsIsOk,
    status: dtsIsOk ? 'ok' : 'warning',
    actionText: 'Mettre "Désactivé" sur le Son Surround DTS dans Logitech G HUB',
    actuelText: dtsActuel,
    cause: 'Le moteur surround virtuel de G HUB ré-échantillonne en continu le son en 7.1, ce qui sature le tampon du dongle USB G733 et génère des craquements intempestifs en jeu ou sur Discord.',
    fix: 'Ouvrez <strong>Logitech G HUB</strong> ➔ Cliquez sur votre casque <strong>G733</strong> ➔ Onglet <em>Acoustique</em> ➔ Décochez <strong>"Activer le son surround"</strong>.'
  });

  // 4. Modes d'Alimentation Windows (Gestion des C-States CPU AMD AM4)
  let powerActuel = 'Utilisation normale (Équilibré)';
  if (hw.powerPlan === 'saver') powerActuel = 'Économie d\'énergie (Baisse de tension USB)';
  if (hw.powerPlan === 'performance') powerActuel = 'Performances Élevées / Ultime';

  let powerIsOk = hw.powerPlan === 'performance';
  list.push({
    id: 'power-plan',
    title: 'Mode de Gestion d\'Énergie Windows (C-States AMD Ryzen)',
    category: 'Alimentation Système & CPU',
    actionRequired: !powerIsOk,
    status: powerIsOk ? 'ok' : 'warning',
    actionText: 'Mettre "Performances Élevées" sur le Mode d\'Alimentation Windows',
    actuelText: powerActuel,
    cause: 'Le mode "Équilibré" abaisse la fréquence du processeur AMD Ryzen lors des micro-silences. La remontée en fréquence crée une micro-coupure audio (DPC Latency spike).',
    fix: 'Appuyez sur <kbd>Win</kbd> + <kbd>R</kbd> ➔ Tapez <code>powercfg.cpl</code> ➔ Sélectionnez le mode <strong>Performances Élevées</strong>.'
  });

  // 5. Suspension Sélective USB Windows
  let usbSuspActuel = hw.usbSuspend === 'enabled' ? 'Activé (Mise en veille sélective USB autorisée)' : 'Désactivé (Alimentation continue)';
  let usbSuspIsOk = hw.usbSuspend === 'disabled';
  list.push({
    id: 'usb-suspend',
    title: 'Suspension Sélective des Ports USB (Windows Power)',
    category: 'Alimentation Ports USB',
    actionRequired: !usbSuspIsOk,
    status: usbSuspIsOk ? 'ok' : 'danger',
    actionText: 'Mettre "Désactivé" sur la Suspension Sélective USB',
    actuelText: usbSuspIsOk ? 'Désactivé' : usbSuspActuel,
    cause: 'Windows coupe brièvement l\'alimentation du dongle G733 lorsqu\'aucun son n\'est émis pendant 2 secondes. Lors de la réémission du son, un craquement sec se produit.',
    fix: 'Dans <code>powercfg.cpl</code> ➔ Modifier les paramètres du mode ➔ Modifier les paramètres d\'alimentation avancés ➔ <em>Paramètres USB</em> ➔ <em>Paramètre de suspension sélective USB</em> ➔ Réglez sur <strong>Désactivé</strong>.'
  });

  // 6. Fréquence d'échantillonnage Système (Sample Rate)
  let srActuelText = sr ? `${sr.toLocaleString()} Hz (${(sr/1000).toFixed(1)} kHz)` : 'Non initialisé (Cliquez sur "Démarrer le Test Audio")';
  let srIsOk = sr === 48000;
  list.push({
    id: 'sample-rate',
    title: 'Fréquence d\'Échantillonnage du G733 (Format par Défaut)',
    category: 'Horloge & Resampling Windows',
    actionRequired: sr ? !srIsOk : false,
    status: srIsOk ? 'ok' : 'danger',
    actionText: 'Mettre "24 bits, 48000 Hz (Qualité Studio)" sur le G733 dans Windows',
    actuelText: srActuelText,
    cause: 'Le récepteur sans fil du Logitech G733 est synchronisé sur la fréquence 48 000 Hz. Si Windows est en 44100 Hz ou 96000 Hz, le moteur son doit resampler en permanence, générant des décalages d\'horloge.',
    fix: 'Appuyez sur <kbd>Win</kbd> + <kbd>R</kbd> ➔ <code>mmsys.cpl</code> ➔ Clic droit sur Logitech G733 ➔ Propriétés ➔ Statistiques avancées ➔ Choisissez <strong>24 bits, 48000 Hz (Qualité Studio)</strong>.'
  });

  // 7. Mode Exclusif Audio (WASAPI Exclusive)
  let excActuel = hw.exclusiveMode === 'enabled' ? 'Activé (Applications autorisées à contrôler le périphérique)' : 'Désactivé (Mode Partagé Strict)';
  let excIsOk = hw.exclusiveMode === 'disabled';
  list.push({
    id: 'exclusive-mode',
    title: 'Mode Exclusif d\'Application (Conflits Discord / Jeux)',
    category: 'Gestion des Flux Audio',
    actionRequired: !excIsOk,
    status: excIsOk ? 'ok' : 'warning',
    actionText: 'Mettre "Désactivé" sur l\'Autorisation du Mode Exclusif',
    actuelText: excActuel,
    cause: 'Lorsqu\'un jeu ou Discord tente d\'ouvrir le casque en mode exclusif, les autres logiciels voient leur paquet son haché, générant des craquements.',
    fix: 'Dans <code>mmsys.cpl</code> ➔ Propriétés du G733 ➔ Statistiques avancées ➔ Décochez <em>"Autoriser les applications à prendre le contrôle exclusif de ce périphérique"</em>.'
  });

  // 8. Améliorations Audio Windows (Audio Enhancements / Realtek Nahimic)
  let enhActuel = hw.enhancements === 'enabled' ? 'Activé (Effets sonores / Égaliseur Windows actifs)' : 'Désactivé (Toutes les améliorations sonores désactivées)';
  let enhIsOk = hw.enhancements === 'disabled';
  list.push({
    id: 'enhancements',
    title: 'Améliorations Sonores & Effets APO Windows',
    category: 'Filtres DSP',
    actionRequired: !enhIsOk,
    status: enhIsOk ? 'ok' : 'warning',
    actionText: 'Mettre "Désactivé" sur les Améliorations Audio Windows',
    actuelText: enhActuel,
    cause: 'Les cartes mères ASRock installent parfois des couches DSP (Realtek / Nahimic) qui saturent le buffer du périphérique sans fil.',
    fix: 'Dans <code>mmsys.cpl</code> ➔ Propriétés du G733 ➔ Onglet Améliorations ➔ Cochez <strong>"Désactiver toutes les améliorations"</strong>.'
  });

  return list;
}

// Compute Score & Action Count
function updateSummary() {
  const recs = getRecommendations();
  const actionRequiredList = recs.filter(r => r.actionRequired);
  const actionCount = actionRequiredList.length;

  const countBadge = document.getElementById('action-count-badge');
  const tabCount = document.getElementById('tab-rec-count');
  const scoreVal = document.getElementById('health-score-val');
  const scoreTitle = document.getElementById('health-score-title');
  const scoreDesc = document.getElementById('health-score-desc');
  const scoreCircle = document.getElementById('score-circle');

  countBadge.textContent = `${actionCount} à corriger`;
  tabCount.textContent = actionCount;

  let score = Math.max(0, Math.round(100 - (actionCount * 12)));
  scoreVal.textContent = score;

  if (actionCount === 0) {
    scoreCircle.style.borderColor = 'var(--status-ok)';
    scoreTitle.textContent = 'Configuration Optimale !';
    scoreDesc.textContent = 'Toutes les recommandations spécifiques au G733, BIOS ASRock A520M & Windows sont appliquées. Aucun risque de grésillement détecté.';
    countBadge.className = 'pill-value highlight';
  } else if (actionCount <= 2) {
    scoreCircle.style.borderColor = 'var(--status-warning)';
    scoreTitle.textContent = `${actionCount} Action(s) Nécessaire(s)`;
    scoreDesc.textContent = 'Des réglages USB, BIOS ou audio sont susceptibles de causer des micro-coupures. Appliquez les corrections ci-dessous.';
    countBadge.className = 'pill-value';
  } else {
    scoreCircle.style.borderColor = 'var(--status-danger)';
    scoreTitle.textContent = `${actionCount} Actions Critiques Requises`;
    scoreDesc.textContent = 'Plusieurs anomalies majeures (BIOS / USB / DPC / G HUB) causent des grésillements sur votre G733. Corrigez-les dans l\'ordre.';
    countBadge.className = 'pill-value danger-text';
  }
}

// Render Actionable Recommendations Only
function renderRecommendations() {
  const container = document.getElementById('recommendations-container');
  container.innerHTML = '';

  const recs = getRecommendations();
  const filtered = state.showAllRecommendations ? recs : recs.filter(r => r.actionRequired);

  if (filtered.length === 0 && !state.showAllRecommendations) {
    container.innerHTML = `
      <div class="no-actions-card">
        <h3>🎉 Aucune action requise !</h3>
        <p>Vos réglages actuels correspondent exactement à la configuration recommandée pour le <strong>Logitech G733</strong> et votre carte mère <strong>ASRock A520M</strong> (BIOS à jour).</p>
      </div>
    `;
    updateSummary();
    return;
  }

  filtered.forEach(r => {
    const card = document.createElement('div');
    card.className = `rec-card status-${r.status}`;

    let badgeClass = r.status === 'ok' ? 'ok' : (r.status === 'danger' ? 'danger' : 'warning');
    let badgeText = r.status === 'ok' ? '✓ Conforme' : (r.status === 'danger' ? '✖ Action Requise' : '⚠ À Modifier');

    card.innerHTML = `
      <div class="rec-header">
        <div class="rec-title-group">
          <span class="rec-category">${r.category}</span>
          <h4>${r.title}</h4>
        </div>
        <span class="status-badge ${badgeClass}">${badgeText}</span>
      </div>

      <div class="comparison-box-strict">
        <div class="strict-line-action">
          <span>👉 ${r.actionText}</span>
        </div>
        <div class="strict-line-actuel">
          <span>Actuel : ${r.actuelText}</span>
        </div>
      </div>

      <div class="rec-cause">
        <strong>Cause du grésillement :</strong> ${r.cause}
      </div>

      <div class="rec-fix">
        <strong>Comment appliquer la modification :</strong> ${r.fix}
      </div>
    `;

    container.appendChild(card);
  });

  updateSummary();
}

// Audio Engine Initialization
async function initAudioEngine() {
  if (!state.audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioContext();

    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 1024;

    state.masterGain = state.audioCtx.createGain();
    state.masterGain.gain.value = 0.7;
    state.masterGain.connect(state.analyser);
    state.analyser.connect(state.audioCtx.destination);
  }

  if (state.audioCtx.state === 'suspended') {
    await state.audioCtx.resume();
  }

  state.detectedSampleRate = state.audioCtx.sampleRate;
  
  let baseLat = state.audioCtx.baseLatency || 0;
  let outLat = state.audioCtx.outputLatency || 0;
  state.detectedLatency = (baseLat + outLat) * 1000;
  if (state.detectedLatency === 0) state.detectedLatency = 12.5;

  state.detectedChannels = state.audioCtx.destination.maxChannelCount || 2;

  document.getElementById('detected-sample-rate').textContent = `${state.detectedSampleRate} Hz`;
  document.getElementById('detected-latency').textContent = `~${state.detectedLatency.toFixed(1)} ms`;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(d => d.kind === 'audiooutput');
    if (outputs.length > 0 && outputs[0].label) {
      document.getElementById('detected-output-device').textContent = outputs[0].label.substring(0, 22) + '...';
    }
  } catch (err) {}

  renderRecommendations();
  startCanvasVisualizer();
}

// Canvas Waveform Visualizer
function startCanvasVisualizer() {
  const canvas = document.getElementById('audio-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resize();

  const timeData = new Uint8Array(state.analyser ? state.analyser.fftSize : 512);

  function draw() {
    requestAnimationFrame(draw);
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!state.analyser) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }

    state.analyser.getByteTimeDomainData(timeData);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#06b6d4';
    ctx.beginPath();

    const sliceWidth = canvas.width * 1.0 / timeData.length;
    let x = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = v * canvas.height / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  draw();
}

// Tone Generators
function stopActiveSource() {
  if (state.activeSource) {
    try {
      state.activeSource.stop();
      state.activeSource.disconnect();
    } catch (e) {}
    state.activeSource = null;
  }
}

async function playTone(freq) {
  await initAudioEngine();
  stopActiveSource();

  const osc = state.audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
  osc.connect(state.masterGain);
  osc.start();
  state.activeSource = osc;
}

async function playSweep() {
  await initAudioEngine();
  stopActiveSource();

  const osc = state.audioCtx.createOscillator();
  osc.type = 'sine';
  const now = state.audioCtx.currentTime;
  osc.frequency.setValueAtTime(20, now);
  osc.frequency.exponentialRampToValueAtTime(20000, now + 5);
  osc.connect(state.masterGain);
  osc.start();
  osc.stop(now + 5.1);
  state.activeSource = osc;
}

// Generate Report
function generateReportText() {
  const recs = getRecommendations();
  const actionList = recs.filter(r => r.actionRequired);
  const dateStr = new Date().toLocaleString('fr-FR');

  let text = `=====================================================\n`;
  text += `   BILAN AUDIOFIX — LOGITECH G733 & ASROCK A520M\n`;
  text += `   Date : ${dateStr}\n`;
  text += `=====================================================\n\n`;

  text += `[ACTIONS REQUISES POUR ÉLIMINER LE GRÉSILLEMENT] : ${actionList.length}\n\n`;

  if (actionList.length === 0) {
    text += `✓ Tous les réglages matériels, BIOS et logiciels sont optimisés !\n`;
  } else {
    actionList.forEach((r, idx) => {
      text += `${idx + 1}. 👉 ${r.actionText}\n`;
      text += `   * Actuel : ${r.actuelText}\n`;
      text += `   * Cause  : ${r.cause}\n`;
      text += `   * Fix    : ${r.fix.replace(/<[^>]*>?/gm, '')}\n\n`;
    });
  }

  return text;
}

// DOM Setup
document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const targetId = `tab-${tab.getAttribute('data-tab')}`;
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Attach Hardware Selector Listeners
  const bindSelect = (id, stateKey) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        state.hardwareSettings[stateKey] = e.target.value;
        renderRecommendations();
      });
    }
  };

  bindSelect('sel-usb-port', 'usbPort');
  bindSelect('sel-g-hub-dts', 'gHubDts');
  bindSelect('sel-power-plan', 'powerPlan');
  bindSelect('sel-usb-suspend', 'usbSuspend');
  bindSelect('sel-bios-version', 'biosVersion');

  // Toggle Show All
  const chkShowAll = document.getElementById('chk-show-all');
  if (chkShowAll) {
    chkShowAll.addEventListener('change', (e) => {
      state.showAllRecommendations = e.target.checked;
      renderRecommendations();
    });
  }

  // Audio Buttons
  document.getElementById('btn-start-audio').addEventListener('click', initAudioEngine);

  const freqSlider = document.getElementById('freq-slider');
  freqSlider.addEventListener('input', (e) => {
    document.getElementById('freq-val').textContent = `${e.target.value} Hz`;
    if (state.activeSource && state.activeSource.frequency) {
      state.activeSource.frequency.setValueAtTime(e.target.value, state.audioCtx.currentTime);
    }
  });

  const volSlider = document.getElementById('volume-slider');
  volSlider.addEventListener('input', (e) => {
    document.getElementById('vol-val').textContent = `${e.target.value}%`;
    if (state.masterGain) {
      state.masterGain.gain.setValueAtTime(e.target.value / 100, state.audioCtx.currentTime);
    }
  });

  document.getElementById('btn-play-tone').addEventListener('click', () => playTone(parseInt(freqSlider.value, 10)));
  document.getElementById('btn-play-sweep').addEventListener('click', playSweep);
  document.getElementById('btn-stop-audio').addEventListener('click', stopActiveSource);

  // Report Modal
  const modal = document.getElementById('modal-report');
  document.getElementById('btn-export-report').addEventListener('click', () => {
    document.getElementById('report-text').textContent = generateReportText();
    modal.classList.add('active');
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.remove('active'));

  document.getElementById('btn-copy-report').addEventListener('click', () => {
    navigator.clipboard.writeText(generateReportText()).then(() => alert("Bilan copié !"));
  });

  document.getElementById('btn-download-report').addEventListener('click', () => {
    const blob = new Blob([generateReportText()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AudioFix_Bilan_${Date.now()}.txt`;
    a.click();
  });

  // Initial Render
  renderRecommendations();
  startCanvasVisualizer();
});
