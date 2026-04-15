import { k } from "./kaboomCtx";
import { addLeaderboardEntry, formatLeaderboard } from "./leaderboard";

export const bubblePop = () => {
  k.loadRoot("/assets/");
  k.loadSprite("quit", "quit.webp");
  k.loadSprite("bathtub", "bathtub.jpg");
  k.loadSprite("bubble", "bubble.png");

  k.scene("bubblePop", () => {
    const durationSeconds = 10;
    let timeLeft = durationSeconds;
    let score = 0;
    let isRunning = true;

    const scaleFactor = Math.min(k.width() / 640, k.height() / 480);
    const textSize = Math.max(18 * scaleFactor, 16);

    const background = k.add([
      k.sprite("bathtub"),
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
      k.text("Pop the bubbles!", { size: textSize * 1.2 }),
      k.pos(k.width() / 2, 48 * scaleFactor),
      k.anchor("center"),
      k.color(20, 40, 70),
    ]);

    const scoreText = k.add([
      k.text(`Bubbles: ${score}`, { size: textSize }),
      k.pos(20 * scaleFactor, 92 * scaleFactor),
      k.color(20, 40, 70),
    ]);

    const timerText = k.add([
      k.text(`Time: ${timeLeft.toFixed(1)}s`, { size: textSize }),
      k.pos(k.width() - 20 * scaleFactor, 92 * scaleFactor),
      k.anchor("topright"),
      k.color(20, 40, 70),
    ]);

    const spawnBubble = () => {
      if (!isRunning) return;

      const radius = k.rand(64, 96) * scaleFactor;
      const x = k.rand(radius + 20, k.width() - radius - 20);
      const y = k.rand(radius + 110, k.height() - radius - 40);

      const bubble = k.add([
        k.sprite("bubble", { width: radius * 2, height: radius * 2 }),
        k.pos(x, y),
        k.area(),
        k.opacity(0.5),
        "bubble",
        { popped: false },
      ]);

      bubble.onClick(() => {
        if (!isRunning || bubble.popped) return;
        bubble.popped = true;
        score += 1;
        scoreText.text = `Bubbles: ${score}`;
        bubble.destroy();
      });

      const drift = k.vec2(k.rand(-12, 12), k.rand(-18, -6)).scale(scaleFactor);
      bubble.onUpdate(() => {
        if (!isRunning) return;
        bubble.move(drift);
      });

      k.wait(k.rand(0.8, 1.4), () => {
        if (bubble.exists()) bubble.destroy();
      });
    };

    const scheduleNextSpawn = () => {
      if (!isRunning) return;
      k.wait(k.rand(0.2, 0.55), () => {
        if (!isRunning) return;
        spawnBubble();
        scheduleNextSpawn();
      });
    };

    const endGame = () => {
      if (!isRunning) return;
      isRunning = false;
      k.get("bubble").forEach((bubble) => bubble.destroy());
      const leaderboardEntries = addLeaderboardEntry("bubblePop", {
        score,
        label: `${score}`,
        detail: "bubbles",
      });

      k.add([
        k.text(`Time's up!\nFinal count: ${score}`, { size: textSize * 1.1 }),
        k.pos(k.width() / 2, k.height() / 2 - 92 * scaleFactor),
        k.anchor("center"),
        k.color(20, 40, 70),
      ]);

      k.add([
        k.text(`Leaderboard\n${formatLeaderboard(leaderboardEntries)}`, {
          size: Math.max(textSize * 0.72, 12),
        }),
        k.pos(k.width() / 2, k.height() / 2 + 8 * scaleFactor),
        k.anchor("center"),
        k.color(20, 40, 70),
      ]);

      createQuitButton(k.width() / 2, k.height() / 2 + 145 * scaleFactor);
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

    // Match rock-paper-scissors button handling (mouse + touch).
    k.onClick("button", (button) => {
      button.clickAction?.();
    });

    k.onTouchStart((pos) => {
      const clickedButton = k.get("button").find((b) => b.hasPoint(pos));
      if (clickedButton) {
        clickedButton.clickAction?.();
      }
    });
  });
};
