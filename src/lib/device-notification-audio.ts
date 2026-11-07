"use client";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (audioContext && audioContext.state !== "closed") return audioContext;
  const AudioContextClass =
    window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

export async function unlockDeviceNotificationAudio() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") await context.resume().catch(() => undefined);
  if (context.state !== "running") return;

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = context.createBuffer(1, 1, context.sampleRate);
  gain.gain.value = 0;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}

export async function playDeviceNotificationChime() {
  const context = getAudioContext();
  if (!context) return;

  await unlockDeviceNotificationAudio();
  if (context.state !== "running") return;

  const playTone = (frequency: number, startOffset: number, duration: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + startOffset;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  playTone(660, 0, 0.18);
  playTone(880, 0.16, 0.28);
}
