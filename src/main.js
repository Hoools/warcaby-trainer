import { initGame } from './core/gameState.js';
import { initUI } from './ui/ui-board.js';
import { initControls } from './ui/ui-controls.js';

console.log("Starting application...");

document.addEventListener('DOMContentLoaded', () => {
  initGame();      // Initialize data
  initUI();        // Draw board
  initControls();  // Bind buttons
  console.log("Application started.");
});
