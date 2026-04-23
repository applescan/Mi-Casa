export const AUDIO_MUTED_STORAGE_KEY = "mi-casa:audio-muted";
export const AUDIO_MUTED_EVENT = "mi-casa:set-muted";

let audioMuted = false;

export const readAudioMuted = () => {
  if (typeof window === "undefined") return audioMuted;

  try {
    const savedValue = window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY);
    if (savedValue === null) return audioMuted;

    audioMuted = savedValue === "true";
    return audioMuted;
  } catch {
    return audioMuted;
  }
};

export const writeAudioMuted = (muted: boolean) => {
  audioMuted = muted;

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, String(muted));
  } catch {
    // Persisting the preference is best-effort.
  }
};

export const dispatchAudioMuted = (muted: boolean) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(AUDIO_MUTED_EVENT, {
      detail: { muted },
    })
  );
};

export const getAudioMutedFromEvent = (event: Event) => {
  const detail = (event as CustomEvent<{ muted?: unknown }>).detail;
  return typeof detail?.muted === "boolean" ? detail.muted : null;
};
