import React, { useEffect, useRef, useState } from "react";
import { dialogueData, scaleFactor, setCamScale } from "./constants";
import DialogueBox from "./dialogBox";
import { rockPaperScissors } from "./rockPaperScissors";
import { bubblePop } from "./bubblePop";
import { GameObj } from "kaboom";
import { initKaboomWithCanvas, k } from "./kaboomCtx";

type DialogueKeys = keyof typeof dialogueData;

const GameScene: React.FC = () => {
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [isDialogueVisible, setIsDialogueVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<GameObj | null>(null);

  let savedPlayerState: {
    pos: { x: number; y: number };
    direction: string;
  } | null = null;

  useEffect(() => {
    if (canvasRef.current) {
      initKaboomWithCanvas(canvasRef.current);
    }

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
          if (boundaryName === "fish") {
            savedPlayerState = {
              pos: { x: player.pos.x, y: player.pos.y },
              direction: player.direction,
            };

            k.go("rockPaperScissors");
          } else if (boundaryName === "bath") {
            savedPlayerState = {
              pos: { x: player.pos.x, y: player.pos.y },
              direction: player.direction,
            };

            k.go("bubblePop");
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

        if (context?.fromMiniGame && savedPlayerState) {
          player.pos = k.vec2(savedPlayerState.pos.x, savedPlayerState.pos.y);
          player.direction = savedPlayerState.direction;

          if (context?.movePlayerBack) {
            player.pos = player.pos.add(k.vec2(60, 0));
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
          if (isDialogueVisible) {
            player.stop();
            return;
          }

          // Camera follows the player
          k.camPos(player.worldPos().x, player.worldPos().y - 100);
        });

        const stopAnims = () => {
          if (isDialogueVisible) return;

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
    k.go("main");

    return () => {
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

  return (
    <div>
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
