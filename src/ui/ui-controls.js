// src/ui/ui-controls.js
import { gameState, initGame } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { renderBoard, updateCurrentPlayerDisplay, initUI } from './ui-board.js';

export function initControls() {
  const controlsDiv = document.getElementById('controls');
  if (!controlsDiv) return;
  controlsDiv.innerHTML = '';

  // Przycisk Cofnij
  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Cofnij ruch';
  undoBtn.onclick = () => {
    const lastMove = moveHistory.undoMove();
    if (lastMove) {
      // Przywróć stan planszy z historii
      gameState.grid = JSON.parse(JSON.stringify(lastMove.previousBoard));
      gameState.currentPlayer = lastMove.previousPlayer;
      
      // Odśwież UI
      updateCurrentPlayerDisplay();
      renderBoard();
      // Wyczyść ewentualne komunikaty/podświetlenia w panelu (jeśli będą)
      updateBestMovesPanel(); 
    }
  };
  controlsDiv.appendChild(undoBtn);

  // Przycisk Restart
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Restartuj grę';
  resetBtn.onclick = () => {
    moveHistory.clear();
    initGame(); // Resetuje dane w gameState
    initUI();   // Rysuje planszę od nowa
    updateCurrentPlayerDisplay();
    updateBestMovesPanel();
  };
  controlsDiv.appendChild(resetBtn);

  // Kontener na najlepsze ruchy (na przyszłość)
  const bestMovesDiv = document.createElement('div');
  bestMovesDiv.id = 'bestMoves';
  bestMovesDiv.style.marginTop = '10px';
  controlsDiv.appendChild(bestMovesDiv);
}

export function updateBestMovesPanel() {
    const bestMovesDiv = document.getElementById('bestMoves');
    if(bestMovesDiv) bestMovesDiv.innerHTML = ''; 
    // Tu w przyszłości wepniemy logikę AI/podpowiedzi
}
