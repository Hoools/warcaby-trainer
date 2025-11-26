// src/ui/ui-board.js
import { gameState } from '../core/gameState.js'; // Import stanu!
import { moveHistory } from '../core/moveHistory.js';
import { isValidMove, getPossibleCaptures } from '../core/rules.js';

let selectedSquare = null;
let validMovesForSelected = [];

export function initUI() {
  const boardDiv = document.getElementById('board');
  if (!boardDiv) return; // Zabezpieczenie
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
      const piece = gameState.grid[r][c];
      square.textContent = piece ? piece : '';
      
      // Opcjonalnie: dodanie klasy dla stylizacji CSS pionków
      square.setAttribute('data-piece', piece || '');
    }
  }
}

function onSquareClick(row, col) {
  // Logika obsługi kliknięcia korzystająca z gameState.grid
  const piece = gameState.grid[row][col];
  
  if (piece && piece[0] === gameState.currentPlayer[0]) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    highlightValidMoves(validMovesForSelected);
  } else if (selectedSquare) {
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
  // Tutaj logika sprawdzania ruchów (uproszczona na potrzeby naprawy)
  // Pamiętaj, żeby w rules.js też przyjmować (board, ...) a nie polegać na globalnym
  
  // Przykład prosty:
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; 
  directions.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if(isValidMove(gameState.grid, row, col, nr, nc, player)) {
          moves.push({ toRow: nr, toCol: nc });
      }
  });
  
  return moves;
}

function highlightValidMoves(moves) {
  clearHighlights();
  moves.forEach(({ toRow, toCol }) => {
    const square = document.querySelector(`#board .square[data-row='${toRow}'][data-col='${toCol}']`);
    if (square) square.classList.add('highlight');
  });
}

function clearHighlights() {
  document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
}

export function makeMove(fromRow, fromCol, toRow, toCol) {
  const previousBoard = JSON.parse(JSON.stringify(gameState.grid));
  const previousPlayer = gameState.currentPlayer;

  // Przesunięcie
  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  // Zmiana gracza
  gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
  
  // Zapisz historię
  moveHistory.addMove({
      fromRow, fromCol, toRow, toCol,
      previousBoard, previousPlayer
  });
}
