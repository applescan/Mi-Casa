import { k } from "./kaboomCtx";
import {
  AUDIO_MUTED_EVENT,
  getAudioMutedFromEvent,
  readAudioMuted,
} from "./audioState";
import { addLeaderboardEntry } from "./leaderboard";
import { addLeaderboardDisplay } from "./miniGameHelpers";

export const remoteHunt = () => {
  k.loadRoot("/assets/");
  k.loadSprite("quit", "quit.webp");
  k.loadSprite("livingRoom", "couch.jpg");
  k.loadSprite("remote", "remote.svg");
  k.loadSprite("cushion", "cushion.png");

  k.scene("remoteHunt", () => {
    window.dispatchEvent(new Event("mi-casa:pause-main-bgm"));

    const remoteBgm = new Audio("/assets/sofa.mp3");
    remoteBgm.loop = true;
    remoteBgm.volume = 0.36;
    remoteBgm.muted = readAudioMuted();
    remoteBgm.preload = "auto";

    void remoteBgm.play().catch(() => {
      // The browser may reject playback if it does not count the scene change as a gesture.
    });

    const updateMuted = (event: Event) => {
      const muted = getAudioMutedFromEvent(event);
      if (muted === null) return;

      remoteBgm.muted = muted;
    };

    window.addEventListener(AUDIO_MUTED_EVENT, updateMuted);

    k.onSceneLeave(() => {
      window.removeEventListener(AUDIO_MUTED_EVENT, updateMuted);
      remoteBgm.pause();
      remoteBgm.currentTime = 0;
      window.dispatchEvent(new Event("mi-casa:resume-main-bgm"));
    });

    const durationSeconds = 15;
    const cushionCount = 6;
    let timeLeft = durationSeconds;
    let foundRemotes = 0;
    let misses = 0;
    let remoteIndex = 0;
    let isRunning = true;
    let roundLocked = false;

    const scaleFactor = Math.min(k.width() / 640, k.height() / 480);
    const textSize = Math.max(18 * scaleFactor, 16);
    const cushionZoom = 1.5;
    const cushionWidth = Math.max(116 * scaleFactor, 84) * cushionZoom;
    const cushionHeight = cushionWidth * 0.82;
    const backgroundZoom = 1;

    const background = k.add([
      k.sprite("livingRoom"),
      k.pos(0, 0),
      k.scale(1),
      k.z(-10),
    ]);
    const backgroundNativeSize = { w: background.width, h: background.height };

    const resizeBackground = () => {
      const scale =
        Math.max(
          k.width() / backgroundNativeSize.w,
          k.height() / backgroundNativeSize.h
        ) * backgroundZoom;
      background.scale = k.vec2(scale, scale);
      const scaledW = backgroundNativeSize.w * scale;
      const scaledH = backgroundNativeSize.h * scale;
      background.pos = k.vec2(
        (k.width() - scaledW) / 2,
        (k.height() - scaledH) / 2
      );
    };

    resizeBackground();
    k.onResize(resizeBackground);

    k.add([
      k.rect(k.width(), 132 * scaleFactor),
      k.pos(0, 0),
      k.color(255, 255, 255),
      k.opacity(0.3),
      k.z(-5),
    ]);

    k.add([
      k.text("Find the remote!", { size: textSize * 1.2 }),
      k.pos(k.width() / 2, 46 * scaleFactor),
      k.anchor("center"),
      k.color(24, 24, 24),
    ]);

    const scoreText = k.add([
      k.text(`Found: ${foundRemotes}`, { size: textSize }),
      k.pos(20 * scaleFactor, 92 * scaleFactor),
      k.color(24, 24, 24),
    ]);

    const timerText = k.add([
      k.text(`Time: ${timeLeft.toFixed(1)}s`, { size: textSize }),
      k.pos(k.width() - 20 * scaleFactor, 92 * scaleFactor),
      k.anchor("topright"),
      k.color(24, 24, 24),
    ]);

    const missText = k.add([
      k.text(`Misses: ${misses}`, { size: Math.max(textSize * 0.75, 12) }),
      k.pos(k.width() / 2, 94 * scaleFactor),
      k.anchor("top"),
      k.color(24, 24, 24),
    ]);

    const createQuitButton = (x: number, y: number) => {
      k.add([
        k.sprite("quit", {
          width: 200 * scaleFactor,
          height: 100 * scaleFactor,
        }),
        k.pos(x, y),
        k.anchor("center"),
        "button",
        k.area(),
        k.z(100),
        {
          clickAction: () => {
            k.go("main", { fromMiniGame: true, movePlayerBack: true });
          },
        },
      ]);
    };

    const revealRemote = (x: number, y: number) => {
      const remote = k.add([
        k.sprite("remote", {
          width: cushionWidth * 0.36,
          height: cushionHeight * 0.74,
        }),
        k.pos(x, y - cushionHeight * 0.28),
        k.anchor("center"),
        k.rotate(k.rand(-18, 18)),
        k.z(8),
        "remoteResult",
      ]);

      k.wait(0.5, () => {
        if (remote.exists()) remote.destroy();
      });
    };

    const createRound = () => {
      if (!isRunning) return;

      k.get("cushion").forEach((cushion) => cushion.destroy());
      k.get("remoteResult").forEach((remote) => remote.destroy());

      remoteIndex = Math.floor(k.rand(0, cushionCount));
      roundLocked = false;

      const columns = k.width() < 520 ? 2 : 3;
      const rows = Math.ceil(cushionCount / columns);
      const gapX = Math.min(42 * scaleFactor, 28);
      const gapY = Math.min(34 * scaleFactor, 24);
      const boardWidth = columns * cushionWidth + (columns - 1) * gapX;
      const boardHeight = rows * cushionHeight + (rows - 1) * gapY;
      const startX = (k.width() - boardWidth) / 2 + cushionWidth / 2;
      const startY =
        Math.max(150 * scaleFactor, (k.height() - boardHeight) / 2) +
        cushionHeight / 2;

      for (let index = 0; index < cushionCount; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = startX + column * (cushionWidth + gapX);
        const y = startY + row * (cushionHeight + gapY);
        let chooseCushion = () => { };

        const cushion = k.add([
          k.sprite("cushion", {
            width: cushionWidth,
            height: cushionHeight,
          }),
          k.pos(x, y),
          k.anchor("center"),
          k.area(),
          k.opacity(1),
          k.z(5),
          "cushion",
          {
            revealed: false,
            clickAction: () => {
              chooseCushion();
            },
          },
        ]);

        chooseCushion = () => {
          if (!isRunning || roundLocked || cushion.revealed) return;

          cushion.revealed = true;

          if (index === remoteIndex) {
            roundLocked = true;
            foundRemotes += 1;
            scoreText.text = `Found: ${foundRemotes}`;
            revealRemote(x, y);
            cushion.opacity = 0.28;

            k.wait(0.55, () => {
              createRound();
            });
            return;
          }

          misses += 1;
          missText.text = `Misses: ${misses}`;
          cushion.opacity = 0.42;
        };

        cushion.onClick(chooseCushion);
      }
    };

    const endGame = () => {
      if (!isRunning) return;

      isRunning = false;
      k.get("cushion").forEach((cushion) => cushion.destroy());
      k.get("remoteResult").forEach((remote) => remote.destroy());

      k.add([
        k.text(`Time's up!\nFound: ${foundRemotes}`, {
          size: textSize * 1.1,
        }),
        k.pos(k.width() / 2, k.height() / 2 - 92 * scaleFactor),
        k.anchor("center"),
        k.color(24, 24, 24),
      ]);

      const leaderboardText = k.add([
        k.text("Leaderboard\nSaving score...", {
          size: Math.max(textSize * 0.72, 12),
        }),
        k.pos(k.width() / 2, k.height() / 2 + 8 * scaleFactor),
        k.anchor("center"),
        k.color(24, 24, 24),
      ]);

      void addLeaderboardEntry("remoteHunt", {
        score: foundRemotes * 100 - misses,
        label: `${foundRemotes}`,
        detail: `remotes, ${misses} ${misses === 1 ? "miss" : "misses"}`,
      }).then((leaderboardEntries) => {
        leaderboardText.destroy();
        addLeaderboardDisplay({
          entries: leaderboardEntries,
          x: k.width() / 2,
          y: k.height() / 2 + 8 * scaleFactor,
          textSize,
          scaleFactor,
        });
      });

      createQuitButton(k.width() / 2, k.height() / 2 + 145 * scaleFactor);
    };

    createRound();

    k.onUpdate(() => {
      if (!isRunning) return;

      timeLeft -= k.dt();
      if (timeLeft <= 0) {
        timeLeft = 0;
        timerText.text = `Time: ${timeLeft.toFixed(1)}s`;
        endGame();
        return;
      }

      timerText.text = `Time: ${timeLeft.toFixed(1)}s`;
    });

    k.onKeyPress("escape", () => {
      k.go("main", { fromMiniGame: true, movePlayerBack: true });
    });

    k.onKeyPress("enter", () => {
      k.go("main", { fromMiniGame: true, movePlayerBack: true });
    });

    k.onKeyPress("space", () => {
      k.go("main", { fromMiniGame: true, movePlayerBack: true });
    });

    k.onClick("button", (button) => {
      button.clickAction?.();
    });

    k.onTouchStart((pos) => {
      const clickedButton = k.get("button").find((button) => button.hasPoint(pos));
      if (clickedButton) {
        clickedButton.clickAction?.();
        return;
      }

      const clickedCushion = k
        .get("cushion")
        .find((cushion) => cushion.hasPoint(pos));
      if (clickedCushion) {
        clickedCushion.clickAction?.();
      }
    });
  });
};
