// src/ui/ui-board.js
import { gameState } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { isValidMove, getPossibleCapturesForPiece, hasAnyCapture } from '../core/rules.js';

let selectedSquare = null;
let validMovesForSelected = [];
let pieceLockedForCapture = false; 

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
  if (statusDiv) {
      // Tłumaczenie na polski dla UI
      const plName = gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne';
      statusDiv.textContent = `Na ruchu: ${plName}`;
  }
}

export function renderBoard() {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const square = document.querySelector(`#board .square[data-row='${r}'][data-col='${c}']`);
      if (!square) continue;

      // Wyczyść zawartość
      square.innerHTML = '';
      
      const pieceCode = gameState.grid[r][c]; // np. 'white', 'black', 'white_king'
      if (pieceCode) {
        const pieceDiv = document.createElement('div');
        pieceDiv.classList.add('piece');
        
        // Rozpoznawanie koloru
        if (pieceCode.includes('white')) pieceDiv.classList.add('white');
        if (pieceCode.includes('black')) pieceDiv.classList.add('black');
        
        // Rozpoznawanie damki (king) - opcjonalnie na przyszłość
        if (pieceCode.includes('king') || pieceCode === pieceCode.toUpperCase() && pieceCode.length === 1) { 
             // (Dla uproszczonego modelu 'W'/'B' vs 'w'/'b' z poprzednich kroków)
             // Ale w gameState mamy 'white'/'black'. Dodamy klasę king w przyszłości.
        }

        square.appendChild(pieceDiv);
      }
      
      // Jeśli pole jest podświetlone jako możliwe
      if (square.classList.contains('highlight')) {
          // Styl CSS załatwia kropkę, nie trzeba tu nic dodawać
      }
    }
  }
}

function onSquareClick(row, col) {
  // Jeśli mamy przymus kontynuacji bicia
  if (pieceLockedForCapture) {
      if (selectedSquare.row === row && selectedSquare.col === col) {
          // Kliknięto na ten sam pionek - ok, nic nie rób
          return;
      }
      // Sprawdź czy kliknięto na dostępne pole docelowe
      const move = validMovesForSelected.find(m => m.toRow === row && m.toCol === col);
      if (move) {
          makeMove(selectedSquare.row, selectedSquare.col, row, col, true);
      } else {
          console.log("Musisz dokończyć bicie tym pionkiem!");
      }
      return;
  }

  const piece = gameState.grid[row][col];
  
  // Wybór własnego pionka
  if (piece && piece.startsWith(gameState.currentPlayer)) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    
    // Renderuj planszę od nowa żeby wyczyścić poprzednie podświetlenia
    clearHighlights(); 
    highlightValidMoves(validMovesForSelected);
  } 
  // Ruch na puste pole
  else if (selectedSquare) {
    const move = validMovesForSelected.find((m) => m.toRow === row && m.toCol === col);
    if (move) {
      makeMove(selectedSquare.row, selectedSquare.col, row, col, move.isCapture);
    } else {
      // Kliknięcie w puste pole bez ruchu = odznaczenie
      selectedSquare = null;
      validMovesForSelected = [];
      clearHighlights();
    }
  }
}

function getValidMovesForPiece(row, col) {
  const player = gameState.currentPlayer;
  // Sprawdź czy na CAŁEJ planszy jest przymus bicia
  const mandatoryCapture = hasAnyCapture(gameState.grid, player);
  
  const captureMoves = getPossibleCapturesForPiece(gameState.grid, row, col);
  
  // Jeśli jest przymus bicia:
  if (mandatoryCapture) {
    // Jeśli ten pionek może bić, pokaż mu bicia.
    if (captureMoves.length > 0) {
        return captureMoves.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
    } else {
        // Jeśli inny pionek musi bić, ten nie może się ruszyć.
        return [];
    }
  } 
  // Brak przymusu bicia - zwykłe ruchy
  else {
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

  // Przesuń w danych
  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  let moreCapturesAvailable = false;

  if (isCapture) {
    // Usuń zbity pionek
    const capRow = (fromRow + toRow) / 2;
    const capCol = (fromCol + toCol) / 2;
    gameState.grid[capRow][capCol] = 0;

    // Sprawdź, czy ten sam pionek z NOWEGO miejsca może bić dalej
    const nextCaptures = getPossibleCapturesForPiece(gameState.grid, toRow, toCol);
    if (nextCaptures.length > 0) {
      moreCapturesAvailable = true;
      
      // Zablokuj stan gry na tym pionku
      pieceLockedForCapture = true;
      selectedSquare = { row: toRow, col: toCol };
      validMovesForSelected = nextCaptures.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
      
      // Odśwież widok z podświetleniem tylko kolejnych skoków
      renderBoard(); // przerysuj pionki
      highlightValidMoves(validMovesForSelected);
      
      console.log("Wielokrotne bicie dostępne!");
      return; // WAŻNE: Nie zmieniamy gracza, wychodzimy z funkcji
    }
  }

  // Koniec tury
  gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
  pieceLockedForCapture = false;
  selectedSquare = null;
  validMovesForSelected = [];
  
  moveHistory.addMove({ fromRow, fromCol, toRow, toCol, previousBoard, previousPlayer });
  
  updateCurrentPlayerDisplay();
  renderBoard(); // przerysuj wszystko na czysto
}

function highlightValidMoves(moves) {
  moves.forEach(({ toRow, toCol }) => {
    const square = document.querySelector(`#board .square[data-row='${toRow}'][data-col='${toCol}']`);
    if (square) square.classList.add('highlight');
  });
}

function clearHighlights() {
  document.querySelectorAll('.highlight').forEach(sq => sq.classList.remove('highlight'));
}
