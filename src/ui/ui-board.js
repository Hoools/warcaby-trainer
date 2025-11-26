// src/ui/ui-board.js
import { gameState } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { isValidMove, getPossibleCapturesForPiece, hasAnyCapture } from '../core/rules.js';

let selectedSquare = null;
let validMovesForSelected = [];
let pieceLockedForCapture = false; 
let pendingCaptures = []; 

export function initUI() {
  const boardDiv = document.getElementById('board');
  if (!boardDiv) return;
  boardDiv.innerHTML = '';

  let squareNumber = 1;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const isDark = (r + c) % 2 !== 0;
      const square = document.createElement('div');
      square.className = 'square ' + (isDark ? 'dark' : 'light');
      square.dataset.row = r;
      square.dataset.col = c;
      square.addEventListener('click', () => onSquareClick(r, c));

      // Numeracja pól (1-50)
      if (isDark) {
          const numberSpan = document.createElement('span');
          numberSpan.className = 'square-number';
          numberSpan.textContent = squareNumber++;
          square.appendChild(numberSpan);
      }

      boardDiv.appendChild(square);
    }
  }
  
  // Obsługa przycisku kopiowania
  const copyBtn = document.getElementById('copy-state-btn');
  if(copyBtn) {
      copyBtn.onclick = () => {
          const output = document.getElementById('board-state-output');
          if(output) {
            const text = output.textContent;
            navigator.clipboard.writeText(text);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Skopiowano!";
            setTimeout(() => copyBtn.textContent = originalText, 1500);
          }
      };
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
  let squareNumber = 1; // Reset licznika dla numeracji

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      // Pobierz element pola
      const square = document.querySelector(`#board .square[data-row='${r}'][data-col='${c}']`);
      
      const isDark = (r + c) % 2 !== 0;
      // Oblicz numer pola, nawet jeśli square nie istnieje (aby zachować ciągłość licznika)
      let currentNum = isDark ? squareNumber++ : null;

      if (!square) continue; // Jeśli błąd DOM, pomiń rysowanie

      // Czyścimy zawartość (usuwamy stare pionki i numerki)
      square.innerHTML = '';
      square.classList.remove('highlight');
      
      // Przywróć numer pola
      if (currentNum !== null) {
          const numberSpan = document.createElement('span');
          numberSpan.className = 'square-number';
          numberSpan.textContent = currentNum;
          square.appendChild(numberSpan);
      }
      
      // Rysuj pionek
      const pieceCode = gameState.grid[r][c]; 
      if (pieceCode !== 0) {
        const pieceDiv = document.createElement('div');
        pieceDiv.classList.add('piece');
        
        if (typeof pieceCode === 'string') {
             if (pieceCode.includes('white')) pieceDiv.classList.add('white');
             if (pieceCode.includes('black')) pieceDiv.classList.add('black');
             if (pieceCode.includes('king')) pieceDiv.classList.add('king');
        }
        
        if (pendingCaptures.some(cap => cap.r === r && cap.c === c)) {
            pieceDiv.style.opacity = '0.4'; 
        }

        square.appendChild(pieceDiv);
      }
    }
  }

  // Podświetlenia
  highlightValidMoves(validMovesForSelected);

  // Aktualizacja panelu bocznego (Safe Mode)
  try {
      updateBoardStateDisplay();
  } catch (e) {
      console.warn("Błąd aktualizacji panelu bocznego:", e);
  }
}

function updateBoardStateDisplay() {
    const outputDiv = document.getElementById('board-state-output');
    if (!outputDiv) return;

    const whitePieces = [];
    const whiteKings = [];
    const blackPieces = [];
    const blackKings = [];

    let squareNum = 1;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            if ((r + c) % 2 !== 0) { // Tylko czarne pola
                const piece = gameState.grid[r][c];
                if (piece) {
                    if (piece === 'white') whitePieces.push(squareNum);
                    else if (piece === 'white_king') whiteKings.push(squareNum);
                    else if (piece === 'black') blackPieces.push(squareNum);
                    else if (piece === 'black_king') blackKings.push(squareNum);
                }
                squareNum++;
            }
        }
    }

    const stateText = `Current Player: ${gameState.currentPlayer.toUpperCase()}

WHITE:
- Men: [${whitePieces.join(', ')}]
- Kings: [${whiteKings.join(', ')}]

BLACK:
- Men: [${blackPieces.join(', ')}]
- Kings: [${blackKings.join(', ')}]

Total: ${whitePieces.length + whiteKings.length + blackPieces.length + blackKings.length}`;

    outputDiv.textContent = stateText;
}

