import React, { useEffect, useRef, useState } from "react";
import { dialogueData, scaleFactor, setCamScale } from "./constants";
import DialogueBox from "./dialogBox";
import { rockPaperScissors } from "./rockPaperScissors";
import { bubblePop } from "./bubblePop";
import { flyCatch } from "./flyCatch";
import { remoteHunt } from "./remoteHunt";
import { laundrySort } from "./laundrySort";
import { dustBunnyChase } from "./dustBunnyChase";
import { recipeRush } from "./recipeRush";
import { waterPlants } from "./waterPlants";
import { GameObj } from "kaboom";
import { initKaboomWithCanvas, k } from "./kaboomCtx";
import { primeMiniGameAudio } from "./miniGameAudio";
import {
  dispatchAudioMuted,
  readAudioMuted,
  writeAudioMuted,
} from "./audioState";

type DialogueKeys = keyof typeof dialogueData;
type MiniGameScene =
  | "rockPaperScissors"
  | "bubblePop"
  | "flyCatch"
  | "remoteHunt"
  | "laundrySort"
  | "dustBunnyChase"
  | "recipeRush"
  | "waterPlants";
type ReturnMode = "default" | "awayFromBoundary";

const getViewportSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const shouldUseLandscapeMiniGames = () =>
  window.matchMedia("(pointer: coarse)").matches &&
  Math.max(window.innerWidth, window.innerHeight) <= 1100;

const requestLandscapeOrientation = async () => {
  const orientation = window.screen?.orientation as
    | {
        lock?: (orientation: "landscape") => Promise<void>;
      }
    | undefined;

  if (typeof orientation?.lock !== "function") return;

  try {
    await orientation.lock("landscape");
  } catch {
    // Orientation lock is not available on every mobile browser.
  }
};

const releaseLandscapeOrientation = () => {
  const orientation = window.screen?.orientation as
    | {
        unlock?: () => void;
      }
    | undefined;

  try {
    orientation?.unlock?.();
  } catch {
    // Ignore unsupported unlock calls.
  }
};

