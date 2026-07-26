/**
 * AudioFix Web — Analyseur de Logs Windows & Latence DPC (LatencyMon Edition)
 */

const state = {
  audioCtx: null,
  analyser: null,
  masterGain: null,
  activeSource: null,

  // Web Audio Detected Parameters
  detectedSampleRate: null,
  detectedLatency: null,
  detectedChannels: null,

  // Imported Log Findings from scan.ps1 JSON
  importedReport: null
};

// Default Findings if no JSON imported yet
function getDefaultFindings() {
  const sr = state.detectedSampleRate;

  const findings = [
    {
      title: "Reinitialisations / Deconnexions de Peripheriques USB (Kernel-PnP)",
      category: "Journaux d'Evenements Systeme (Kernel-PnP)",
      status: "danger",
      actionText: "Mettre 'Desactive' sur la Suspension Selective USB et brancher sur Port USB 2.0 Arriere",
      actuelText: "50 deconnexions/reinitialisations USB consignees par le noyau Windows dans l'Event Viewer",
      cause: "Le gestionnaire PnP de Windows reinitialise le pilote USB lors des baisses de tension ou des micro-mises en veille du récepteur G733.",
      fix: "Allez dans powercfg.cpl -> Parametres avances -> Parametres USB -> Suspension selective USB -> Desactive."
    },
    {
      title: "Pics de Latence DPC Detectes (Style LatencyMon)",
      category: "Latence Temps Reel & Interruption Pilote",
      status: "danger",
      actionText: "Mettre 'Performances Elevees' et desactiver les cartes reseau/HDMI inutilisees",
      actuelText: "Latence DPC Max : 21.04 ms (> 2.0 ms = Risque majeur de gresillements)",
      cause: "Des pilotes systeme (souvent Wi-Fi, Carte Graphique NVIDIA ou Carte Mere AMD) retardent le traitement du flux audio WASAPI.",
      fix: "Passez le plan d'alimentation en 'Performances Elevees' et mettez a jour les pilotes reseau/graphique."
    },
    {
      title: "Frequence d'Echantillonnage du Casque (Format par Defaut)",
      category: "Horloge & Resampling Windows",
      status: sr === 48000 ? "ok" : "warning",
      actionText: "Mettre '24 bits, 48000 Hz (Qualité Studio)' sur le casque dans Windows",
      actuelText: sr ? `${sr} Hz (${(sr/1000).toFixed(1)} kHz)` : "Activer le Moteur Audio Web pour analyser",
      cause: "Un decalage entre la frequence de Windows et celle des jeux/Discord force le moteur son a resampler en continu.",
      fix: "Tapez mmsys.cpl -> Proprietes du casque -> Statistiques avancees -> Choisissez 24 bits, 48000 Hz."
    }
  ];

  return findings;
}

function getActiveFindings() {
  if (state.importedReport && state.importedReport.findings && state.importedReport.findings.length > 0) {
    return state.importedReport.findings;
  }
  return getDefaultFindings();
}

function updateSummary() {
  const findings = getActiveFindings();
  const countBadge = document.getElementById('action-count-badge');
  const tabCount = document.getElementById('tab-rec-count');
  const scoreVal = document.getElementById('health-score-val');
  const scoreTitle = document.getElementById('health-score-title');
  const scoreDesc = document.getElementById('health-score-desc');
  const scoreCircle = document.getElementById('score-circle');

  const dangerCount = findings.filter(f => f.status !== 'ok').length;

  if (countBadge) countBadge.textContent = `${dangerCount} anomalie(s)`;
  if (tabCount) tabCount.textContent = dangerCount;

  if (state.importedReport) {
    if (scoreTitle) scoreTitle.textContent = "Rapport de Logs Windows Charge !";
    if (scoreDesc) scoreDesc.textContent = `Scanné le ${state.importedReport.timestamp || 'récemment'}. ${dangerCount} problème(s) de logs/latence DPC identifié(s).`;
  } else {
    if (scoreTitle) scoreTitle.textContent = "Logs Windows prêts à analyser";
    if (scoreDesc) scoreDesc.textContent = "Copiez la commande ci-dessous ou glissez votre fichier audio_glitch_report.json pour voir l'analyse complète.";
  }

  if (scoreVal) scoreVal.textContent = Math.max(20, 100 - (dangerCount * 25));
  if (scoreCircle) scoreCircle.style.borderColor = dangerCount > 0 ? 'var(--status-danger)' : 'var(--status-ok)';
}

