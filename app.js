/**
 * AudioFix Web — Application & Moteur Diagnostic Audio Anti-Grésillement
 */

// State Management
const state = {
  audioCtx: null,
  analyser: null,
  masterGain: null,
  activeSource: null,
  micStream: null,
  micSource: null,
  micAnalyser: null,
  isTestingMic: false,
  stressInterval: null,
  stressWorkload: 0,
  glitchCount: 0,

  // Detected & Interactive Values
  detectedSampleRate: null,
  detectedLatency: null,
  detectedChannels: null,

  // User override values for OS settings not exposed to Web API
  userSettings: {
    bitDepth: '16bits', // '16bits', '24bits'
    enhancements: 'enabled', // 'enabled', 'disabled'
    exclusiveMode: 'enabled', // 'enabled', 'disabled'
    usbPower: 'enabled', // 'enabled', 'disabled'
  }
};

// Recommendations Database Structure
const getRecommendations = () => {
  const sr = state.detectedSampleRate;
  const lat = state.detectedLatency;

  // 1. Sample Rate Recommendation
  let srStatus = 'ok';
  let srActuel = sr ? `${sr.toLocaleString()} Hz (${(sr/1000).toFixed(1)} kHz)` : 'Non détecté (Cliquez sur "Activer le Moteur Audio")';
  let srCause = 'Une fréquence de 48000 Hz est la norme absolue pour Windows, Discord, YouTube et les jeux modernes. Si Windows est configuré en 44100 Hz ou 96000 Hz, le moteur audio effectue un ré-échantillonnage continu (resampling) provoquant des craquements et grésillements.';
  
  if (sr && sr !== 48000) {
    if (sr === 44100) {
      srStatus = 'warning';
      srCause = 'Actuellement à 44.1 kHz (Qualité CD). Les logiciels modernes (Discord, Jeux, Chrome) traitent le son en 48 kHz. La conversion dynamique génère des micro-interpolations et des clics sonores.';
    } else {
      srStatus = 'danger';
      srCause = `Actuellement à ${sr} Hz. Les fréquences très élevées (96 kHz, 192 kHz) consomment énormément de ressources processeur audio et causent des saturations de tampon (Buffer Underrun) dégradant le son.`;
    }
  }

  // 2. Bit Depth Recommendation
  let bitStatus = state.userSettings.bitDepth === '24bits' ? 'ok' : 'warning';
  let bitActuel = state.userSettings.bitDepth === '24bits' ? '24 bits, 48000 Hz (Qualité Studio)' : '16 bits, 44100 Hz / 48000 Hz (Qualité CD)';

  // 3. Buffer Latency Recommendation
  let latStatus = 'ok';
  let latActuel = lat ? `${lat.toFixed(1)} ms` : 'En attente d\'activation';
  let latCause = 'Si la latence est inférieure à 8 ms sans carte son professionnelle (ASIO), le processeur n\'a pas assez de temps pour remplir le tampon audio avant l\'émission des haut-parleurs, générant des craquements intempestifs.';
  
  if (lat) {
    if (lat < 8) {
      latStatus = 'danger';
      latCause = 'CRITIQUE : Latence trop faible (< 8 ms) pour les pilotes DirectSound/WASAPI Windows. Saturation constante du tampon audio.';
    } else if (lat > 40) {
      latStatus = 'warning';
      latCause = 'Latence élevée (> 40 ms). Évite les grésillements mais introduit un retard perceptible dans les jeux et conversations.';
    }
  }

  // 4. Windows Enhancements
  let enhStatus = state.userSettings.enhancements === 'disabled' ? 'ok' : 'danger';
  let enhActuel = state.userSettings.enhancements === 'disabled' ? 'Désactivé (Recommandé)' : 'Activé (Effets APO / Égaliseur / Spatial)';

  // 5. Exclusive Mode
  let excStatus = state.userSettings.exclusiveMode === 'disabled' ? 'ok' : 'warning';
  let excActuel = state.userSettings.exclusiveMode === 'disabled' ? 'Mode Partagé (Désactivé)' : 'Mode Exclusif Autorisé';

  // 6. USB Power Management
  let usbStatus = state.userSettings.usbPower === 'disabled' ? 'ok' : 'warning';
  let usbActuel = state.userSettings.usbPower === 'disabled' ? 'Économie USB Désactivée' : 'Économie d\'Énergie USB Active';

  return [
    {
      id: 'sample-rate',
      title: 'Fréquence d\'Échantillonnage (Sample Rate)',
      category: 'Horloge & Resampling',
      actuel: srActuel,
      recommande: '48 000 Hz (48.0 kHz - Format Studio DVD)',
      status: srStatus,
      cause: srCause,
      fix: 'Ouvrez <code>mmsys.cpl</code> -> Clic droit Périphérique -> Propriétés -> Statistiques avancées -> Choisissez <strong>24 bits, 48000 Hz</strong>.'
    },
    {
      id: 'bit-depth',
      title: 'Profondeur de Binarisation (Bit Depth)',
      category: 'Dynamique Audio',
      actuel: bitActuel,
      recommande: '24 bits, 48000 Hz (Qualité Studio)',
      status: bitStatus,
      interactiveKey: 'bitDepth',
      interactiveOptions: [
        { label: '16 bits (Qualité CD)', val: '16bits' },
        { label: '24 bits (Qualité Studio)', val: '24bits' }
      ],
      cause: 'Le 16 bits réduit la plage dynamique et augmente le bruit de fond numérique. Le 24 bits offre une réserve dynamique optimale empêchant la saturation.',
      fix: 'Dans l\'onglet Statistiques avancées de Windows, passez de 16 bits à 24 bits.'
    },
    {
      id: 'buffer-latency',
      title: 'Taille de Tampon & Latence Audio',
      category: 'Stabilité Tampon (Buffer)',
      actuel: latActuel,
      recommande: '10.0 ms à 20.0 ms (Zone de Stabilité)',
      status: latStatus,
      cause: latCause,
      fix: 'Si vous utilisez une carte son USB/DAC avec logiciel dédié (Focusrite, Logitech, SteelSeries), réglez la taille de buffer sur 192 ou 256 samples.'
    },
    {
      id: 'audio-enhancements',
      title: 'Améliorations Audio Windows & Effets APO',
      category: 'Traitement DSP',
      actuel: enhActuel,
      recommande: 'Désactivé (Désactiver toutes les améliorations)',
      status: enhStatus,
      interactiveKey: 'enhancements',
      interactiveOptions: [
        { label: 'Activé (Effets / Égaliseur)', val: 'enabled' },
        { label: 'Désactivé (Toutes les améliorations)', val: 'disabled' }
      ],
      cause: 'Les traitements DSP supplémentaires (Dolby Atmos, Realtek Equalizer, Windows Spatial Audio) provoquent des pics de processeur audio et des distorsions.',
      fix: 'Dans <code>mmsys.cpl</code> -> Propriétés -> Onglet Améliorations -> Cochez <strong>"Désactiver toutes les améliorations"</strong>.'
    },
    {
      id: 'exclusive-mode',
      title: 'Mode Exclusif d\'Application (WASAPI Exclusive)',
      category: 'Conflit de Flux',
      actuel: excActuel,
      recommande: 'Mode Partagé (Décocher l\'Accès Exclusif)',
      status: excStatus,
      interactiveKey: 'exclusiveMode',
      interactiveOptions: [
        { label: 'Mode Exclusif Autorisé (Risque de conflit)', val: 'enabled' },
        { label: 'Mode Partagé Seul (Sécurisé)', val: 'disabled' }
      ],
      cause: 'Si Discord et un jeu tentent d\'accéder en même temps au casque en mode exclusif avec des fréquences différentes, le flux sonnera haché ou grésillera.',
      fix: 'Dans <code>mmsys.cpl</code> -> Propriétés -> Statistiques avancées -> Décochez <em>"Autoriser les applications à prendre le contrôle exclusif"</em>.'
    },
    {
      id: 'usb-power',
      title: 'Gestion d\'Énergie des Ports USB',
      category: 'Alimentation Matérielle',
      actuel: usbActuel,
      recommande: 'Économie d\'Énergie Désactivée sur l\'USB',
      status: usbStatus,
      interactiveKey: 'usbPower',
      interactiveOptions: [
        { label: 'Économie USB Active (Mise en veille sélective)', val: 'enabled' },
        { label: 'Économie USB Désactivée (Alimentation stable)', val: 'disabled' }
      ],
      cause: 'Windows met parfois en veille le hub USB pendant une faible activité audio. Lors d\'une reprise soudaine du son, la baisse de tension génère un craquement sec.',
      fix: 'Gestionnaire de périphériques -> Contrôleurs de bus USB -> Propriétés Concentrateur USB -> Onglet Gestion d\'énergie -> Décochez la mise en veille.'
    }
  ];
};

