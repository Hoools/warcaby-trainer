import { gameState } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { isValidMove, getPossibleCaptures } from '../core/rules.js';

let selectedSquare = null;
let validMovesForSelected = [];

export function initUI() {
  const boardDiv = document.getElementById('board');
  if (!boardDiv) return;
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

export function updateCurrentPlayerDisplay() {
  const statusDiv = document.getElementById('status');
  if (statusDiv) statusDiv.textContent = `Na ruchu: ${gameState.currentPlayer}`;
}

export function renderBoard() {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const square = document.querySelector(
        `#board .square[data-row='${r}'][data-col='${c}']`
      );
      if (square) {
        const piece = gameState.grid[r][c];
        square.textContent = piece !== 0 ? piece : '';
      }
    }
  }
}

function onSquareClick(row, col) {
  const piece = gameState.grid[row][col];
  
  // Select piece
  if (piece && (typeof piece === 'string' ? piece[0] : '') === gameState.currentPlayer[0]) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    highlightValidMoves(validMovesForSelected);
  } 
  // Move to selected square
  else if (selectedSquare) {
    if (validMovesForSelected.some((mv) => mv.toRow === row && mv.toCol === col)) {
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
  const player = gameState.currentPlayer;
  const moves = [];
  
  // Check simple moves
  const directions = player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  directions.forEach(([dr, dc]) => {
    const nr = row + dr;
    const nc = col + dc;
    // Pass gameState.grid explicitly
    if (isValidMove(gameState.grid, row, col, nr, nc, player)) {
      moves.push({ toRow: nr, toCol: nc });
    }
  });

  // Check captures
  const captureMoves = getPossibleCaptures(gameState.grid, row, col, player);
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
    if (square) square.classList.add('highlight');
  });
}

function clearHighlights() {
  document.querySelectorAll('.highlight').forEach((sq) => {
    sq.classList.remove('highlight');
  });
}

export function makeMove(fromRow, fromCol, toRow, toCol) {
  const previousBoard = JSON.parse(JSON.stringify(gameState.grid));
  const previousPlayer = gameState.currentPlayer;

  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  // Capture logic
  if (Math.abs(toRow - fromRow) === 2) {
    const capRow = (fromRow + toRow) / 2;
    const capCol = (fromCol + toCol) / 2;
    gameState.grid[capRow][capCol] = 0;
  }

  gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';

  moveHistory.addMove({
    fromRow, fromCol, toRow, toCol,
    previousBoard, previousPlayer
  });
}
