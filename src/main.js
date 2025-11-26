// src/main.js
import { initGame } from './core/gameState.js';
import { initUI } from './ui/ui-board.js';
import { initControls } from './ui/ui-controls.js';

// Zmiana ścieżki (kropka zamiast dwóch kropek)
import { runTests } from './tests/testRunner.js'; 
import { gameTests } from './tests/gameTests.js';

document.addEventListener('DOMContentLoaded', () => {
  initGame();
  initUI();
  initControls();

  // Przycisk testów
  const controls = document.getElementById('controls');
  if (controls) {
      const testBtn = document.createElement('button');
      testBtn.textContent = "Uruchom Testy";
      testBtn.style.backgroundColor = "#e74c3c";
      testBtn.style.marginLeft = "10px";
      testBtn.onclick = () => runTests(gameTests);
      controls.appendChild(testBtn);
  }
});