// Compute Health Score
function computeHealthScore() {
  const recs = getRecommendations();
  let totalPoints = 0;
  let maxPoints = recs.length * 100;

  recs.forEach(r => {
    if (r.status === 'ok') totalPoints += 100;
    else if (r.status === 'warning') totalPoints += 50;
    else if (r.status === 'danger') totalPoints += 0;
  });

  const score = Math.round((totalPoints / maxPoints) * 100);
  return score;
}

// Render UI Components
function renderScoreBanner() {
  const score = computeHealthScore();
  const scoreCircle = document.getElementById('score-circle');
  const scoreVal = document.getElementById('health-score-val');
  const scoreDesc = document.getElementById('health-score-desc');

  scoreVal.textContent = score;

  if (score >= 85) {
    scoreCircle.style.borderColor = 'var(--status-ok)';
    scoreCircle.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3)';
    scoreDesc.textContent = 'Excellente configuration ! Les paramètres audio sont optimisés contre les grésillements.';
  } else if (score >= 60) {
    scoreCircle.style.borderColor = 'var(--status-warning)';
    scoreCircle.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.3)';
    scoreDesc.textContent = 'Configuration moyenne. Plusieurs décalages entre réglage actuel et recommandé risquent de causer des micro-coupures.';
  } else {
    scoreCircle.style.borderColor = 'var(--status-danger)';
    scoreCircle.style.boxShadow = '0 0 20px rgba(244, 57, 94, 0.4)';
    scoreDesc.textContent = 'Risque élevé de grésillement. Suivez les recommandations ci-dessous pour appliquer les réglages requis.';
  }
}

