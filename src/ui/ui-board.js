// src/ui/ui-board.js
import { gameState } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { getValidMoves, getPossibleCapturesForPiece, findCapturedPieceBetween, checkGameState } from '../core/rules.js';

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

      if (isDark) {
          const numberSpan = document.createElement('span');
          numberSpan.className = 'square-number';
          numberSpan.textContent = squareNumber++;
          square.appendChild(numberSpan);
      }
      boardDiv.appendChild(square);
    }
  }
  
  const copyBtn = document.getElementById('copy-state-btn');
  if(copyBtn) {
      copyBtn.onclick = () => {
          const output = document.getElementById('board-state-output');
          if(output) {
            navigator.clipboard.writeText(output.textContent);
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
  let squareNumber = 1; 
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const square = document.querySelector(`#board .square[data-row='${r}'][data-col='${c}']`);
      const isDark = (r + c) % 2 !== 0;
      let currentNum = isDark ? squareNumber++ : null;

      if (!square) continue; 
      
      square.innerHTML = '';
      square.classList.remove('highlight');
      
      if (currentNum !== null) {
          const numberSpan = document.createElement('span');
          numberSpan.className = 'square-number';
          numberSpan.textContent = currentNum;
          square.appendChild(numberSpan);
      }
      
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
  
  highlightValidMoves(validMovesForSelected);
  try { updateBoardStateDisplay(); } catch(e) { console.warn(e); }
}

function updateBoardStateDisplay() {
    const outputDiv = document.getElementById('board-state-output');
    if (!outputDiv) return;

    const whitePieces = [], whiteKings = [], blackPieces = [], blackKings = [];
    let sNum = 1;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            if ((r+c)%2!==0) {
                const p = gameState.grid[r][c];
                if(p === 'white') whitePieces.push(sNum);
                else if(p === 'white_king') whiteKings.push(sNum);
                else if(p === 'black') blackPieces.push(sNum);
                else if(p === 'black_king') blackKings.push(sNum);
                sNum++;
            }
        }
    }
    outputDiv.textContent = `Current Player: ${gameState.currentPlayer.toUpperCase()}

WHITE:
- Men: [${whitePieces.join(', ')}]
- Kings: [${whiteKings.join(', ')}]

BLACK:
- Men: [${blackPieces.join(', ')}]
- Kings: [${blackKings.join(', ')}]

Total: ${whitePieces.length + whiteKings.length + blackPieces.length + blackKings.length}`;
}

function onSquareClick(row, col) {
  if (gameState.isEditorMode) {
      if ((row + col) % 2 !== 0) {
          gameState.grid[row][col] = gameState.selectedEditorPiece;
          renderBoard();
      }
      return;
  }

  if (pieceLockedForCapture) {
      if (selectedSquare.row === row && selectedSquare.col === col) return;
      const move = validMovesForSelected.find(m => m.toRow === row && m.toCol === col);
      if (move) makeMove(selectedSquare.row, selectedSquare.col, row, col, true);
      return;
  }

  const piece = gameState.grid[row][col];
  if (pendingCaptures.some(cap => cap.r === row && cap.c === col)) return;

  if (piece && typeof piece === 'string' && piece.startsWith(gameState.currentPlayer)) {
    const moves = getValidMoves(gameState.grid, row, col, gameState.currentPlayer, pendingCaptures);
    selectedSquare = { row, col };
    validMovesForSelected = moves;
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

export function makeMove(fromRow, fromCol, toRow, toCol, isCapture) {
  const previousBoard = JSON.parse(JSON.stringify(gameState.grid));
  const previousPlayer = gameState.currentPlayer;

  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  let moreCapturesAvailable = false;

  if (isCapture) {
    const captured = findCapturedPieceBetween(gameState.grid, fromRow, fromCol, toRow, toCol);
    if (captured) pendingCaptures.push(captured);

    const nextCaptures = getPossibleCapturesForPiece(gameState.grid, toRow, toCol, pendingCaptures);
    if (nextCaptures.length > 0) {
      const validNext = getValidMoves(gameState.grid, toRow, toCol, gameState.currentPlayer, pendingCaptures);
      if (validNext.length > 0) {
          moreCapturesAvailable = true;
          pieceLockedForCapture = true;
          selectedSquare = { row: toRow, col: toCol };
          validMovesForSelected = validNext;
          renderBoard(); 
          return;
      }
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

  // Detekcja końca gry
  const winner = checkGameState(gameState.grid, gameState.currentPlayer);
  if (winner) {
      setTimeout(() => {
          const winnerName = winner === 'white' ? 'Białe' : 'Czarne';
          alert(`KONIEC GRY! Wygrywają: ${winnerName}`);
      }, 100);
  }
}

function highlightValidMoves(moves) {
  moves.forEach(({ toRow, toCol }) => {
    const square = document.querySelector(`#board .square[data-row='${toRow}'][data-col='${toCol}']`);
    if (square) square.classList.add('highlight');
  });
}
