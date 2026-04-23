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

type IngredientId = "apple" | "bread" | "carrot" | "milk";

interface Ingredient {
  id: IngredientId;
  sprite: string;
  label: string;
}

interface Recipe {
  name: string;
  steps: IngredientId[];
}

export const recipeRush = () => {
  k.loadRoot("/assets/");
  k.loadSprite("quit", "quit.webp");
  k.loadSprite("recipeCounter", "kitchen.jpg");
  k.loadSprite("ingredientApple", "ingredient-apple.svg");
  k.loadSprite("ingredientBread", "ingredient-bread.svg");
  k.loadSprite("ingredientCarrot", "ingredient-carrot.svg");
  k.loadSprite("ingredientMilk", "ingredient-milk.svg");

  k.scene("recipeRush", () => {
    window.dispatchEvent(new Event("mi-casa:pause-main-bgm"));

    const recipeBgm = new Audio("/assets/pantry.mp3");
    recipeBgm.loop = true;
    recipeBgm.volume = 0.36;
    recipeBgm.muted = readAudioMuted();
    recipeBgm.preload = "auto";

    void recipeBgm.play().catch(() => {
      // The browser may reject playback if it does not count the scene change as a gesture.
    });

    const updateMuted = (event: Event) => {
      const muted = getAudioMutedFromEvent(event);
      if (muted === null) return;

      recipeBgm.muted = muted;
    };

    window.addEventListener(AUDIO_MUTED_EVENT, updateMuted);

    k.onSceneLeave(() => {
      window.removeEventListener(AUDIO_MUTED_EVENT, updateMuted);
      recipeBgm.pause();
      recipeBgm.currentTime = 0;
      window.dispatchEvent(new Event("mi-casa:resume-main-bgm"));
    });

    const durationSeconds = 22;
    const ingredients: Ingredient[] = [
      { id: "apple", sprite: "ingredientApple", label: "Apple" },
      { id: "bread", sprite: "ingredientBread", label: "Bread" },
      { id: "carrot", sprite: "ingredientCarrot", label: "Carrot" },
      { id: "milk", sprite: "ingredientMilk", label: "Milk" },
    ];
    const recipes: Recipe[] = [
      { name: "Snack plate", steps: ["bread", "apple", "milk"] },
      { name: "Garden bites", steps: ["carrot", "bread", "apple"] },
      { name: "Breakfast tray", steps: ["milk", "bread", "apple"] },
      { name: "Crunch mix", steps: ["apple", "carrot", "bread"] },
    ];

    let timeLeft = durationSeconds;
    let currentRecipe = recipes[0];
    let stepIndex = 0;
    let completedSteps = 0;
    let finishedRecipes = 0;
    let mistakes = 0;
    let isRunning = true;

    const scaleFactor = getScaleFactor();
    const textSize = getTextSize(scaleFactor);
    const ingredientSize = Math.min(
      Math.max(94 * scaleFactor, 70) * 1.45,
      k.width() * 0.32
    );

    addCoverBackground("recipeCounter");
    addTopPanel(scaleFactor);

    k.add([
      k.text("Recipe Rush", { size: textSize * 1.2 }),
      k.pos(k.width() / 2, 42 * scaleFactor),
      k.anchor("center"),
      k.color(24, 24, 24),
    ]);

    const scoreText = k.add([
      k.text(`Recipes: ${finishedRecipes}`, { size: textSize }),
      k.pos(20 * scaleFactor, 88 * scaleFactor),
      k.color(24, 24, 24),
    ]);

    const timerText = k.add([
      k.text(`Time: ${timeLeft.toFixed(1)}s`, { size: textSize }),
      k.pos(k.width() - 20 * scaleFactor, 88 * scaleFactor),
      k.anchor("topright"),
      k.color(24, 24, 24),
    ]);

    const recipeText = k.add([
      k.text("", { size: Math.max(textSize * 0.72, 12) }),
      k.pos(k.width() / 2, 92 * scaleFactor),
      k.anchor("top"),
      k.color(24, 24, 24),
    ]);

    const feedbackText = k.add([
      k.text("", { size: Math.max(textSize * 0.74, 12) }),
      k.pos(k.width() / 2, k.height() / 2 - 92 * scaleFactor),
      k.anchor("center"),
      k.color(24, 24, 24),
    ]);

    const ingredientById = (id: IngredientId) =>
      ingredients.find((ingredient) => ingredient.id === id) ?? ingredients[0];

    const updateRecipeText = () => {
      const nextIngredient = ingredientById(currentRecipe.steps[stepIndex]);
      scoreText.text = `Recipes: ${finishedRecipes}`;
      recipeText.text = `${currentRecipe.name}\nNext: ${nextIngredient.label}`;
    };

    const chooseRecipe = () => {
      currentRecipe = recipes[Math.floor(k.rand(0, recipes.length))];
      stepIndex = 0;
      updateRecipeText();
    };

    const chooseIngredient = (id: IngredientId) => {
      if (!isRunning) return;

      if (id !== currentRecipe.steps[stepIndex]) {
        mistakes += 1;
        feedbackText.text = `Wrong ingredient\nMistakes: ${mistakes}`;
        return;
      }

      completedSteps += 1;
      stepIndex += 1;
      feedbackText.text = "Good!";

      if (stepIndex >= currentRecipe.steps.length) {
        finishedRecipes += 1;
        completedSteps += 1;
        feedbackText.text = "Recipe complete!";
        chooseRecipe();
        return;
      }

      updateRecipeText();
    };

    const addIngredientChoice = (
      ingredient: Ingredient,
      x: number,
      y: number
    ) => {
      k.add([
        k.sprite(ingredient.sprite, {
          width: ingredientSize,
          height: ingredientSize,
        }),
        k.pos(x, y),
        k.anchor("center"),
        k.area(),
        k.z(8),
        "ingredientChoice",
        {
          clickAction: () => {
            chooseIngredient(ingredient.id);
          },
        },
      ]);

      k.add([
        k.text(ingredient.label, { size: Math.max(textSize * 0.62, 10) }),
        k.pos(x, y + ingredientSize * 0.6),
        k.anchor("center"),
        k.color(24, 24, 24),
        "ingredientLabel",
      ]);
    };

    const columns = k.width() < 520 ? 2 : 4;
    const spacingX = Math.min(
      k.width() / (columns === 2 ? 2.85 : 4.2),
      Math.max(ingredientSize * 1.16, 148 * scaleFactor)
    );
    const spacingY = Math.max(ingredientSize * 1.18, 112 * scaleFactor);
    const startX =
      k.width() / 2 - ((Math.min(columns, ingredients.length) - 1) * spacingX) / 2;
    const startY =
      columns === 2 ? k.height() / 2 - 8 * scaleFactor : k.height() / 2 + 20;

    ingredients.forEach((ingredient, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      addIngredientChoice(
        ingredient,
        startX + column * spacingX,
        startY + row * spacingY
      );
    });

    const endGame = () => {
      if (!isRunning) return;

      isRunning = false;
      k.get("ingredientChoice").forEach((choice) => choice.destroy());
      k.get("ingredientLabel").forEach((label) => label.destroy());
      feedbackText.destroy();

      addLeaderboardEndScreen({
        gameId: "recipeRush",
        score: completedSteps * 100 + finishedRecipes * 150 - mistakes * 25,
        label: `${finishedRecipes}`,
        detail: `recipes, ${mistakes} mistakes`,
        summary: `Time's up!\nRecipes: ${finishedRecipes}`,
        textSize,
        scaleFactor,
      });
    };

    chooseRecipe();
    addExitControls();

    k.onClick("ingredientChoice", (choice) => {
      choice.clickAction?.();
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

      const clickedIngredient = k
        .get("ingredientChoice")
        .find((ingredient) => ingredient.hasPoint(pos));
      if (clickedIngredient) {
        clickedIngredient.clickAction?.();
      }
    });
  });
};