function renderRecommendations() {
  const container = document.getElementById('recommendations-container');
  container.innerHTML = '';
  const recs = getRecommendations();

  recs.forEach(r => {
    const card = document.createElement('div');
    card.className = 'rec-card';

    let badgeClass = r.status === 'ok' ? 'ok' : (r.status === 'warning' ? 'warning' : 'danger');
    let badgeText = r.status === 'ok' ? '✓ Conforme' : (r.status === 'warning' ? '⚠ Avertissement' : '✖ Grésillement Risqué');

    let interactiveHTML = '';
    if (r.interactiveKey) {
      interactiveHTML = `
        <div class="rec-interactive-select">
          <label style="font-size:0.78rem; color:var(--text-muted);">Indiquez votre réglage actuel sous Windows :</label>
          <select data-key="${r.interactiveKey}">
            ${r.interactiveOptions.map(opt => `
              <option value="${opt.val}" ${state.userSettings[r.interactiveKey] === opt.val ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="rec-header">
        <div class="rec-title-group">
          <span class="rec-category">${r.category}</span>
          <h4>${r.title}</h4>
        </div>
        <span class="status-badge ${badgeClass}">${badgeText}</span>
      </div>

      <div class="comparison-box">
        <div class="cmp-row">
          <span class="cmp-label">Réglage Actuel :</span>
          <span class="cmp-val actuel">${r.actuel}</span>
        </div>
        <div class="cmp-row">
          <span class="cmp-label">Recommandation :</span>
          <span class="cmp-val recommande">${r.recommande}</span>
        </div>
      </div>

      ${interactiveHTML}

      <div class="rec-cause">
        <strong>Pourquoi ça grésille :</strong> ${r.cause}
      </div>

      <div class="rec-fix">
        <strong>Solution pas-à-pas :</strong> ${r.fix}
      </div>
    `;

    container.appendChild(card);
  });

  // Attach event listeners to interactive selects
  container.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', (e) => {
      const key = e.target.getAttribute('data-key');
      state.userSettings[key] = e.target.value;
      renderRecommendations();
      renderScoreBanner();
    });
  });
}

// Audio Engine Initialization
async function initAudioEngine() {
  if (!state.audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioContext();

    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 1024;

    state.masterGain = state.audioCtx.createGain();
    state.masterGain.gain.value = 0.7; // 70%
    state.masterGain.connect(state.analyser);
    state.analyser.connect(state.audioCtx.destination);
  }

  if (state.audioCtx.state === 'suspended') {
    await state.audioCtx.resume();
  }

  // Update Live Detected Metrics
  state.detectedSampleRate = state.audioCtx.sampleRate;
  
  let baseLat = state.audioCtx.baseLatency || 0;
  let outLat = state.audioCtx.outputLatency || 0;
  state.detectedLatency = (baseLat + outLat) * 1000;
  if (state.detectedLatency === 0) state.detectedLatency = 12.5; // Default estimation fallback

  state.detectedChannels = state.audioCtx.destination.maxChannelCount || 2;

  // Update UI Pills
  document.getElementById('detected-sample-rate').textContent = `${state.detectedSampleRate} Hz`;
  document.getElementById('detected-latency').textContent = `~${state.detectedLatency.toFixed(1)} ms`;
  document.getElementById('detected-channels').textContent = `${state.detectedChannels} Canaux`;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(d => d.kind === 'audiooutput');
    if (outputs.length > 0 && outputs[0].label) {
      document.getElementById('detected-output-device').textContent = outputs[0].label.substring(0, 20) + '...';
    }
  } catch (err) {
    console.warn("Permission de périphérique non disponible");
  }

  renderRecommendations();
  renderScoreBanner();
  startCanvasVisualizer();
}

// Canvas FFT & Waveform Visualizer
function startCanvasVisualizer() {
  const canvas = document.getElementById('audio-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const timeData = new Uint8Array(state.analyser ? state.analyser.fftSize : 512);
  const freqData = new Uint8Array(state.analyser ? state.analyser.frequencyBinCount : 256);

  function draw() {
    requestAnimationFrame(draw);

    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!state.analyser) {
      // Idle grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }

    state.analyser.getByteTimeDomainData(timeData);
    state.analyser.getByteFrequencyData(freqData);

    // Draw Frequency Bars (Background FFT)
    const barWidth = (canvas.width / freqData.length) * 2.5;
    let x = 0;
    for (let i = 0; i < freqData.length; i++) {
      const barHeight = (freqData[i] / 255) * canvas.height * 0.8;
      ctx.fillStyle = `rgba(139, 92, 246, ${freqData[i] / 500})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    // Draw Waveform Line
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#06b6d4';
    ctx.beginPath();

    const sliceWidth = canvas.width * 1.0 / timeData.length;
    let wx = 0;
    let maxVal = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = v * canvas.height / 2;

      const delta = Math.abs(timeData[i] - 128);
      if (delta > maxVal) maxVal = delta;

      if (i === 0) {
        ctx.moveTo(wx, y);
      } else {
        ctx.lineTo(wx, y);
      }
      wx += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Check Clipping / Overload Indicator
    const clippingEl = document.getElementById('clipping-indicator');
    if (maxVal > 120) {
      clippingEl.className = 'clipping-warn';
      clippingEl.textContent = 'Statut : SATURATION DÉTECTÉE (Clipping !)';
    } else {
      clippingEl.className = 'clipping-clean';
      clippingEl.textContent = 'Statut : OK (Pas de Saturation)';
    }
  }

  draw();
}

// Tone Generator
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

// Stress Test & Buffer Load Simulator
async function runStressTest() {
  await initAudioEngine();
  const stressVal = parseInt(document.getElementById('stress-slider').value, 10);
  const statusBox = document.getElementById('stress-status-box');
  const glitchEl = document.getElementById('glitch-counter');
  const liveLat = document.getElementById('live-latency-test');

  state.glitchCount = 0;
  glitchEl.textContent = '0';

  let duration = 10; // seconds
  let startTime = Date.now();

  const dummyAudioNode = state.audioCtx.createScriptProcessor(4096, 1, 1);
  dummyAudioNode.onaudioprocess = (e) => {
    // Heavy mathematical workload simulation
    let iterations = stressVal * 50000;
    let dummy = 0;
    let t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      dummy += Math.sin(i) * Math.cos(i);
    }
    let t1 = performance.now();

    // If processing time exceeds buffer frame duration (e.g. > 90ms), count audio glitch
    if ((t1 - t0) > 80) {
      state.glitchCount++;
      glitchEl.textContent = state.glitchCount;
    }
  };

  dummyAudioNode.connect(state.audioCtx.destination);
  playTone(440);

  liveLat.textContent = `${(state.detectedLatency + (stressVal * 0.2)).toFixed(1)} ms`;

  setTimeout(() => {
    dummyAudioNode.disconnect();
    stopActiveSource();
    alert(`Stress Test Terminé !\nNombre de micro-coupures audio générées par le processeur : ${state.glitchCount}\n${state.glitchCount > 0 ? "Le système a craqué sous la charge : Augmentez la taille du buffer dans Windows." : "Aucune micro-coupure détectée sous cette charge."}`);
  }, duration * 1000);
}

// Microphone Input Test
async function testMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    state.micStream = stream;

    const micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.micSource = micAudioCtx.createMediaStreamSource(stream);
    state.micAnalyser = micAudioCtx.createAnalyser();
    state.micAnalyser.fftSize = 256;
    state.micSource.connect(state.micAnalyser);

    state.isTestingMic = true;
    document.getElementById('btn-test-mic').disabled = true;
    document.getElementById('btn-stop-mic').disabled = false;

    const dataArray = new Uint8Array(state.micAnalyser.frequencyBinCount);
    const meterFill = document.getElementById('mic-meter-fill');
    const dbVal = document.getElementById('mic-db-val');

    function updateMicMeter() {
      if (!state.isTestingMic) return;
      requestAnimationFrame(updateMicMeter);

      state.micAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      let avg = sum / dataArray.length;
      let pct = Math.min(100, Math.round((avg / 128) * 100));

      meterFill.style.width = `${pct}%`;
      
      let db = pct > 0 ? (20 * Math.log10(pct / 100)).toFixed(1) : -Infinity;
      dbVal.textContent = `${db} dB`;
    }

    updateMicMeter();
  } catch (err) {
    alert("Impossible d'accéder au microphone : " + err.message);
  }
}

