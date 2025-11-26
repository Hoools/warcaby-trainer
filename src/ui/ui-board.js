// src/ui/ui-board.js
import { gameState } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { isValidMove, getPossibleCapturesForPiece, hasAnyCapture } from '../core/rules.js';

let selectedSquare = null;
let validMovesForSelected = [];
let pieceLockedForCapture = false; 

// Tablica przechowująca współrzędne pionków zbitych w bieżącej sekwencji
let pendingCaptures = []; 

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
      const plName = gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne';
      statusDiv.textContent = `Na ruchu: ${plName}`;
  }
}

export function renderBoard() {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const square = document.querySelector(`#board .square[data-row='${r}'][data-col='${c}']`);
      if (!square) continue;
      square.innerHTML = '';
      square.classList.remove('highlight'); // Czyścimy stare podświetlenia przy renderowaniu
      
      const pieceCode = gameState.grid[r][c]; 
      if (pieceCode !== 0) {
        const pieceDiv = document.createElement('div');
        pieceDiv.classList.add('piece');
        if (typeof pieceCode === 'string') {
             if (pieceCode.includes('white')) pieceDiv.classList.add('white');
             if (pieceCode.includes('black')) pieceDiv.classList.add('black');
             if (pieceCode.includes('king')) pieceDiv.classList.add('king');
        }
        
        // Jeśli pionek jest na liście "do usunięcia" (już przeskoczony), oznacz go wizualnie (opcjonalne)
        if (pendingCaptures.some(cap => cap.r === r && cap.c === c)) {
            pieceDiv.style.opacity = '0.5'; // Przeskoczony pionek jest "duchem"
        }

        square.appendChild(pieceDiv);
      }
    }
  }
  
  // Ponowne nałożenie podświetleń, jeśli są jakieś aktywne
  highlightValidMoves(validMovesForSelected);
}

function onSquareClick(row, col) {
  if (pieceLockedForCapture) {
      if (selectedSquare.row === row && selectedSquare.col === col) return;
      
      const move = validMovesForSelected.find(m => m.toRow === row && m.toCol === col);
      if (move) {
          makeMove(selectedSquare.row, selectedSquare.col, row, col, true);
      } else {
          console.log("Musisz dokończyć bicie tym pionkiem!");
      }
      return;
  }

  const piece = gameState.grid[row][col];
  // Nie można wybrać pionka, który już został "przeskoczony" w tej turze (jest w pendingCaptures)
  if (pendingCaptures.some(cap => cap.r === row && cap.c === col)) return;

  if (piece && typeof piece === 'string' && piece.startsWith(gameState.currentPlayer)) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    renderBoard(); // Odśwież, by usunąć stare podświetlenia
  } 
  else if (selectedSquare) {
    const move = validMovesForSelected.find((m) => m.toRow === row && m.toCol === col);
    if (move) {
      makeMove(selectedSquare.row, selectedSquare.col, row, col, move.isCapture);
    } else {
      selectedSquare = null;
      validMovesForSelected = [];
      renderBoard();
    }
  }
}

function getValidMovesForPiece(row, col) {
  const player = gameState.currentPlayer;
  const mandatoryCapture = hasAnyCapture(gameState.grid, player);
  const captureMoves = getPossibleCapturesForPiece(gameState.grid, row, col, pendingCaptures); // Przekazujemy pendingCaptures!
  
  if (mandatoryCapture) {
    if (captureMoves.length > 0) {
        return captureMoves.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
    } else {
        return [];
    }
  } else {
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

  // Przesuń pionka
  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  let moreCapturesAvailable = false;

  if (isCapture) {
    // Znajdź pozycję zbitego pionka
    const capRow = (fromRow + toRow) / 2;
    const capCol = (fromCol + toCol) / 2;
    
    // Zamiast usuwać, dodaj do listy oczekujących na usunięcie
    pendingCaptures.push({ r: capRow, c: capCol });

    // Sprawdź, czy są dalsze bicia z nowej pozycji
    // WAŻNE: Musimy przekazać pendingCaptures do reguł, aby nie można było przeskoczyć tego samego!
    const nextCaptures = getPossibleCapturesForPiece(gameState.grid, toRow, toCol, pendingCaptures);
    
    if (nextCaptures.length > 0) {
      moreCapturesAvailable = true;
      pieceLockedForCapture = true;
      selectedSquare = { row: toRow, col: toCol };
      validMovesForSelected = nextCaptures.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
      
      renderBoard(); 
      return; // Kontynuuj turę
    }
  }

  // Jeśli koniec sekwencji bicia (lub zwykły ruch)
  if (!moreCapturesAvailable) {
      // TERAZ faktycznie usuń wszystkie zbite pionki z planszy
      pendingCaptures.forEach(cap => {
          gameState.grid[cap.r][cap.c] = 0;
      });
      pendingCaptures = []; // Wyczyść listę

      // Zmień gracza
      gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      pieceLockedForCapture = false;
      selectedSquare = null;
      validMovesForSelected = [];
      
      moveHistory.addMove({ fromRow, fromCol, toRow, toCol, previousBoard, previousPlayer });
      
      updateCurrentPlayerDisplay();
      renderBoard();
  }
}

function highlightValidMoves(moves) {
  moves.forEach(({ toRow, toCol }) => {
    const square = document.querySelector(`#board .square[data-row='${toRow}'][data-col='${toCol}']`);
    if (square) square.classList.add('highlight');
  });
}