const GameScene: React.FC = () => {
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [isDialogueVisible, setIsDialogueVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(() => readAudioMuted());
  const [pendingMiniGame, setPendingMiniGame] = useState<MiniGameScene | null>(
    null
  );
  const [viewportSize, setViewportSize] = useState(() =>
    typeof window === "undefined" ? { width: 0, height: 0 } : getViewportSize()
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<GameObj | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const bgmWasPlayingBeforePauseRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  const isDialogueVisibleRef = useRef(false);
  const savedPlayerStateRef = useRef<{
    pos: { x: number; y: number };
    direction: string;
    returnMode: ReturnMode;
  } | null>(null);

  useEffect(() => {
    isDialogueVisibleRef.current = isDialogueVisible;
  }, [isDialogueVisible]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewportSize = () => {
      setViewportSize(getViewportSize());
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("orientationchange", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("orientationchange", updateViewportSize);
    };
  }, []);

  const launchMiniGame = (sceneName: MiniGameScene) => {
    setPendingMiniGame(null);
    void requestLandscapeOrientation();
    k.go(sceneName);
  };

  useEffect(() => {
    if (!pendingMiniGame) return;

    if (!shouldUseLandscapeMiniGames() || viewportSize.width >= viewportSize.height) {
      launchMiniGame(pendingMiniGame);
    }
  }, [pendingMiniGame, viewportSize]);

  useEffect(() => {
    if (canvasRef.current) {
      initKaboomWithCanvas(canvasRef.current);
    }

    const bgm = new Audio("/assets/bgm.mp3");
    bgm.loop = true;
    bgm.volume = 0.28;
    bgm.muted = isMutedRef.current;
    bgm.preload = "auto";
    bgm.load();
    bgmRef.current = bgm;
    k.volume(isMutedRef.current ? 0 : 1);

    const startBgm = () => {
      if (!bgmRef.current) return;

      void bgmRef.current.play().catch(() => {
        // Browsers can still block audio if the gesture is not accepted.
      });

      window.removeEventListener("pointerdown", startBgm);
      window.removeEventListener("keydown", startBgm);
      window.removeEventListener("touchstart", startBgm);
    };

    const pauseBgm = () => {
      if (!bgmRef.current) return;

      bgmWasPlayingBeforePauseRef.current = !bgmRef.current.paused;
      bgmRef.current.pause();
    };

    const resumeBgm = () => {
      if (!bgmRef.current || !bgmWasPlayingBeforePauseRef.current) return;

      void bgmRef.current.play().catch(() => {
        // Keep quiet if the browser rejects playback.
      });
    };

    window.addEventListener("pointerdown", startBgm, { once: true });
    window.addEventListener("keydown", startBgm, { once: true });
    window.addEventListener("touchstart", startBgm, { once: true });
    window.addEventListener("mi-casa:pause-main-bgm", pauseBgm);
    window.addEventListener("mi-casa:resume-main-bgm", resumeBgm);

    k.loadSprite("spritesheet", "./Itty_Bitty_6_Walk_sprites.png", {
      sliceX: 15,
      sliceY: 8,
      anims: {
        "idle-down": 66,
        "walk-down": { from: 66, to: 68, loop: true, speed: 6 },
        "idle-side": 96,
        "walk-side": { from: 96, to: 98, loop: true, speed: 6 },
        "idle-up": 111,
        "walk-up": { from: 111, to: 113, loop: true, speed: 6 },
      },
    });

    k.loadSprite("map", "./mi-casa.png");

    k.scene(
      "main",
      async (context?: {
        movePlayerBack?: boolean;
        fromMiniGame?: boolean;
      }) => {
        setPendingMiniGame(null);
        releaseLandscapeOrientation();
        k.setBackground(k.Color.fromHex("#3a403b"));
        const mapData = await (await fetch("./mi-casa.json")).json();
        const layers = mapData.layers;

        const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]);

        const playerScaleFactor = 6;

        const player = k.make([
          k.sprite("spritesheet", { anim: "idle-down" }),
          k.area({
            shape: new k.Rect(k.vec2(0, 3), 10, 10),
          }),
          k.body(),
          k.anchor("center"),
          k.pos(),
          k.scale(playerScaleFactor),
          {
            speed: 250,
            direction: "down",
            isInDialogue: false,
          },
          "player",
        ]);

        playerRef.current = player;

        const handleDialogue = (boundaryName: DialogueKeys) => {
          const startMiniGame = (
            sceneName: MiniGameScene,
            returnMode: ReturnMode = "default"
          ) => {
            savedPlayerStateRef.current = {
              pos: { x: player.pos.x, y: player.pos.y },
              direction: player.direction,
              returnMode,
            };

            primeMiniGameAudio(sceneName);
            player.isInDialogue = true;

            if (
              typeof window !== "undefined" &&
              shouldUseLandscapeMiniGames() &&
              window.innerHeight > window.innerWidth
            ) {
              setPendingMiniGame(sceneName);
              return;
            }

            launchMiniGame(sceneName);
          };

          if (boundaryName === "fish") {
            startMiniGame("rockPaperScissors");
          } else if (boundaryName === "bath") {
            startMiniGame("bubblePop");
          } else if (boundaryName === "food") {
            startMiniGame("flyCatch");
          } else if (boundaryName === "sofa") {
            startMiniGame("remoteHunt");
          } else if (boundaryName === "clothes") {
            startMiniGame("laundrySort");
          } else if (boundaryName === "pet") {
            startMiniGame("dustBunnyChase");
          } else if (boundaryName === "stove") {
            startMiniGame("recipeRush");
          } else if (boundaryName === "succulent") {
            startMiniGame("waterPlants", "awayFromBoundary");
          } else if (boundaryName && dialogueData[boundaryName]) {
            setDialogue(dialogueData[boundaryName]);
            setIsDialogueVisible(true);
            player.isInDialogue = true;
          }
        };

        for (const layer of layers) {
          if (layer.name === "boundaries") {
            for (const boundary of layer.objects) {
              map.add([
                k.area({
                  shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
                }),
                k.body({ isStatic: true }),
                k.pos(boundary.x, boundary.y),
                { name: boundary.name },
              ]);

              player.onCollide((obj) => {
                const boundaryName = obj.name as DialogueKeys;

                if (boundaryName && dialogueData[boundaryName]) {
                  if (!player.isInDialogue) {
                    handleDialogue(boundaryName);
                  }
                }
              });
            }
          }

          if (layer.name === "spawnpoints") {
            for (const entity of layer.objects) {
              if (entity.name === "player") {
                player.pos = k.vec2(
                  (map.pos.x + entity.x) * scaleFactor,
                  (map.pos.y + entity.y) * scaleFactor
                );
                k.add(player);
              }
            }
          }
        }

        if (context?.fromMiniGame && savedPlayerStateRef.current) {
          const savedPlayerState = savedPlayerStateRef.current;
          player.pos = k.vec2(savedPlayerState.pos.x, savedPlayerState.pos.y);
          player.direction = savedPlayerState.direction;

          if (context?.movePlayerBack) {
            const returnOffset =
              savedPlayerState.returnMode === "awayFromBoundary"
                ? savedPlayerState.direction === "up"
                  ? k.vec2(0, 80)
                  : savedPlayerState.direction === "down"
                    ? k.vec2(0, -80)
                    : savedPlayerState.direction === "left"
                      ? k.vec2(80, 0)
                      : k.vec2(-80, 0)
                : k.vec2(60, 0);

            player.pos = player.pos.add(returnOffset);
          }

          // Prevent immediate re-trigger when returning onto a boundary.
          player.isInDialogue = true;
          k.wait(0.4, () => {
            player.isInDialogue = false;
          });

          if (player.direction === "down") {
            player.play("idle-down");
          } else if (player.direction === "up") {
            player.play("idle-up");
          } else {
            player.play("idle-side");
            player.flipX = player.direction === "left";
          }
        }

        setCamScale(k);

        k.onResize(() => {
          setCamScale(k);
        });

        k.onUpdate(() => {
          // Prevent player movement and animations during dialogue
          if (isDialogueVisibleRef.current) {
            player.stop();
            return;
          }

          // Camera follows the player
          k.camPos(player.worldPos().x, player.worldPos().y - 100);
        });

        const stopAnims = () => {
          if (isDialogueVisibleRef.current) return;

          if (player.direction === "down") {
            player.play("idle-down");
          } else if (player.direction === "up") {
            player.play("idle-up");
          } else if (player.direction === "left") {
            player.play("idle-side");
            player.flipX = true;
          } else if (player.direction === "right") {
            player.play("idle-side");
            player.flipX = false;
          }
        };

        k.onMouseRelease(stopAnims);
        k.onKeyRelease(stopAnims);

        k.onMouseDown((mouseBtn) => {
          if (mouseBtn !== "left" || player.isInDialogue) return;

          const worldMousePos = k.toWorld(k.mousePos());
          player.moveTo(worldMousePos, player.speed);

          const mouseAngle = player.pos.angle(worldMousePos);

          const lowerBound = 50;
          const upperBound = 125;

          if (
            mouseAngle > lowerBound &&
            mouseAngle < upperBound &&
            player.curAnim() !== "walk-up"
          ) {
            player.play("walk-up");
            player.direction = "up";
          } else if (
            mouseAngle < -lowerBound &&
            mouseAngle > -upperBound &&
            player.curAnim() !== "walk-down"
          ) {
            player.play("walk-down");
            player.direction = "down";
          } else if (Math.abs(mouseAngle) > upperBound) {
            player.flipX = false;
            if (player.curAnim() !== "walk-side") player.play("walk-side");
            player.direction = "right";
          } else if (Math.abs(mouseAngle) < lowerBound) {
            player.flipX = true;
            if (player.curAnim() !== "walk-side") player.play("walk-side");
            player.direction = "left";
          }
        });

        k.onKeyDown(() => {
          if (player.isInDialogue) return;

          const keyMap = [
            k.isKeyDown("right"),
            k.isKeyDown("left"),
            k.isKeyDown("up"),
            k.isKeyDown("down"),
          ];

          let nbOfKeyPressed = 0;
          keyMap.forEach((isKeyDown) => {
            if (isKeyDown) nbOfKeyPressed++;
          });

          if (nbOfKeyPressed > 1 || player.isInDialogue) {
            return;
          }

          // Movement logic for keyboard inputs
          if (keyMap[0]) {
            player.flipX = false;
            if (player.curAnim() !== "walk-side") player.play("walk-side");
            player.direction = "right";
            player.move(player.speed, 0);
          } else if (keyMap[1]) {
            player.flipX = true;
            if (player.curAnim() !== "walk-side") player.play("walk-side");
            player.direction = "left";
            player.move(-player.speed, 0);
          } else if (keyMap[2]) {
            if (player.curAnim() !== "walk-up") player.play("walk-up");
            player.direction = "up";
            player.move(0, -player.speed);
          } else if (keyMap[3]) {
            if (player.curAnim() !== "walk-down") player.play("walk-down");
            player.direction = "down";
            player.move(0, player.speed);
          }
        });
      }
    );

    rockPaperScissors();
    bubblePop();
    flyCatch();
    remoteHunt();
    laundrySort();
    dustBunnyChase();
    recipeRush();
    waterPlants();
    k.go("main");

    return () => {
      window.removeEventListener("pointerdown", startBgm);
      window.removeEventListener("keydown", startBgm);
      window.removeEventListener("touchstart", startBgm);
      window.removeEventListener("mi-casa:pause-main-bgm", pauseBgm);
      window.removeEventListener("mi-casa:resume-main-bgm", resumeBgm);
      releaseLandscapeOrientation();
      bgm.pause();
      bgm.currentTime = 0;
      bgmRef.current = null;
      k.go("");
    };
  }, []);

  const closeDialogue = () => {
    setIsDialogueVisible(false);
    setDialogue(null);
    if (playerRef.current) {
      playerRef.current.isInDialogue = false;
    }
  };

  const toggleMute = () => {
    setIsMuted((currentMuted) => {
      const nextMuted = !currentMuted;

      isMutedRef.current = nextMuted;
      writeAudioMuted(nextMuted);
      dispatchAudioMuted(nextMuted);

      if (bgmRef.current) {
        bgmRef.current.muted = nextMuted;
      }

      k.volume(nextMuted ? 0 : 1);

      return nextMuted;
    });
  };

  const cancelPendingMiniGame = () => {
    setPendingMiniGame(null);
    if (playerRef.current) {
      playerRef.current.isInDialogue = false;
    }
  };

  const showLandscapePrompt =
    pendingMiniGame !== null &&
    shouldUseLandscapeMiniGames() &&
    viewportSize.height > viewportSize.width;

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        aria-pressed={isMuted}
        aria-label={isMuted ? "Unmute sound" : "Mute sound"}
        onClick={toggleMute}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          position: "fixed",
          top: "12px",
          right: "12px",
          zIndex: 1200,
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          border: "3px solid #242424",
          borderRadius: "8px",
          backgroundColor: isMuted ? "#242424" : "#fff",
          color: isMuted ? "#fff" : "#242424",
          boxShadow: "4px 4px 0 #242424",
          cursor: "pointer",
        }}
      >
        <svg
          aria-hidden="true"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 9h4l5-5v16l-5-5H4z" />
          {isMuted ? (
            <>
              <path d="M18 9l4 4" />
              <path d="M22 9l-4 4" />
            </>
          ) : (
            <>
              <path d="M17 8c1.2 1.1 1.8 2.4 1.8 4s-.6 2.9-1.8 4" />
              <path d="M20 5c2 2 3 4.3 3 7s-1 5-3 7" />
            </>
          )}
        </svg>
      </button>
      {showLandscapePrompt ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background:
              "linear-gradient(180deg, rgba(18, 18, 18, 0.92), rgba(36, 36, 36, 0.96))",
          }}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              padding: "24px 20px",
              border: "4px solid #242424",
              borderRadius: "16px",
              backgroundColor: "#fff8df",
              boxShadow: "8px 8px 0 #242424",
              textAlign: "center",
              color: "#242424",
              fontFamily: "'Press Start 2P', cursive",
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontSize: "44px", marginBottom: "18px" }}>↻</div>
            <p style={{ margin: 0, fontSize: "12px" }}>
              Rotate your phone to landscape.
            </p>
            <p style={{ margin: "14px 0 0", fontSize: "10px" }}>
              The mini-game will start automatically when your phone is sideways.
            </p>
            <button
              type="button"
              onClick={cancelPendingMiniGame}
              style={{
                marginTop: "22px",
                padding: "12px 16px",
                border: "3px solid #242424",
                borderRadius: "10px",
                backgroundColor: "#f6d669",
                color: "#242424",
                boxShadow: "4px 4px 0 #242424",
                fontFamily: "'Press Start 2P', cursive",
                fontSize: "10px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <canvas ref={canvasRef} id="game-canvas"></canvas>
      <DialogueBox
        text={dialogue || ""}
        onDisplayEnd={closeDialogue}
        isVisible={isDialogueVisible}
      />
    </div>
  );
};

export default GameScene;
