import { moveHistory } from '../core/moveHistory.js';

let selectedSquare = null;
let validMovesForSelected = [];

// Inicjalizacja UI planszy
function initUI() {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const square = document.createElement('div');
      square.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      square.dataset.row = r;
      square.dataset.col = c;
      square.addEventListener('click', () => onSquareClick(r, c));
      boardDiv.appendChild(square);
    }
  }

  updateCurrentPlayerDisplay();
  renderBoard();
}

function updateCurrentPlayerDisplay() {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = `Na ruchu: ${board.currentPlayer}`;
}

function onSquareClick(row, col) {
  if (
    board.grid[row][col] &&
    board.grid[row][col][0] === board.currentPlayer[0]
  ) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    highlightValidMoves(validMovesForSelected);
  } else if (selectedSquare) {
    if (
      validMovesForSelected.some(
        (mv) => mv.toRow === row && mv.toCol === col
      )
    ) {
      makeMove(selectedSquare.row, selectedSquare.col, row, col);
      selectedSquare = null;
      validMovesForSelected = [];
      clearHighlights();
      updateCurrentPlayerDisplay();
      renderBoard();
    } else {
      selectedSquare = null;
      validMovesForSelected = [];
      clearHighlights();
    }
  }
}

function getValidMovesForPiece(row, col) {
  const player = board.currentPlayer;
  const moves = [];

  const directions = player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  directions.forEach(([dr, dc]) => {
    const nr = row + dr;
    const nc = col + dc;
    if (isValidMove(board.grid, row, col, nr, nc, player)) {
      moves.push({ toRow: nr, toCol: nc });
    }
  });

  const captureMoves = getPossibleCaptures(board.grid, row, col, player);
  captureMoves.forEach(([nr, nc]) => {
    moves.push({ toRow: nr, toCol: nc });
  });

  return moves;
}

function highlightValidMoves(moves) {
  clearHighlights();
  moves.forEach(({ toRow, toCol }) => {
    const square = document.querySelector(
      `#board .square[data-row='${toRow}'][data-col='${toCol}']`
    );
    if (square) {
      square.classList.add('highlight');
    }
  });
}

function clearHighlights() {
  document.querySelectorAll('#board .square.highlight').forEach((sq) => {
    sq.classList.remove('highlight');
  });
}

function makeMove(fromRow, fromCol, toRow, toCol) {
  const previousBoard = JSON.parse(JSON.stringify(board.grid));
  const previousPlayer = board.currentPlayer;

  board.grid[toRow][toCol] = board.grid[fromRow][fromCol];
  board.grid[fromRow][fromCol] = 0;

  if (Math.abs(toRow - fromRow) === 2) {
    const capRow = (fromRow + toRow) / 2;
    const capCol = (fromCol + toCol) / 2;
    board.grid[capRow][capCol] = 0;
  }

  board.currentPlayer = board.currentPlayer === 'white' ? 'black' : 'white';

  moveHistory.addMove({
    fromRow,
    fromCol,
    toRow,
    toCol,
    previousBoard,
    previousPlayer,
  });
}

export { initUI, makeMove };
