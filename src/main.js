// src/main.js
import { initGame } from './core/gameState.js';
import { initUI } from './ui/ui-board.js';
import { initControls } from './ui/ui-controls.js';

// TESTY
import { runTests } from '../tests/testRunner.js';
import { gameTests } from '../tests/gameTests.js';

document.addEventListener('DOMContentLoaded', () => {
  initGame();
  initUI();
  initControls();

  // Dodaj przycisk do uruchamiania testów w UI
  const controls = document.getElementById('controls');
  const testBtn = document.createElement('button');
  testBtn.textContent = "Uruchom Testy";
  testBtn.style.backgroundColor = "#e74c3c"; // Czerwony dla wyróżnienia
  testBtn.onclick = () => runTests(gameTests);
  controls.appendChild(testBtn);
});
