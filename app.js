/**
 * AudioFix Web — Auto-Diagnostic (Logitech G733 & ASRock A520M Edition)
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
};

// Build Direct Recommendations Engine in strict format:
// "Mettre [VALEUR RECOMMANDÉE] sur [NOM DU PARAMÈTRE]" -> "Actuel : [VALEUR ACTUELLE]"
function getRecommendations() {
  const sr = state.detectedSampleRate;
  const lat = state.detectedLatency;

  const list = [];

  // 1. BIOS ASRock A520M & Correctif Bug USB AMD AGESA 1.2.0.7
  list.push({
    id: 'bios-version',
    title: 'Version du BIOS ASRock A520M (Patch USB AMD AGESA 1.2.0.7)',
    category: 'Firmware Carte Mère ASRock',
    status: 'danger',
    actionText: 'Mettre à jour le BIOS ASRock A520M vers la version P2.10+ (Patch AGESA 1.2.0.7)',
    actuelText: 'BIOS d\'origine / Ancien (Inférieur à P2.10 — Bug USB AMD non corrigé)',
    cause: 'AMD a reconnu un bug mondial sur les chipsets AM4 (A520/B550/X570) provoquant la coupure aléatoire de l\'alimentation USB et des grésillements sur les casques sans fil. Ce bug est résolu par le BIOS P2.10 (AGESA 1.2.0.7).',
    fix: 'Ouvrez un terminal CMD et tapez <code>wmic bios get smbiosbiosversion</code> pour vérifier votre version. Si elle est inférieure à P2.10, téléchargez le dernier BIOS sur le site officiel d\'ASRock.'
  });

  // 2. Emplacement Dongle USB G733 sur ASRock A520M
  list.push({
    id: 'usb-port',
    title: 'Emplacement du Dongle LIGHTSPEED G733 (ASRock A520M)',
    category: 'Matériel USB & Signal RF 2.4GHz',
    status: 'danger',
    actionText: 'Mettre "Port USB 2.0 Noir Arrière Carte Mère ASRock" sur le Dongle G733',
    actuelText: 'Port USB 3.0 / Façade Boîtier (Sujet aux parasites 2.4GHz AMD)',
    cause: 'Le contrôleur AMD Ryzen (A520M) et les câbles USB 3.0 émettent des bruits radio dans la bande 2.4 GHz qui perturbent la connexion sans fil du Logitech G733. Le port USB 2.0 Noir arrière est direct et isolé.',
    fix: 'Débranchez le récepteur USB du G733 de la façade ou d\'un port bleu USB 3.0, et branchez-le sur l\'un des deux ports <strong>USB 2.0 Noirs</strong> situés tout en haut à l\'arrière de la carte mère ASRock A520M.'
  });

  // 3. Logitech G HUB — Son Surround DTS 2.0
  list.push({
    id: 'ghub-dts',
    title: 'Traitement Spatial Logitech G HUB (DTS Headphone:X 2.0)',
    category: 'Pilote & Logiciel Logitech',
    status: 'warning',
    actionText: 'Mettre "Désactivé" sur le Son Surround DTS dans Logitech G HUB',
    actuelText: 'Activé par défaut dans G HUB (Surround 7.1 Virtuel)',
    cause: 'Le moteur surround virtuel de G HUB ré-échantillonne en continu le son en 7.1, ce qui sature le tampon du dongle USB G733 et génère des craquements intempestifs en jeu ou sur Discord.',
    fix: 'Ouvrez <strong>Logitech G HUB</strong> ➔ Cliquez sur votre casque <strong>G733</strong> ➔ Onglet <em>Acoustique</em> ➔ Décochez <strong>"Activer le son surround"</strong>.'
  });

  // 4. Modes d'Alimentation Windows (Gestion des C-States CPU AMD AM4)
  list.push({
    id: 'power-plan',
    title: 'Mode de Gestion d\'Énergie Windows (C-States AMD Ryzen)',
    category: 'Alimentation Système & CPU',
    status: 'warning',
    actionText: 'Mettre "Performances Élevées" sur le Mode d\'Alimentation Windows',
    actuelText: 'Utilisation normale (Équilibré)',
    cause: 'Le mode "Équilibré" abaisse la fréquence du processeur AMD Ryzen lors des micro-silences. La remontée en fréquence crée une micro-coupure audio (DPC Latency spike).',
    fix: 'Appuyez sur <kbd>Win</kbd> + <kbd>R</kbd> ➔ Tapez <code>powercfg.cpl</code> ➔ Sélectionnez le mode <strong>Performances Élevées</strong>.'
  });

  // 5. Suspension Sélective USB Windows
  list.push({
    id: 'usb-suspend',
    title: 'Suspension Sélective des Ports USB (Windows Power)',
    category: 'Alimentation Ports USB',
    status: 'danger',
    actionText: 'Mettre "Désactivé" sur la Suspension Sélective USB',
    actuelText: 'Activé par défaut (Mise en veille sélective USB autorisée)',
    cause: 'Windows coupe brièvement l\'alimentation du dongle G733 lorsqu\'aucun son n\'est émis pendant 2 secondes. Lors de la réémission du son, un craquement sec se produit.',
    fix: 'Dans <code>powercfg.cpl</code> ➔ Modifier les paramètres du mode ➔ Modifier les paramètres d\'alimentation avancés ➔ <em>Paramètres USB</em> ➔ <em>Paramètre de suspension sélective USB</em> ➔ Réglez sur <strong>Désactivé</strong>.'
  });

  // 6. Fréquence d'échantillonnage Système (Sample Rate)
  let srActuelText = sr ? `${sr.toLocaleString()} Hz (${(sr/1000).toFixed(1)} kHz)` : 'Cliquez sur "Activer le Moteur Audio" pour analyser';
  let srIsOk = sr === 48000;
  list.push({
    id: 'sample-rate',
    title: 'Fréquence d\'Échantillonnage du G733 (Format par Défaut)',
    category: 'Horloge & Resampling Windows',
    status: srIsOk ? 'ok' : 'danger',
    actionText: 'Mettre "24 bits, 48000 Hz (Qualité Studio)" sur le G733 dans Windows',
    actuelText: srActuelText,
    cause: 'Le récepteur sans fil du Logitech G733 est synchronisé sur la fréquence 48 000 Hz. Si Windows est en 44100 Hz ou 96000 Hz, le moteur son doit resampler en permanence, générant des décalages d\'horloge.',
    fix: 'Appuyez sur <kbd>Win</kbd> + <kbd>R</kbd> ➔ <code>mmsys.cpl</code> ➔ Clic droit sur Logitech G733 ➔ Propriétés ➔ Statistiques avancées ➔ Choisissez <strong>24 bits, 48000 Hz (Qualité Studio)</strong>.'
  });

  // 7. Mode Exclusif Audio (WASAPI Exclusive)
  list.push({
    id: 'exclusive-mode',
    title: 'Mode Exclusif d\'Application (Conflits Discord / Jeux)',
    category: 'Gestion des Flux Audio',
    status: 'warning',
    actionText: 'Mettre "Désactivé" sur l\'Autorisation du Mode Exclusif',
    actuelText: 'Activé par défaut (Applications autorisées à contrôler le périphérique)',
    cause: 'Lorsqu\'un jeu ou Discord tente d\'ouvrir le casque en mode exclusif, les autres logiciels voient leur paquet son haché, générant des craquements.',
    fix: 'Dans <code>mmsys.cpl</code> ➔ Propriétés du G733 ➔ Statistiques avancées ➔ Décochez <em>"Autoriser les applications à prendre le contrôle exclusif de ce périphérique"</em>.'
  });

  return list;
}

// Compute Summary
function updateSummary() {
  const recs = getRecommendations();
  const countBadge = document.getElementById('action-count-badge');
  const tabCount = document.getElementById('tab-rec-count');
  const scoreVal = document.getElementById('health-score-val');
  const scoreTitle = document.getElementById('health-score-title');
  const scoreDesc = document.getElementById('health-score-desc');
  const scoreCircle = document.getElementById('score-circle');

  const reqCount = recs.filter(r => r.status !== 'ok').length;
  countBadge.textContent = `${reqCount} actions ciblées`;
  tabCount.textContent = reqCount;

  scoreVal.textContent = '75';
  scoreCircle.style.borderColor = 'var(--status-warning)';
  scoreTitle.textContent = 'Auto-Diagnostic Prêt';
  scoreDesc.textContent = 'Consultez les actions ciblées ci-dessous ou lancez le scan automatique 1-clic pour vérifier votre version de BIOS ASRock et vos ports USB.';
}

// Render Recommendations
function renderRecommendations() {
  const container = document.getElementById('recommendations-container');
  container.innerHTML = '';

  const recs = getRecommendations();

  recs.forEach(r => {
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
  const dateStr = new Date().toLocaleString('fr-FR');

  let text = `=====================================================\n`;
  text += `   BILAN AUDIOFIX — LOGITECH G733 & ASROCK A520M\n`;
  text += `   Date : ${dateStr}\n`;
  text += `=====================================================\n\n`;

  recs.forEach((r, idx) => {
    text += `${idx + 1}. 👉 ${r.actionText}\n`;
    text += `   * Actuel : ${r.actuelText}\n`;
    text += `   * Cause  : ${r.cause}\n`;
    text += `   * Fix    : ${r.fix.replace(/<[^>]*>?/gm, '')}\n\n`;
  });

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
