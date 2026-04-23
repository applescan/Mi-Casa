import { k } from "./kaboomCtx";
import {
  AUDIO_MUTED_EVENT,
  getAudioMutedFromEvent,
  readAudioMuted,
} from "./audioState";
import {
  addCoverBackground,
  addExitControls,
  addLeaderboardEndScreen,
  addTopPanel,
  getScaleFactor,
  getTextSize,
} from "./miniGameHelpers";

type LaundryKind = "lights" | "colors" | "delicates";

interface LaundryItem {
  sprite: string;
  kind: LaundryKind;
  label: string;
}

export const laundrySort = () => {
  k.loadRoot("/assets/");
  k.loadSprite("quit", "quit.webp");
  k.loadSprite("laundryRoom", "coat-hanger.jpg");
  k.loadSprite("laundryBasket", "basket.png");
  k.loadSprite("shirtLight", "shirt-light.svg");
  k.loadSprite("shirtColor", "shirt-color.svg");
  k.loadSprite("shirtDelicate", "shirt-delicate.svg");

  k.scene("laundrySort", () => {
    window.dispatchEvent(new Event("mi-casa:pause-main-bgm"));

    const laundryBgm = new Audio("/assets/pocket-fold-party.mp3");
    laundryBgm.loop = true;
    laundryBgm.volume = 0.36;
    laundryBgm.muted = readAudioMuted();
    laundryBgm.preload = "auto";

    void laundryBgm.play().catch(() => {
      // The browser may reject playback if it does not count the scene change as a gesture.
    });

    const updateMuted = (event: Event) => {
      const muted = getAudioMutedFromEvent(event);
      if (muted === null) return;

      laundryBgm.muted = muted;
    };

    window.addEventListener(AUDIO_MUTED_EVENT, updateMuted);

    k.onSceneLeave(() => {
      window.removeEventListener(AUDIO_MUTED_EVENT, updateMuted);
      laundryBgm.pause();
      laundryBgm.currentTime = 0;
      window.dispatchEvent(new Event("mi-casa:resume-main-bgm"));
    });

    const durationSeconds = 20;
    const laundryItems: LaundryItem[] = [
      { sprite: "shirtLight", kind: "lights", label: "white shirt" },
      { sprite: "shirtColor", kind: "colors", label: "red shirt" },
      { sprite: "shirtDelicate", kind: "delicates", label: "soft sweater" },
    ];
    const basketKinds: Array<{ kind: LaundryKind; label: string }> = [
      { kind: "lights", label: "Lights" },
      { kind: "colors", label: "Colors" },
      { kind: "delicates", label: "Delicates" },
    ];

    let timeLeft = durationSeconds;
    let sorted = 0;
    let misses = 0;
    let isRunning = true;
    let roundLocked = false;
    let currentItem: {
      obj: { exists: () => boolean; destroy: () => void };
      kind: LaundryKind;
    } | null = null;

    const scaleFactor = getScaleFactor();
    const textSize = getTextSize(scaleFactor);
    const itemSize = Math.min(
      Math.max(118 * scaleFactor, 86) * 1.35,
      k.width() * 0.36
    );
    const basketWidth = Math.min(
      Math.max(126 * scaleFactor, 92) * 1.3,
      k.width() * 0.29
    );

    addCoverBackground("laundryRoom");
    addTopPanel(scaleFactor);

    k.add([
      k.text("Laundry Sort", { size: textSize * 1.2 }),
      k.pos(k.width() / 2, 46 * scaleFactor),
      k.anchor("center"),
      k.color(24, 24, 24),
    ]);

    const scoreText = k.add([
      k.text(`Sorted: ${sorted}`, { size: textSize }),
      k.pos(20 * scaleFactor, 92 * scaleFactor),
      k.color(24, 24, 24),
    ]);

    const timerText = k.add([
      k.text(`Time: ${timeLeft.toFixed(1)}s`, { size: textSize }),
      k.pos(k.width() - 20 * scaleFactor, 92 * scaleFactor),
      k.anchor("topright"),
      k.color(24, 24, 24),
    ]);

    const feedbackText = k.add([
      k.text("Tap the matching basket", {
        size: Math.max(textSize * 0.72, 12),
      }),
      k.pos(k.width() / 2, 96 * scaleFactor),
      k.anchor("top"),
      k.color(24, 24, 24),
    ]);

    const itemText = k.add([
      k.text("", { size: Math.max(textSize * 0.8, 12) }),
      k.pos(k.width() / 2, k.height() / 2 - 120 * scaleFactor),
      k.anchor("center"),
      k.color(24, 24, 24),
    ]);

    const updateScoreText = () => {
      scoreText.text = `Sorted: ${sorted}`;
      feedbackText.text = `Misses: ${misses}`;
    };

    const spawnLaundry = () => {
      if (!isRunning) return;

      k.get("laundryItem").forEach((item) => item.destroy());

      const item = laundryItems[Math.floor(k.rand(0, laundryItems.length))];
      const laundry = k.add([
        k.sprite(item.sprite, { width: itemSize, height: itemSize }),
        k.pos(k.width() / 2, k.height() / 2 - 34 * scaleFactor),
        k.anchor("center"),
        k.area(),
        k.z(10),
        "laundryItem",
      ]);

      currentItem = { obj: laundry, kind: item.kind };
      roundLocked = false;
      itemText.text = item.label;

      k.wait(2.8, () => {
        if (!isRunning || currentItem?.obj !== laundry || !laundry.exists()) {
          return;
        }

        misses += 1;
        updateScoreText();
        laundry.destroy();
        currentItem = null;
        spawnLaundry();
      });
    };

    const sortIntoBasket = (kind: LaundryKind) => {
      if (!isRunning || !currentItem || roundLocked) return;

      roundLocked = true;

      if (kind === currentItem.kind) {
        sorted += 1;
        itemText.text = "Sorted!";
      } else {
        misses += 1;
        itemText.text = "Wrong basket";
      }

      updateScoreText();
      currentItem.obj.destroy();
      currentItem = null;

      k.wait(0.35, spawnLaundry);
    };

    const addBasket = (
      kind: LaundryKind,
      label: string,
      x: number,
      y: number
    ) => {
      const labelSize = Math.max(textSize * 0.68, 11);
      const labelY = y + basketWidth * 0.44;

      k.add([
        k.sprite("laundryBasket", {
          width: basketWidth,
          height: basketWidth * 0.82,
        }),
        k.pos(x, y),
        k.anchor("center"),
        k.area(),
        k.z(8),
        "basket",
        {
          clickAction: () => {
            sortIntoBasket(kind);
          },
        },
      ]);

      k.add([
        k.rect(basketWidth * 0.94, labelSize * 2.2),
        k.pos(x, labelY),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0.82),
        k.z(12),
        "basketLabel",
      ]);

      k.add([
        k.text(label, { size: labelSize }),
        k.pos(x, labelY),
        k.anchor("center"),
        k.color(24, 24, 24),
        k.z(13),
        "basketLabel",
      ]);
    };

    const basketY = k.height() - Math.max(86 * scaleFactor, 76);
    const basketSpacing = Math.min(
      k.width() / 3.15,
      Math.max(basketWidth * 1.16, 118 * scaleFactor)
    );
    const centerX = k.width() / 2;
    basketKinds.forEach((basket, index) => {
      addBasket(
        basket.kind,
        basket.label,
        centerX + (index - 1) * basketSpacing,
        basketY
      );
    });

    const endGame = () => {
      if (!isRunning) return;

      isRunning = false;
      k.get("laundryItem").forEach((item) => item.destroy());
      k.get("basket").forEach((basket) => basket.destroy());
      k.get("basketLabel").forEach((label) => label.destroy());
      itemText.destroy();

      addLeaderboardEndScreen({
        gameId: "laundrySort",
        score: sorted * 100 - misses * 25,
        label: `${sorted}`,
        detail: `sorted, ${misses} ${misses === 1 ? "miss" : "misses"}`,
        summary: `Time's up!\nSorted: ${sorted}`,
        textSize,
        scaleFactor,
      });
    };

    spawnLaundry();
    addExitControls();

    k.onClick("basket", (basket) => {
      basket.clickAction?.();
    });

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

      const clickedBasket = k.get("basket").find((basket) => basket.hasPoint(pos));
      if (clickedBasket) {
        clickedBasket.clickAction?.();
      }
    });
  });
};
