"use client";

const NOTIFICATION_SOUND = "/sounds/web-whatsapp.mp3";

let audioContext: AudioContext | null = null;
let notificationBuffer: Promise<AudioBuffer | null> | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (audioContext && audioContext.state !== "closed") return audioContext;

  const AudioContextClass =
    window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

function getNotificationBuffer(context: AudioContext) {
  notificationBuffer ??= fetch(NOTIFICATION_SOUND)
    .then((response) => {
      if (!response.ok) throw new Error("Không tải được âm báo.");
      return response.arrayBuffer();
    })
    .then((buffer) => context.decodeAudioData(buffer))
    .catch(() => null);
  return notificationBuffer;
}

export async function unlockDeviceNotificationAudio() {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") await context.resume().catch(() => undefined);
  if (context.state !== "running") return;

  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, context.sampleRate);
  source.connect(context.destination);
  source.start();
  void getNotificationBuffer(context);
}

export async function playDeviceNotificationChime() {
  const context = getAudioContext();
  if (!context) return;

  await unlockDeviceNotificationAudio();
  if (context.state !== "running") return;

  const buffer = await getNotificationBuffer(context);
  if (!buffer) return;

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = 0.8;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}
