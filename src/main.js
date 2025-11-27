import { initGame, gameState } from "./core/gameState.js";
import { initUI } from "./ui/ui-board.js";
import { initControls } from "./ui/ui-controls.js";
import { runTests } from "./tests/testRunner.js";
import { gameTests } from "./tests/gameTests.js";
import { initEvaluationUI, updateEvaluationDisplay } from "./ui/ui-evaluation.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Inicjalizacja aplikacji...");

  initGame(); // Resetuje stan gry
  initUI(); // Rysuje planszę
  initControls(); // Rysuje przyciski: Restart, Cofnij, Edytor

  // Inicjalizacja panelu oceny AI
  try {
    initEvaluationUI();
    // Pierwsza ocena po starcie opóźniona, by UI zdążyło wstać
    setTimeout(() => updateEvaluationDisplay(gameState.grid, gameState.currentPlayer), 500);
  } catch (e) {
    console.error("Błąd inicjalizacji panelu oceny:", e);
  }

  window.runGameTests = () => runTests(gameTests);
});