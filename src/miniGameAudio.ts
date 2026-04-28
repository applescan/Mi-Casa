import {
  AUDIO_MUTED_EVENT,
  getAudioMutedFromEvent,
  readAudioMuted,
} from "./audioState";

export type MiniGameAudioId =
  | "rockPaperScissors"
  | "bubblePop"
  | "flyCatch"
  | "remoteHunt"
  | "laundrySort"
  | "dustBunnyChase"
  | "recipeRush"
  | "waterPlants";

const miniGameAudioConfig: Record<
  MiniGameAudioId,
  { src: string; volume: number }
> = {
  rockPaperScissors: {
    src: "/assets/rock-paper-clash.mp3",
    volume: 0.36,
  },
  bubblePop: {
    src: "/assets/bubble-pop.mp3",
    volume: 0.36,
  },
  flyCatch: {
    src: "/assets/rotten-pantry.mp3",
    volume: 0.36,
  },
  remoteHunt: {
    src: "/assets/sofa.mp3",
    volume: 0.36,
  },
  laundrySort: {
    src: "/assets/pocket-fold-party.mp3",
    volume: 0.36,
  },
  dustBunnyChase: {
    src: "/assets/dust-mite.mp3",
    volume: 0.36,
  },
  recipeRush: {
    src: "/assets/pantry.mp3",
    volume: 0.36,
  },
  waterPlants: {
    src: "/assets/sprout.mp3",
    volume: 0.38,
  },
};

const miniGameAudioMap = new Map<MiniGameAudioId, HTMLAudioElement>();

const getMiniGameAudio = (gameId: MiniGameAudioId) => {
  let audio = miniGameAudioMap.get(gameId);

  if (audio) return audio;

  const config = miniGameAudioConfig[gameId];
  audio = new Audio(config.src);
  audio.loop = true;
  audio.volume = config.volume;
  audio.muted = readAudioMuted();
  audio.preload = "auto";
  audio.load();

  miniGameAudioMap.set(gameId, audio);
  return audio;
};

export const preloadMiniGameAudio = () => {
  if (typeof window === "undefined") return;

  (Object.keys(miniGameAudioConfig) as MiniGameAudioId[]).forEach((gameId) => {
    getMiniGameAudio(gameId);
  });
};

export const startMiniGameAudio = (gameId: MiniGameAudioId) => {
  if (typeof window === "undefined") return () => {};

  window.dispatchEvent(new Event("mi-casa:pause-main-bgm"));

  const audio = getMiniGameAudio(gameId);
  audio.muted = readAudioMuted();
  audio.pause();
  audio.currentTime = 0;

  void audio.play().catch(() => {
    // Browsers can still reject playback even when the audio is already preloaded.
  });

  const updateMuted = (event: Event) => {
    const muted = getAudioMutedFromEvent(event);
    if (muted === null) return;

    audio.muted = muted;
  };

  window.addEventListener(AUDIO_MUTED_EVENT, updateMuted);

  return () => {
    window.removeEventListener(AUDIO_MUTED_EVENT, updateMuted);
    audio.pause();
    audio.currentTime = 0;
    window.dispatchEvent(new Event("mi-casa:resume-main-bgm"));
  };
};
