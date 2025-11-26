import { moveHistory } from '../core/moveHistory.js';

function initControls() {
  const controlsDiv = document.getElementById('controls');
  controlsDiv.innerHTML = '';

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Cofnij ruch';
  undoBtn.onclick = () => {
    const lastMove = moveHistory.undoMove();
    if (lastMove) {
      // Przywróć stan planszy - uproszczony przykład
      board.grid = lastMove.previousBoard;
      board.currentPlayer = lastMove.previousPlayer;
      updateCurrentPlayerDisplay();
      renderBoard();
    }
  };
  controlsDiv.appendChild(undoBtn);

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Restartuj grę';
  resetBtn.onclick = () => {
    moveHistory.clear();
    board = new Board();
    updateCurrentPlayerDisplay();
    renderBoard();
  };
  controlsDiv.appendChild(resetBtn);
}

export { initControls };