function onSquareClick(row, col) {
  // Tryb edytora
  if (gameState.isEditorMode) {
      if ((row + col) % 2 !== 0) {
          gameState.grid[row][col] = gameState.selectedEditorPiece;
          renderBoard();
      }
      return;
  }

  // Tryb gry
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
  if (pendingCaptures.some(cap => cap.r === row && cap.c === col)) return;

  if (piece && typeof piece === 'string' && piece.startsWith(gameState.currentPlayer)) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    renderBoard(); 
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

// Export funkcji dla testów
export function getValidMovesForPiece(row, col) {
  const player = gameState.currentPlayer;
  const mandatoryCapture = hasAnyCapture(gameState.grid, player);
  const captureMoves = getPossibleCapturesForPiece(gameState.grid, row, col, pendingCaptures);
  
  if (mandatoryCapture) {
    return captureMoves.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
  } else {
    if (captureMoves.length > 0) {
         return captureMoves.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
    }

    const simpleMoves = [];
    const piece = gameState.grid[row][col];
    const isKing = piece.includes('king');
    
    const directions = isKing 
        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] 
        : (player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

    directions.forEach(([dr, dc]) => {
        if (isKing) {
            let r = row + dr;
            let c = col + dc;
            while (isValidMove(gameState.grid, row, col, r, c, player)) {
                simpleMoves.push({ toRow: r, toCol: c, isCapture: false });
                r += dr;
                c += dc;
                if (r < 0 || r > 9 || c < 0 || c > 9) break;
            }
        } else {
            const r = row + dr;
            const c = col + dc;
            if (isValidMove(gameState.grid, row, col, r, c, player)) {
                simpleMoves.push({ toRow: r, toCol: c, isCapture: false });
            }
        }
    });
    return simpleMoves;
  }
}

function findCapturedPieceBetween(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    let r = r1 + dr;
    let c = c1 + dc;
    while (r !== r2 && c !== c2) {
        if (r < 0 || r > 9 || c < 0 || c > 9) break;
        if (gameState.grid[r][c] !== 0) return { r, c };
        r += dr;
        c += dc;
    }
    return null;
}

export function makeMove(fromRow, fromCol, toRow, toCol, isCapture) {
  const previousBoard = JSON.parse(JSON.stringify(gameState.grid));
  const previousPlayer = gameState.currentPlayer;

  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  let moreCapturesAvailable = false;

  if (isCapture) {
    const captured = findCapturedPieceBetween(fromRow, fromCol, toRow, toCol);
    if (captured) pendingCaptures.push(captured);

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

  if (pendingCaptures.length > 0) {
      pendingCaptures.forEach(cap => { gameState.grid[cap.r][cap.c] = 0; });
      pendingCaptures = [];
  }

  const piece = gameState.grid[toRow][toCol];
  if (piece && !piece.includes('king')) {
      if (gameState.currentPlayer === 'white' && toRow === 0) gameState.grid[toRow][toCol] = 'white_king';
      if (gameState.currentPlayer === 'black' && toRow === 9) gameState.grid[toRow][toCol] = 'black_king';
  }

  gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
  pieceLockedForCapture = false;
  selectedSquare = null;
  validMovesForSelected = [];
  
  moveHistory.addMove({ fromRow, fromCol, toRow, toCol, previousBoard, previousPlayer });
  updateCurrentPlayerDisplay();
  renderBoard();
}

function highlightValidMoves(moves) {
  moves.forEach(({ toRow, toCol }) => {
    const square = document.querySelector(`#board .square[data-row='${toRow}'][data-col='${toCol}']`);
    if (square) square.classList.add('highlight');
  });
}