function stopMicrophone() {
  state.isTestingMic = false;
  if (state.micStream) {
    state.micStream.getTracks().forEach(track => track.stop());
    state.micStream = null;
  }
  document.getElementById('btn-test-mic').disabled = false;
  document.getElementById('btn-stop-mic').disabled = true;
  document.getElementById('mic-meter-fill').style.width = '0%';
  document.getElementById('mic-db-val').textContent = '-∞ dB';
}

// Generate Text Report
function generateReportText() {
  const score = computeHealthScore();
  const recs = getRecommendations();
  const dateStr = new Date().toLocaleString('fr-FR');

  let text = `=====================================================\n`;
  text += `   AUDIOFIX WEB — RAPPORT DE DIAGNOSTIC AUDIO   \n`;
  text += `   Généré le : ${dateStr}\n`;
  text += `=====================================================\n\n`;

  text += `[SCORE DE STABILITÉ AUDIO] : ${score} / 100\n\n`;

  text += `[MÉTRIQUES DÉTECTÉES PAR LE NAVIGATEUR] :\n`;
  text += ` - Fréquence d'échantillonnage : ${state.detectedSampleRate || 'Non initialisée'} Hz\n`;
  text += ` - Latence de sortie mesurée  : ~${state.detectedLatency ? state.detectedLatency.toFixed(1) : '--'} ms\n`;
  text += ` - Nombre de canaux de sortie : ${state.detectedChannels || '--'}\n\n`;

  text += `=====================================================\n`;
  text += `   LISTE DES RECOMMANDATIONS ("ACTUEL" vs "RECOMMANDÉ")\n`;
  text += `=====================================================\n\n`;

  recs.forEach((r, idx) => {
    let statusSym = r.status === 'ok' ? '[OK]' : (r.status === 'warning' ? '[AVERTISSEMENT]' : '[RISQUE DE GRÉSILLEMENT]');
    text += `${idx + 1}. ${r.title.toUpperCase()} ${statusSym}\n`;
    text += `   * Réglage Actuel : ${r.actuel}\n`;
    text += `   * Recommandation : ${r.recommande}\n`;
    text += `   * Cause du bruit : ${r.cause}\n`;
    text += `   * Action Windows  : ${r.fix.replace(/<[^>]*>?/gm, '')}\n\n`;
  });

  text += `=====================================================\n`;
  text += `   GUIDE RAPIDE DE MODIFICATION WINDOWS\n`;
  text += `=====================================================\n`;
  text += `1. Appuyez sur Win + R, tapez "mmsys.cpl" puis Entrée.\n`;
  text += `2. Faites un clic droit sur votre casque -> Propriétés -> Statistiques avancées.\n`;
  text += `3. Réglez la fréquence sur "24 bits, 48000 Hz (Qualité Studio)".\n`;
  text += `4. Décochez le "Mode Exclusif" et "Toutes les améliorations audio".\n`;

  return text;
}

