// src/audio.js — Sonidos ambientales (volumen reducido)
let ctx = null;
let masterGain = null;

export function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.18; // ← Volumen global reducido
  masterGain.connect(ctx.destination);
}

export function startAmbience() {
  if (!ctx) return;
  playWind();
  playDrone(55,  0.03);
  playDrone(82,  0.02);
  playDrone(110, 0.015);
  scheduleCreaks();
  scheduleHeartbeat();
}

function playWind() {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop   = true;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 0.4;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 600;

  const gain = ctx.createGain();
  gain.gain.value = 0.1;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  source.connect(bp).connect(lp).connect(gain).connect(masterGain);
  source.start();
}

function playDrone(freq, vol) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const dist = ctx.createWaveShaper();

  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
  }
  dist.curve = curve;

  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  gain.gain.value = vol;

  const vib = ctx.createOscillator();
  vib.frequency.value = 0.08 + Math.random() * 0.05;
  const vibGain = ctx.createGain();
  vibGain.gain.value = freq * 0.003;
  vib.connect(vibGain);
  vibGain.connect(osc.frequency);
  vib.start();

  osc.connect(dist).connect(gain).connect(masterGain);
  osc.start();
}

function scheduleCreaks() {
  function creak() {
    const duration = 0.3 + Math.random() * 0.4;
    const freq     = 200 + Math.random() * 400;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const now  = ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain).connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);

    setTimeout(creak, 6000 + Math.random() * 14000);
  }
  setTimeout(creak, 3000 + Math.random() * 5000);
}

function scheduleHeartbeat() {
  function beat() {
    const now = ctx.currentTime;
    function pulse(t) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain).connect(masterGain);
      osc.start(t); osc.stop(t + 0.18);
    }
    pulse(now);
    pulse(now + 0.22);
    setTimeout(beat, 1090);
  }
  setTimeout(beat, 8000);
}

export function playPickup() {
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const t    = now + i * 0.08;
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(masterGain);
    osc.start(t); osc.stop(t + 0.3);
  });
}

export function playWinSound() {
  if (!ctx) return;
  const now = ctx.currentTime;
  [261, 329, 392, 523, 659].forEach((f, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const t    = now + i * 0.15;
    osc.type = 'triangle';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain).connect(masterGain);
    osc.start(t); osc.stop(t + 0.6);
  });
}

export function playGameOver() {
  if (!ctx) return;
  const now = ctx.currentTime;
  // Sonido de captura — descendente y grave
  [220, 165, 110, 82].forEach((f, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const t    = now + i * 0.2;
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain).connect(masterGain);
    osc.start(t); osc.stop(t + 0.5);
  });
}