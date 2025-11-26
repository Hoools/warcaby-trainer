// src/ui/ui-board.js
import { gameState } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { isValidMove, getPossibleCapturesForPiece, hasAnyCapture } from '../core/rules.js';

let selectedSquare = null;
let validMovesForSelected = [];
let pieceLockedForCapture = false; // Nowa zmienna stanu: blokuje pionek do multijump

export function initUI() {
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

export function updateCurrentPlayerDisplay() {
  const statusDiv = document.getElementById('status');
  if (statusDiv) statusDiv.textContent = `Na ruchu: ${gameState.currentPlayer}`;
}

export function renderBoard() {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const square = document.querySelector(`#board .square[data-row='${r}'][data-col='${c}']`);
      if (square) {
        const piece = gameState.grid[r][c];
        square.textContent = piece !== 0 ? (piece === 'white' ? 'W' : 'B') : '';
      }
    }
  }
}

function onSquareClick(row, col) {
  // Jeśli pionek jest zablokowany, ignoruj kliknięcia na inne pionki
  if (pieceLockedForCapture && (selectedSquare.row !== row || selectedSquare.col !== col)) {
    console.warn("Musisz kontynuować bicie tym samym pionkiem.");
    return;
  }

  const piece = gameState.grid[row][col];
  // Wybierz pionka
  if (piece && (typeof piece === 'string' ? piece[0] : '') === gameState.currentPlayer[0]) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    highlightValidMoves(validMovesForSelected);
  } 
  // Wykonaj ruch
  else if (selectedSquare) {
    const move = validMovesForSelected.find((m) => m.toRow === row && m.toCol === col);
    if (move) {
      makeMove(selectedSquare.row, selectedSquare.col, row, col, move.isCapture);
    } else {
      // Odznacz, jeśli kliknięto puste pole bez legalnego ruchu
      if (!pieceLockedForCapture) {
         selectedSquare = null;
         validMovesForSelected = [];
         clearHighlights();
      }
    }
  }
}

function getValidMovesForPiece(row, col) {
  const player = gameState.currentPlayer;
  const mandatoryCapture = hasAnyCapture(gameState.grid, player);
  
  const captureMoves = getPossibleCapturesForPiece(gameState.grid, row, col);
  
  if (mandatoryCapture) {
    // Jeśli jest obowiązek bicia, zwracaj tylko ruchy bicia
    return captureMoves.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
  } else {
    // W przeciwnym razie - ruchy proste
    const simpleMoves = [];
    const directions = player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    directions.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (isValidMove(gameState.grid, row, col, nr, nc, player)) {
        simpleMoves.push({ toRow: nr, toCol: nc, isCapture: false });
      }
    });
    return simpleMoves;
  }
}

export function makeMove(fromRow, fromCol, toRow, toCol, isCapture) {
  const previousBoard = JSON.parse(JSON.stringify(gameState.grid));
  const previousPlayer = gameState.currentPlayer;

  // Przesuń pionek
  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  let moreCapturesAvailable = false;

  if (isCapture) {
    // Usuń zbity pionek
    const capRow = (fromRow + toRow) / 2;
    const capCol = (fromCol + toCol) / 2;
    gameState.grid[capRow][capCol] = 0;

    // Sprawdź, czy są dalsze bicia z NOWEJ pozycji
    const nextCaptures = getPossibleCapturesForPiece(gameState.grid, toRow, toCol);
    if (nextCaptures.length > 0) {
      moreCapturesAvailable = true;
      
      // TURA NIE KOŃCZY SIĘ! Zablokuj pionek i pokaż następne ruchy.
      pieceLockedForCapture = true;
      selectedSquare = { row: toRow, col: toCol };
      validMovesForSelected = nextCaptures.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
      
      clearHighlights();
      highlightValidMoves(validMovesForSelected);
    }
  }

  // Zmień gracza tylko wtedy, gdy tura się faktycznie zakończyła
  if (!moreCapturesAvailable) {
    gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
    pieceLockedForCapture = false;
    selectedSquare = null;
    validMovesForSelected = [];
    clearHighlights();
  }
  
  // Zapisz historię i odśwież widok
  moveHistory.addMove({ fromRow, fromCol, toRow, toCol, previousBoard, previousPlayer });
  updateCurrentPlayerDisplay();
  renderBoard();
}

function highlightValidMoves(moves) {
  clearHighlights();
  moves.forEach(({ toRow, toCol }) => {
    const square = document.querySelector(`#board .square[data-row='${toRow}'][data-col='${toCol}']`);
    if (square) square.classList.add('highlight');
  });
}

function clearHighlights() {
  document.querySelectorAll('.highlight').forEach((sq) => sq.classList.remove('highlight'));
}