function renderRecommendations() {
  const container = document.getElementById('recommendations-container');
  if (!container) return;
  container.innerHTML = '';

  const findings = getActiveFindings();

  findings.forEach(f => {
    const card = document.createElement('div');
    card.className = `rec-card status-${f.status || 'warning'}`;

    let badgeClass = f.status === 'ok' ? 'ok' : (f.status === 'danger' ? 'danger' : 'warning');
    let badgeText = f.status === 'ok' ? '✓ Conforme' : (f.status === 'danger' ? '✖ Log Erreur / DPC' : '⚠ À Corriger');

    card.innerHTML = `
      <div class="rec-header">
        <div class="rec-title-group">
          <span class="rec-category">${f.category || 'Anomalie Windows'}</span>
          <h4>${f.title}</h4>
        </div>
        <span class="status-badge ${badgeClass}">${badgeText}</span>
      </div>

      <div class="comparison-box-strict">
        <div class="strict-line-action">
          <span>👉 ${f.actionText}</span>
        </div>
        <div class="strict-line-actuel">
          <span>Actuel : ${f.actuelText}</span>
        </div>
      </div>

      <div class="rec-cause">
        <strong>Constaté dans les logs :</strong> ${f.cause}
      </div>

      <div class="rec-fix">
        <strong>Solution pas-à-pas :</strong> ${f.fix}
      </div>
    `;

    container.appendChild(card);
  });

  updateSummary();
}

// File Import Handler
function handleFileImport(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      state.importedReport = data;
      renderRecommendations();
      alert("Rapport de logs audio_glitch_report.json chargé avec succès !");
    } catch (err) {
      alert("Erreur lors de la lecture du fichier JSON : " + err.message);
    }
  };
  reader.readAsText(file);
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

  const srEl = document.getElementById('detected-sample-rate');
  const latEl = document.getElementById('detected-latency');
  const devEl = document.getElementById('detected-output-device');

  if (srEl) srEl.textContent = `${state.detectedSampleRate} Hz`;
  if (latEl) latEl.textContent = `~${state.detectedLatency.toFixed(1)} ms`;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(d => d.kind === 'audiooutput');
    if (outputs.length > 0 && outputs[0].label && devEl) {
      devEl.textContent = outputs[0].label.substring(0, 22) + '...';
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
  const findings = getActiveFindings();
  const dateStr = new Date().toLocaleString('fr-FR');

  let text = `=====================================================\n`;
  text += `   BILAN AUDIOFIX — LOGS WINDOWS & LATENCYMON\n`;
  text += `   Date : ${dateStr}\n`;
  text += `=====================================================\n\n`;

  findings.forEach((f, idx) => {
    text += `${idx + 1}. 👉 ${f.actionText}\n`;
    text += `   * Constaté : ${f.actuelText}\n`;
    text += `   * Cause    : ${f.cause}\n`;
    text += `   * Solution : ${f.fix ? f.fix.replace(/<[^>]*>?/gm, '') : ''}\n\n`;
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
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Drag and drop setup
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFileImport(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) handleFileImport(e.dataTransfer.files[0]);
    });
  }

  // Audio Buttons
  const startBtn = document.getElementById('btn-start-audio');
  if (startBtn) startBtn.addEventListener('click', initAudioEngine);

  const freqSlider = document.getElementById('freq-slider');
  if (freqSlider) {
    freqSlider.addEventListener('input', (e) => {
      const fVal = document.getElementById('freq-val');
      if (fVal) fVal.textContent = `${e.target.value} Hz`;
      if (state.activeSource && state.activeSource.frequency) {
        state.activeSource.frequency.setValueAtTime(e.target.value, state.audioCtx.currentTime);
      }
    });
  }

  const volSlider = document.getElementById('volume-slider');
  if (volSlider) {
    volSlider.addEventListener('input', (e) => {
      const vVal = document.getElementById('vol-val');
      if (vVal) vVal.textContent = `${e.target.value}%`;
      if (state.masterGain) {
        state.masterGain.gain.setValueAtTime(e.target.value / 100, state.audioCtx.currentTime);
      }
    });
  }

  const playToneBtn = document.getElementById('btn-play-tone');
  if (playToneBtn) playToneBtn.addEventListener('click', () => playTone(parseInt(freqSlider ? freqSlider.value : 440, 10)));
  
  const sweepBtn = document.getElementById('btn-play-sweep');
  if (sweepBtn) sweepBtn.addEventListener('click', playSweep);

  const stopBtn = document.getElementById('btn-stop-audio');
  if (stopBtn) stopBtn.addEventListener('click', stopActiveSource);

  // Report Modal
  const modal = document.getElementById('modal-report');
  const exportBtn = document.getElementById('btn-export-report');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const repText = document.getElementById('report-text');
      if (repText) repText.textContent = generateReportText();
      if (modal) modal.classList.add('active');
    });
  }

  const closeModalBtn = document.getElementById('btn-close-modal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal && modal.classList.remove('active'));

  const copyReportBtn = document.getElementById('btn-copy-report');
  if (copyReportBtn) {
    copyReportBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(generateReportText()).then(() => alert("Bilan copié !"));
    });
  }

  const downloadReportBtn = document.getElementById('btn-download-report');
  if (downloadReportBtn) {
    downloadReportBtn.addEventListener('click', () => {
      const blob = new Blob([generateReportText()], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `AudioFix_Bilan_${Date.now()}.txt`;
      a.click();
    });
  }

  // Initial Render
  renderRecommendations();
  startCanvasVisualizer();
});