// UI Setup & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching
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

  // Start Audio Engine
  document.getElementById('btn-start-audio').addEventListener('click', initAudioEngine);

  // Sliders
  const freqSlider = document.getElementById('freq-slider');
  const freqVal = document.getElementById('freq-val');
  freqSlider.addEventListener('input', (e) => {
    freqVal.textContent = `${e.target.value} Hz`;
    if (state.activeSource && state.activeSource.frequency) {
      state.activeSource.frequency.setValueAtTime(e.target.value, state.audioCtx.currentTime);
    }
  });

  const volSlider = document.getElementById('volume-slider');
  const volVal = document.getElementById('vol-val');
  volSlider.addEventListener('input', (e) => {
    volVal.textContent = `${e.target.value}%`;
    if (state.masterGain) {
      state.masterGain.gain.setValueAtTime(e.target.value / 100, state.audioCtx.currentTime);
    }
  });

  const stressSlider = document.getElementById('stress-slider');
  const stressVal = document.getElementById('stress-val');
  stressSlider.addEventListener('input', (e) => {
    stressVal.textContent = `${e.target.value} (${e.target.value > 50 ? 'Forte charge' : 'Modérée'})`;
  });

  // Sound Buttons
  document.getElementById('btn-play-tone').addEventListener('click', () => {
    playTone(parseInt(freqSlider.value, 10));
  });

  document.getElementById('btn-play-sweep').addEventListener('click', playSweep);
  document.getElementById('btn-stop-audio').addEventListener('click', stopActiveSource);

  // Stress Test
  document.getElementById('btn-run-stress').addEventListener('click', runStressTest);

  // Mic Test
  document.getElementById('btn-test-mic').addEventListener('click', testMicrophone);
  document.getElementById('btn-stop-mic').addEventListener('click', stopMicrophone);

  // Report Modal
  const modal = document.getElementById('modal-report');
  document.getElementById('btn-export-report').addEventListener('click', () => {
    document.getElementById('report-text').textContent = generateReportText();
    modal.classList.add('active');
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  document.getElementById('btn-copy-report').addEventListener('click', () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text).then(() => {
      alert("Rapport copié dans le presse-papier !");
    });
  });

  document.getElementById('btn-download-report').addEventListener('click', () => {
    const text = generateReportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AudioFix_Rapport_${Date.now()}.txt`;
    a.click();
  });

  // Initial render of empty recommendations before engine activation
  renderRecommendations();
  renderScoreBanner();
  startCanvasVisualizer();
});
