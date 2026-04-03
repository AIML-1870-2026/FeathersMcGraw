// audio.js — Web Audio API ambient hum + alert ping

let audioCtx = null;
let ambientOsc = null;
let ambientGain = null;
let muted = localStorage.getItem('sentinel_mute') === 'true';
let audioStarted = false;

function initAudio() {
  if (audioStarted) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    ambientOsc = audioCtx.createOscillator();
    ambientGain = audioCtx.createGain();
    ambientOsc.type = 'sine';
    ambientOsc.frequency.value = 60;
    ambientGain.gain.value = muted ? 0 : 0.03;
    ambientOsc.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    ambientOsc.start();
    audioStarted = true;
  } catch (e) {
    console.warn('Audio unavailable:', e);
  }
}

function playPing() {
  if (muted || !audioCtx) return;
  try {
    // Tone 1: 880Hz for 80ms
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.08);

    // Tone 2: 660Hz for 120ms, offset 60ms
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.frequency.value = 660;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.10, audioCtx.currentTime + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(audioCtx.currentTime + 0.06);
    osc2.stop(audioCtx.currentTime + 0.20);
  } catch (e) {}
}

function toggleMute() {
  muted = !muted;
  localStorage.setItem('sentinel_mute', muted);
  if (ambientGain) {
    ambientGain.gain.setTargetAtTime(muted ? 0 : 0.03, audioCtx.currentTime, 0.1);
  }
  updateMuteButton();
}

function updateMuteButton() {
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = muted ? '♪ OFF' : '♪ ON';
}

// Initialize audio on first user interaction
document.addEventListener('click', () => { initAudio(); }, { once: true });
document.addEventListener('keydown', () => { initAudio(); }, { once: true });
