// src/main.js
import { initGame } from './core/gameState.js';
import { initUI } from './ui/ui-board.js';
import { initControls } from './ui/ui-controls.js';

document.addEventListener('DOMContentLoaded', () => {
  initGame();      // 1. Stwórz stan gry
  initUI();        // 2. Narysuj planszę
  initControls();  // 3. Podepnij przyciski
});
