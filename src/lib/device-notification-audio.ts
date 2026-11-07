"use client";

const NOTIFICATION_SOUND = "/sounds/web-whatsapp.mp3";

let notificationAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

function getNotificationAudio() {
  if (typeof window === "undefined") return null;
  if (notificationAudio) return notificationAudio;

  notificationAudio = new Audio(NOTIFICATION_SOUND);
  notificationAudio.preload = "auto";
  notificationAudio.volume = 0.8;
  return notificationAudio;
}

export async function unlockDeviceNotificationAudio() {
  if (audioUnlocked) return;
  const audio = getNotificationAudio();
  if (!audio) return;

  audio.muted = true;
  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked = true;
  } catch {
    audioUnlocked = false;
  } finally {
    audio.muted = false;
  }
}

export async function playDeviceNotificationChime() {
  const audio = getNotificationAudio();
  if (!audio) return;

  if (!audioUnlocked) await unlockDeviceNotificationAudio();
  if (!audioUnlocked) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.8;
  await audio.play().catch(() => undefined);
}
