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

export const waterPlants = () => {
  k.loadRoot("/assets/");
  k.loadSprite("quit", "quit.webp");
  k.loadSprite("garden", "table.jpg");
  k.loadSprite("plant", "plant.svg");

  k.scene("waterPlants", () => {
    const stopMiniGameAudio = startMiniGameAudio("waterPlants");

    k.onSceneLeave(stopMiniGameAudio);

    const durationSeconds = 22;
    let timeLeft = durationSeconds;
    let watered = 0;
    let wilted = 0;
    let isRunning = true;

    const scaleFactor = getScaleFactor();
    const textSize = getTextSize(scaleFactor);
    const plantHeight = Math.min(
      Math.max(126 * scaleFactor, 92) * 1.45,
      k.height() * 0.44
    );
    const plantWidth = plantHeight * 0.83;
    const plantSlots: Array<{ x: number; y: number; drain: number }> = [
      { x: k.width() * 0.24, y: k.height() * 0.68, drain: 0.115 },
      { x: k.width() * 0.5, y: k.height() * 0.65, drain: 0.13 },
      { x: k.width() * 0.76, y: k.height() * 0.68, drain: 0.105 },
    ];
    const activePlants: Array<{ destroy: () => void }> = [];

    addCoverBackground("garden");
    addTopPanel(scaleFactor, [255, 255, 255], 0.3);

    k.add([
      k.text("Water the Plants", { size: textSize * 1.1 }),
      k.pos(k.width() / 2, 42 * scaleFactor),
      k.anchor("center"),
      k.color(24, 24, 24),
    ]);

    const scoreText = k.add([
      k.text(`Watered: ${watered}`, { size: textSize }),
      k.pos(20 * scaleFactor, 88 * scaleFactor),
      k.color(24, 24, 24),
    ]);

    const timerText = k.add([
      k.text(`Time: ${timeLeft.toFixed(1)}s`, { size: textSize }),
      k.pos(k.width() - 20 * scaleFactor, 88 * scaleFactor),
      k.anchor("topright"),
      k.color(24, 24, 24),
    ]);

    const wiltText = k.add([
      k.text(`Wilted: ${wilted}`, { size: Math.max(textSize * 0.72, 12) }),
      k.pos(k.width() / 2, 96 * scaleFactor),
      k.anchor("top"),
      k.color(24, 24, 24),
    ]);

    const updateScoreText = () => {
      scoreText.text = `Watered: ${watered}`;
      wiltText.text = `Wilted: ${wilted}`;
    };

    const addPlant = (x: number, y: number, drain: number) => {
      let health = k.rand(0.52, 0.9);
      let cooldown = 0;

      const plant = k.add([
        k.sprite("plant", { width: plantWidth, height: plantHeight }),
        k.pos(x, y),
        k.anchor("center"),
        k.area(),
        k.opacity(1),
        k.z(8),
        "waterPlant",
        {
          clickAction: () => {
            waterPlant();
          },
        },
      ]);

      const healthTrack = k.add([
        k.rect(plantWidth * 0.86, 8),
        k.pos(x - plantWidth * 0.43, y - plantHeight * 0.66),
        k.color(68, 76, 56),
        k.z(12),
      ]);

      const healthBar = k.add([
        k.rect(plantWidth * 0.86, 8),
        k.pos(x - plantWidth * 0.43, y - plantHeight * 0.66),
        k.color(86, 174, 88),
        k.scale(health, 1),
        k.z(13),
      ]);

      const updateHealthBar = () => {
        healthBar.scale = k.vec2(Math.max(health, 0.04), 1);
        plant.opacity = Math.max(0.42, 0.58 + health * 0.42);
      };

      const waterPlant = () => {
        if (!isRunning || cooldown > 0 || health > 0.92) return;

        watered += 1;
        health = 1;
        cooldown = 0.38;
        updateScoreText();
        updateHealthBar();
      };

      plant.onClick(waterPlant);
      plant.onUpdate(() => {
        if (!isRunning) return;

        cooldown = Math.max(0, cooldown - k.dt());
        health -= k.dt() * drain;

        if (health <= 0) {
          wilted += 1;
          health = 0.42;
          cooldown = 0.2;
          updateScoreText();
        }

        updateHealthBar();
      });

      updateHealthBar();
      activePlants.push({
        destroy: () => {
          plant.destroy();
          healthTrack.destroy();
          healthBar.destroy();
        },
      });
    };

    plantSlots.forEach((slot) => {
      addPlant(slot.x, slot.y, slot.drain);
    });

    const endGame = () => {
      if (!isRunning) return;

      isRunning = false;
      activePlants.forEach((plant) => plant.destroy());

      addLeaderboardEndScreen({
        gameId: "waterPlants",
        score: watered * 100 - wilted * 50,
        label: `${watered}`,
        detail: `watered, ${wilted} wilted`,
        summary: `Time's up!\nWatered: ${watered}`,
        textSize,
        scaleFactor,
      });
    };

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

      const clickedPlant = k
        .get("waterPlant")
        .find((plant) => plant.hasPoint(pos));
      if (clickedPlant) {
        clickedPlant.clickAction?.();
      }
    });
  });
};
