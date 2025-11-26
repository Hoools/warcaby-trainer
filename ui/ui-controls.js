import { getTopMoves } from '../core/moveGenerator.js';

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

  const bestMovesDiv = document.createElement('div');
  bestMovesDiv.id = 'bestMoves';
  bestMovesDiv.style.marginTop = '10px';
  controlsDiv.appendChild(bestMovesDiv);

  updateBestMovesPanel();
}

function updateBestMovesPanel() {
  const bestMovesDiv = document.getElementById('bestMoves');
  bestMovesDiv.innerHTML = '<strong>3 najlepsze ruchy:</strong><br>';

  const topMoves = getTopMoves(board.grid, board.currentPlayer);

  topMoves.forEach(({ move, score }, idx) => {
    const moveStr = `${move.fromRow},${move.fromCol} → ${move.toRow},${move.toCol}`;
    const moveButton = document.createElement('button');
    moveButton.textContent = `${idx + 1}. ${moveStr} (ocena: ${score.toFixed(2)})`;
    moveButton.onclick = () => {
      highlightMoveOnBoard(move);
    };
    bestMovesDiv.appendChild(moveButton);
    bestMovesDiv.appendChild(document.createElement('br'));
  });
}

function highlightMoveOnBoard(move) {
  // Podświetl ruch wybrany w panelu najlepszych ruchów
  clearHighlights();

  const fromSquare = document.querySelector(
    `#board .square[data-row='${move.fromRow}'][data-col='${move.fromCol}']`
  );
  const toSquare = document.querySelector(
    `#board .square[data-row='${move.toRow}'][data-col='${move.toCol}']`
  );

  if (fromSquare) fromSquare.classList.add('highlight-best-move');
  if (toSquare) toSquare.classList.add('highlight-best-move');
}

function clearHighlights() {
  document.querySelectorAll('#board .square.highlight-best-move').forEach((sq) => {
    sq.classList.remove('highlight-best-move');
  });
}

export { initControls, updateBestMovesPanel };
