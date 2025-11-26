// src/ui/ui-board.js
import { gameState } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { isValidMove, getPossibleCapturesForPiece, hasAnyCapture } from '../core/rules.js';

let selectedSquare = null;
let validMovesForSelected = [];
let pieceLockedForCapture = false; 
let pendingCaptures = []; 

// ... (zachowaj initUI i updateCurrentPlayerDisplay bez zmian) ...
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
      square.classList.remove('highlight');
      
      const pieceCode = gameState.grid[r][c]; 
      if (pieceCode !== 0) {
        const pieceDiv = document.createElement('div');
        pieceDiv.classList.add('piece');
        if (typeof pieceCode === 'string') {
             if (pieceCode.includes('white')) pieceDiv.classList.add('white');
             if (pieceCode.includes('black')) pieceDiv.classList.add('black');
             if (pieceCode.includes('king')) pieceDiv.classList.add('king');
        }
        
        // Duchy zbitych pionków
        if (pendingCaptures.some(cap => cap.r === r && cap.c === c)) {
            pieceDiv.style.opacity = '0.5'; 
        }

        square.appendChild(pieceDiv);
      }
    }
  }
  highlightValidMoves(validMovesForSelected);
}

// ... (onSquareClick i getValidMovesForPiece bez zmian) ...
function onSquareClick(row, col) {
  if (pieceLockedForCapture) {
      if (selectedSquare.row === row && selectedSquare.col === col) return;
      const move = validMovesForSelected.find(m => m.toRow === row && m.toCol === col);
      if (move) makeMove(selectedSquare.row, selectedSquare.col, row, col, true);
      else console.log("Musisz dokończyć bicie!");
      return;
  }

  const piece = gameState.grid[row][col];
  if (pendingCaptures.some(cap => cap.r === row && cap.c === col)) return;

  if (piece && typeof piece === 'string' && piece.startsWith(gameState.currentPlayer)) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    renderBoard(); 
  } 
  else if (selectedSquare) {
    const move = validMovesForSelected.find((m) => m.toRow === row && m.toCol === col);
    if (move) makeMove(selectedSquare.row, selectedSquare.col, row, col, move.isCapture);
    else {
      selectedSquare = null;
      validMovesForSelected = [];
      renderBoard();
    }
  }
}

function getValidMovesForPiece(row, col) {
  const player = gameState.currentPlayer;
  const mandatoryCapture = hasAnyCapture(gameState.grid, player);
  const captureMoves = getPossibleCapturesForPiece(gameState.grid, row, col, pendingCaptures);
  
  if (mandatoryCapture) {
    return captureMoves.length > 0 ? captureMoves.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true })) : [];
  } else {
    // Jeśli nie ma przymusu, sprawdź zwykłe ruchy (isValidMove obsługuje teraz damki)
    const simpleMoves = [];
    // Dla damki musimy sprawdzić wszystkie 4 przekątne do końca
    // Uproszczenie: sprawdzamy każde pole na planszy (mało wydajne, ale pewne dla początkujących)
    // Lepsza wersja: Skanowanie po przekątnych od (row, col)
    
    const piece = gameState.grid[row][col];
    const isKing = piece.includes('king');
    
    if (isKing) {
        // Skanuj 4 kierunki
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        directions.forEach(([dr, dc]) => {
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r < 10 && c >= 0 && c < 10) {
                if (isValidMove(gameState.grid, row, col, r, c, player)) {
                    simpleMoves.push({ toRow: r, toCol: c, isCapture: false });
                } else {
                    break; // Jeśli napotkasz przeszkodę, dalej nie sprawdzaj
                }
                r += dr;
                c += dc;
            }
        });
    } else {
        // Zwykły pionek
        const directions = player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
        directions.forEach(([dr, dc]) => {
           if (isValidMove(gameState.grid, row, col, row+dr, col+dc, player)) {
               simpleMoves.push({ toRow: row+dr, toCol: col+dc, isCapture: false });
           }
        });
    }
    return simpleMoves;
  }
}

// --- Helper do znajdowania zbitego pionka przy "latającym" biciu damką ---
function findCapturedPieceBetween(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    let r = r1 + dr;
    let c = c1 + dc;
    while (r !== r2) {
        if (gameState.grid[r][c] !== 0) return { r, c };
        r += dr;
        c += dc;
    }
    return null;
}

export function makeMove(fromRow, fromCol, toRow, toCol, isCapture) {
  const previousBoard = JSON.parse(JSON.stringify(gameState.grid));
  const previousPlayer = gameState.currentPlayer;

  // Przesuń (jeśli to damka, to zachowuje status damki)
  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  let moreCapturesAvailable = false;

  if (isCapture) {
    // Znajdź zbitego pionka (dla damki może być gdzieś pomiędzy)
    const captured = findCapturedPieceBetween(fromRow, fromCol, toRow, toCol);
    if (captured) {
        pendingCaptures.push(captured);
    }

    const nextCaptures = getPossibleCapturesForPiece(gameState.grid, toRow, toCol, pendingCaptures);
    if (nextCaptures.length > 0) {
      moreCapturesAvailable = true;
      pieceLockedForCapture = true;
      selectedSquare = { row: toRow, col: toCol };
      validMovesForSelected = nextCaptures.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
      renderBoard(); 
      return;
    }
  }

  // Koniec tury
  if (!moreCapturesAvailable) {
      // Usuń zbite
      pendingCaptures.forEach(cap => { gameState.grid[cap.r][cap.c] = 0; });
      pendingCaptures = [];

      // --- PROMOCJA NA DAMKĘ ---
      // Sprawdzamy czy pionek stanął na końcu planszy
      const piece = gameState.grid[toRow][toCol];
      if (piece && !piece.includes('king')) {
          if (gameState.currentPlayer === 'white' && toRow === 0) {
              gameState.grid[toRow][toCol] = 'white_king';
          }
          if (gameState.currentPlayer === 'black' && toRow === 9) {
              gameState.grid[toRow][toCol] = 'black_king';
          }
      }

      // Zmiana gracza
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
