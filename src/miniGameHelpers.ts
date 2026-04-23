import type { GameObj } from "kaboom";
import { k } from "./kaboomCtx";
import {
  addLeaderboardEntry,
  formatLeaderboardEntry,
  type LeaderboardEntry,
  type MiniGameId,
} from "./leaderboard";

export type ClickableGameObj = GameObj & { clickAction?: () => void };

type RgbColor = readonly [number, number, number];

export const getScaleFactor = () => Math.min(k.width() / 640, k.height() / 480);

export const getTextSize = (scaleFactor: number) =>
  Math.max(18 * scaleFactor, 16);

export const goBackToHouse = () => {
  k.go("main", { fromMiniGame: true, movePlayerBack: true });
};

export const addCoverBackground = (spriteName: string, zoom = 1) => {
  const background = k.add([
    k.sprite(spriteName),
    k.pos(0, 0),
    k.scale(1),
    k.z(-10),
  ]);
  const nativeSize = { w: background.width, h: background.height };

  const resizeBackground = () => {
    const scale =
      Math.max(k.width() / nativeSize.w, k.height() / nativeSize.h) * zoom;
    background.scale = k.vec2(scale, scale);
    const scaledW = nativeSize.w * scale;
    const scaledH = nativeSize.h * scale;
    background.pos = k.vec2(
      (k.width() - scaledW) / 2,
      (k.height() - scaledH) / 2
    );
  };

  resizeBackground();
  k.onResize(resizeBackground);

  return background;
};

export const addTopPanel = (
  scaleFactor: number,
  color: RgbColor = [255, 255, 255],
  opacity = 0.32
) => {
  k.add([
    k.rect(k.width(), 132 * scaleFactor),
    k.pos(0, 0),
    k.color(...color),
    k.opacity(opacity),
    k.z(-5),
  ]);
};

export const addQuitButton = (
  scaleFactor: number,
  x = k.width() / 2,
  y = k.height() / 2 + 145 * scaleFactor
) => {
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
      clickAction: goBackToHouse,
    },
  ]);
};

export const addExitControls = () => {
  k.onKeyPress("escape", goBackToHouse);
  k.onKeyPress("enter", goBackToHouse);
  k.onKeyPress("space", goBackToHouse);

  k.onClick("button", (button) => {
    button.clickAction?.();
  });
};

export const addLeaderboardDisplay = ({
  entries,
  x,
  y,
  textSize,
  scaleFactor,
  color = [24, 24, 24],
  highlightColor = [255, 230, 105],
}: {
  entries: LeaderboardEntry[];
  x: number;
  y: number;
  textSize: number;
  scaleFactor: number;
  color?: RgbColor;
  highlightColor?: RgbColor;
}) => {
  const lineSize = Math.max(textSize * 0.72, 12);
  const lineHeight = lineSize * 1.62;
  const rows = entries.length > 0 ? entries : null;
  const rowCount = rows?.length ?? 1;
  const titleY = y - (rowCount * lineHeight) / 2;
  const firstRowY = titleY + lineHeight * 1.15;
  const highlightWidth = Math.min(
    k.width() * 0.9,
    Math.max(300, 560 * scaleFactor)
  );

  k.add([
    k.text("Leaderboard", { size: lineSize }),
    k.pos(x, titleY),
    k.anchor("center"),
    k.color(...color),
    k.z(20),
  ]);

  if (!rows) {
    k.add([
      k.text("No scores yet", { size: lineSize }),
      k.pos(x, firstRowY),
      k.anchor("center"),
      k.color(...color),
      k.z(20),
    ]);
    return;
  }

  rows.forEach((entry, index) => {
    const rowY = firstRowY + index * lineHeight;

    if (entry.isCurrent) {
      k.add([
        k.rect(highlightWidth, lineHeight * 1.18),
        k.pos(x, rowY),
        k.anchor("center"),
        k.color(...highlightColor),
        k.opacity(0.88),
        k.z(19),
      ]);
    }

    k.add([
      k.text(formatLeaderboardEntry(entry, index), { size: lineSize }),
      k.pos(x, rowY),
      k.anchor("center"),
      k.color(...color),
      k.z(20),
    ]);
  });
};

export const addLeaderboardEndScreen = ({
  gameId,
  score,
  label,
  detail,
  summary,
  textSize,
  scaleFactor,
  color = [24, 24, 24],
}: {
  gameId: MiniGameId;
  score: number;
  label: string;
  detail: string;
  summary: string;
  textSize: number;
  scaleFactor: number;
  color?: RgbColor;
}) => {
  k.add([
    k.text(summary, { size: textSize * 1.1 }),
    k.pos(k.width() / 2, k.height() / 2 - 92 * scaleFactor),
    k.anchor("center"),
    k.color(...color),
  ]);

  const leaderboardText = k.add([
    k.text("Leaderboard\nSaving score...", {
      size: Math.max(textSize * 0.72, 12),
    }),
    k.pos(k.width() / 2, k.height() / 2 + 8 * scaleFactor),
    k.anchor("center"),
    k.color(...color),
  ]);

  void addLeaderboardEntry(gameId, { score, label, detail }).then(
    (leaderboardEntries) => {
      leaderboardText.destroy();
      addLeaderboardDisplay({
        entries: leaderboardEntries,
        x: k.width() / 2,
        y: k.height() / 2 + 8 * scaleFactor,
        textSize,
        scaleFactor,
        color,
      });
    }
  );

  addQuitButton(scaleFactor);
};
