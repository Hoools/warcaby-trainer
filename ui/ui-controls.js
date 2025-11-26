import { selectBestMove } from '../core/ai.js';

let aiEnabled = false;
let aiPlayer = 'black'; // domyślnie AI gra czarnymi
let aiDepth = 3;

function initControls() {
  const controlsDiv = document.getElementById('controls');
  controlsDiv.innerHTML = '';

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Cofnij ruch';
  undoBtn.onclick = () => {
    const lastMove = moveHistory.undoMove();
    if (lastMove) {
      board.grid = lastMove.previousBoard;
      board.currentPlayer = lastMove.previousPlayer;
      updateCurrentPlayerDisplay();
      renderBoard();
      updateBestMovesPanel();
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
    updateBestMovesPanel();
  };
  controlsDiv.appendChild(resetBtn);

  const aiToggle = document.createElement('button');
  aiToggle.textContent = 'Włącz/Wyłącz AI';
  aiToggle.onclick = () => {
    aiEnabled = !aiEnabled;
    aiToggle.textContent = aiEnabled ? 'Wyłącz AI' : 'Włącz AI';
    if (aiEnabled && board.currentPlayer === aiPlayer) {
      makeAIMove();
    }
  };
  controlsDiv.appendChild(aiToggle);

  updateBestMovesPanel();
}

async function makeAIMove() {
  if (!aiEnabled) return;
  if (board.currentPlayer !== aiPlayer) return;

  // Można dodać pewne opóźnienie wizualne
  const move = selectBestMove(board.grid, board.currentPlayer, aiDepth);
  if (move) {
    makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
    updateCurrentPlayerDisplay();
    renderBoard();
    updateBestMovesPanel();

    // Jeśli po ruchu AI jest ponowna tura AI (np. wielokrotne bicie)
    if (board.currentPlayer === aiPlayer) {
      await new Promise(r => setTimeout(r, 500));
      makeAIMove();
    }
  }
}

export { initControls, makeAIMove };
