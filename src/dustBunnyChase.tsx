import { k } from "./kaboomCtx";
import {
  addCoverBackground,
  addExitControls,
  addLeaderboardEndScreen,
  addTopPanel,
  getScaleFactor,
  getTextSize,
} from "./miniGameHelpers";
import { startMiniGameAudio } from "./miniGameAudio";

export const dustBunnyChase = () => {
  k.loadRoot("/assets/");
  k.loadSprite("quit", "quit.webp");
  k.loadSprite("dustRoom", "pet-bed.jpg");
  k.loadSprite("dustBunny", "dust-bunny.svg");

  k.scene("dustBunnyChase", () => {
    const stopMiniGameAudio = startMiniGameAudio("dustBunnyChase");

    k.onSceneLeave(stopMiniGameAudio);

    const durationSeconds = 15;
    let timeLeft = durationSeconds;
    let caught = 0;
    let escaped = 0;
    let isRunning = true;

    const scaleFactor = getScaleFactor();
    const textSize = getTextSize(scaleFactor);
    const bunnyWidth = Math.max(104 * scaleFactor, 72);

    addCoverBackground("dustRoom");
    addTopPanel(scaleFactor);

    k.add([
      k.text("Dust Bunny Chase", { size: textSize * 1.1 }),
      k.pos(k.width() / 2, 46 * scaleFactor),
      k.anchor("center"),
      k.color(24, 24, 24),
    ]);

    const scoreText = k.add([
      k.text(`Caught: ${caught}`, { size: textSize }),
      k.pos(20 * scaleFactor, 92 * scaleFactor),
      k.color(24, 24, 24),
    ]);

    const timerText = k.add([
      k.text(`Time: ${timeLeft.toFixed(1)}s`, { size: textSize }),
      k.pos(k.width() - 20 * scaleFactor, 92 * scaleFactor),
      k.anchor("topright"),
      k.color(24, 24, 24),
    ]);

    const escapedText = k.add([
      k.text(`Escaped: ${escaped}`, { size: Math.max(textSize * 0.72, 12) }),
      k.pos(k.width() / 2, 96 * scaleFactor),
      k.anchor("top"),
      k.color(24, 24, 24),
    ]);

    const updateScoreText = () => {
      scoreText.text = `Caught: ${caught}`;
      escapedText.text = `Escaped: ${escaped}`;
    };

    const catchBunny = (bunny: { caught?: boolean; destroy: () => void }) => {
      if (!isRunning || bunny.caught) return;

      bunny.caught = true;
      caught += 1;
      updateScoreText();
      bunny.destroy();
    };

    const spawnBunny = () => {
      if (!isRunning) return;

      const margin = bunnyWidth / 2 + 18 * scaleFactor;
      const minX = margin;
      const maxX = Math.max(minX, k.width() - margin);
      const minY = Math.max(138 * scaleFactor, margin);
      const maxY = Math.max(minY, k.height() - margin - 30 * scaleFactor);
      const bunny = k.add([
        k.sprite("dustBunny", {
          width: bunnyWidth,
          height: bunnyWidth * 0.75,
        }),
        k.pos(k.rand(minX, maxX), k.rand(minY, maxY)),
        k.anchor("center"),
        k.area(),
        k.z(10),
        "dustBunny",
        { caught: false },
      ]);

      bunny.onClick(() => catchBunny(bunny));

      const velocity = k.vec2(k.rand(-90, 90), k.rand(-70, 70)).scale(
        scaleFactor
      );

      bunny.onUpdate(() => {
        if (!isRunning) return;

        bunny.move(velocity);

        if (bunny.pos.x < minX || bunny.pos.x > maxX) {
          bunny.pos.x = Math.min(Math.max(bunny.pos.x, minX), maxX);
          velocity.x *= -1;
        }

        if (bunny.pos.y < minY || bunny.pos.y > maxY) {
          bunny.pos.y = Math.min(Math.max(bunny.pos.y, minY), maxY);
          velocity.y *= -1;
        }
      });

      k.wait(k.rand(1.25, 2), () => {
        if (!bunny.exists() || bunny.caught) return;

        escaped += 1;
        updateScoreText();
        bunny.destroy();
      });
    };

    const scheduleNextSpawn = () => {
      if (!isRunning) return;

      k.wait(k.rand(0.28, 0.58), () => {
        if (!isRunning) return;
        spawnBunny();
        scheduleNextSpawn();
      });
    };

    const endGame = () => {
      if (!isRunning) return;

      isRunning = false;
      k.get("dustBunny").forEach((bunny) => bunny.destroy());

      addLeaderboardEndScreen({
        gameId: "dustBunnyChase",
        score: caught * 100 - escaped * 15,
        label: `${caught}`,
        detail: `caught, ${escaped} escaped`,
        summary: `Time's up!\nCaught: ${caught}`,
        textSize,
        scaleFactor,
      });
    };

    scheduleNextSpawn();
    addExitControls();

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

    k.onTouchStart((pos) => {
      const clickedButton = k.get("button").find((button) => button.hasPoint(pos));
      if (clickedButton) {
        clickedButton.clickAction?.();
        return;
      }

      const clickedBunny = k
        .get("dustBunny")
        .find((bunny) => bunny.hasPoint(pos));
      if (clickedBunny) {
        catchBunny(clickedBunny);
      }
    });
  });
};
