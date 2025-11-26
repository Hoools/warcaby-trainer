import { initGame } from './core/gameState.js';
import { initUI } from './ui/ui-board.js';
import { initControls } from './ui/ui-controls.js';
import { runTests } from './tests/testRunner.js';
import { gameTests } from './tests/gameTests.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("Inicjalizacja aplikacji...");
  
  initGame();     // Resetuje stan gry
  initUI();       // Rysuje planszę
  initControls(); // Rysuje przyciski (Restart, Cofnij, Edytor)

  // Opcjonalnie: Dodatkowy przycisk testów w konsoli lub UI
  // (W ui-controls.js dodaliśmy już przyciski, ale testy można wywołać ręcznie)
  window.runGameTests = () => runTests(gameTests);
});