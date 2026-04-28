import { k } from "./kaboomCtx";
import { addLeaderboardEntry } from "./leaderboard";
import { startMiniGameAudio } from "./miniGameAudio";
import { addLeaderboardDisplay } from "./miniGameHelpers";

export const flyCatch = () => {
  k.loadRoot("/assets/");
  k.loadSprite("quit", "quit.webp");
  k.loadSprite("foodTable", "food.jpg");
  k.loadSprite("cockroach", "cockroach.png");

  k.scene("flyCatch", () => {
    const stopMiniGameAudio = startMiniGameAudio("flyCatch");

    k.onSceneLeave(stopMiniGameAudio);

    const durationSeconds = 10;
    let timeLeft = durationSeconds;
    let score = 0;
    let isRunning = true;

    const scaleFactor = Math.min(k.width() / 640, k.height() / 480);
    const textSize = Math.max(18 * scaleFactor, 16);
    const cockroachSize = Math.max(78 * scaleFactor, 58);

    const background = k.add([
      k.sprite("foodTable"),
      k.pos(0, 0),
      k.scale(1),
      k.z(-10),
    ]);
    const backgroundNativeSize = { w: background.width, h: background.height };

    const resizeBackground = () => {
      const scale = Math.max(
        k.width() / backgroundNativeSize.w,
        k.height() / backgroundNativeSize.h
      );
      background.scale = k.vec2(scale, scale);
      const scaledW = backgroundNativeSize.w * scale;
      const scaledH = backgroundNativeSize.h * scale;
      background.pos = k.vec2((k.width() - scaledW) / 2, (k.height() - scaledH) / 2);
    };

    resizeBackground();
    k.onResize(resizeBackground);

    k.add([
      k.rect(k.width(), 130 * scaleFactor),
      k.pos(0, 0),
      k.color(255, 255, 255),
      k.opacity(0.3),
      k.z(-5),
    ]);

    k.add([
      k.text("Catch the roaches!", { size: textSize * 1.2 }),
      k.pos(k.width() / 2, 48 * scaleFactor),
      k.anchor("center"),
      k.color(24, 24, 24),
    ]);

    const scoreText = k.add([
      k.text(`Roaches: ${score}`, { size: textSize }),
      k.pos(20 * scaleFactor, 92 * scaleFactor),
      k.color(24, 24, 24),
    ]);

    const timerText = k.add([
      k.text(`Time: ${timeLeft.toFixed(1)}s`, { size: textSize }),
      k.pos(k.width() - 20 * scaleFactor, 92 * scaleFactor),
      k.anchor("topright"),
      k.color(24, 24, 24),
    ]);

    const catchCockroach = (cockroach: { caught?: boolean; destroy: () => void }) => {
      if (!isRunning || cockroach.caught) return;

      cockroach.caught = true;
      score += 1;
      scoreText.text = `Roaches: ${score}`;
      cockroach.destroy();
    };

    const spawnCockroach = () => {
      if (!isRunning) return;

      const margin = cockroachSize / 2 + 20 * scaleFactor;
      const minX = margin;
      const maxX = Math.max(minX, k.width() - margin);
      const minY = Math.max(120 * scaleFactor, margin);
      const maxY = Math.max(minY, k.height() - margin - 40 * scaleFactor);
      const cockroach = k.add([
        k.sprite("cockroach", {
          width: cockroachSize,
          height: cockroachSize,
        }),
        k.pos(k.rand(minX, maxX), k.rand(minY, maxY)),
        k.anchor("center"),
        k.area(),
        k.rotate(k.rand(0, 360)),
        "cockroach",
        { caught: false },
      ]);

      cockroach.onClick(() => catchCockroach(cockroach));

      const velocity = k.vec2(k.rand(-65, 65), k.rand(-55, 55)).scale(
        scaleFactor
      );

      cockroach.onUpdate(() => {
        if (!isRunning) return;

        cockroach.move(velocity);

        if (cockroach.pos.x < minX || cockroach.pos.x > maxX) {
          cockroach.pos.x = Math.min(Math.max(cockroach.pos.x, minX), maxX);
          velocity.x *= -1;
        }

        if (cockroach.pos.y < minY || cockroach.pos.y > maxY) {
          cockroach.pos.y = Math.min(Math.max(cockroach.pos.y, minY), maxY);
          velocity.y *= -1;
        }
      });

      k.wait(k.rand(1.2, 2), () => {
        if (cockroach.exists()) cockroach.destroy();
      });
    };

    const scheduleNextSpawn = () => {
      if (!isRunning) return;

      k.wait(k.rand(0.25, 0.55), () => {
        if (!isRunning) return;
        spawnCockroach();
        scheduleNextSpawn();
      });
    };

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

    const endGame = () => {
      if (!isRunning) return;

      isRunning = false;
      k.get("cockroach").forEach((cockroach) => cockroach.destroy());

      k.add([
        k.text(`Time's up!\nFinal count: ${score}`, { size: textSize * 1.1 }),
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

      void addLeaderboardEntry("flyCatch", {
        score,
        label: `${score}`,
        detail: "roaches",
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

    scheduleNextSpawn();

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
  });
};
