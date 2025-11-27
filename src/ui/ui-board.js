import { gameState } from "../core/gameState.js";
import { getValidMoves, getPossibleCapturesForPiece, findCapturedPieceBetween, checkGameState, getAllMovesForPlayer } from "../core/rules.js";
import { getBestMove } from "../core/ai.js";
import { updateEvaluationDisplay } from "./ui-evaluation.js";

let selectedSquare = null;
let validMovesForSelected = [];
let pieceLockedForCapture = false;
let pendingCaptures = [];

export function initUI() {
  const boardDiv = document.getElementById("board");
  if (!boardDiv) return;

  boardDiv.innerHTML = "";
  let sNum = 1;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const isDark = (r + c) % 2 !== 0;
      const sq = document.createElement("div");
      sq.className = `square ${isDark ? "dark" : "light"}`;
      sq.dataset.row = r;
      sq.dataset.col = c;
      sq.addEventListener("click", () => onSquareClick(r, c));
      
      if (isDark) {
        const sp = document.createElement("span");
        sp.className = "square-number";
        sp.textContent = sNum++;
        sq.appendChild(sp);
      }
      boardDiv.appendChild(sq);
    }
  }
  
  updateCurrentPlayerDisplay();
  applyBoardRotation();
  renderBoard();
  checkAiTurn();
  
  document.addEventListener("gameStateChanged", checkAiTurn);
  document.addEventListener("forceMove", (e) => {
    const m = e.detail;
    if (gameState.gameActive) makeMove(m.fromRow, m.fromCol, m.toRow, m.toCol, m.isCapture);
  });
}

function checkAiTurn() {
  if (gameState.gameActive && gameState.aiEnabled && gameState.currentPlayer !== gameState.playerColor) {
    setTimeout(performAiMove, 1000);
  }
}

export function updateCurrentPlayerDisplay() {
  const s = document.getElementById("status");
  if (s) s.textContent = `Na ruchu: ${gameState.currentPlayer === "white" ? "Białe" : "Czarne"}`;
}

export function applyBoardRotation() {
  const b = document.getElementById("board");
  if (b) {
    if (gameState.boardRotation === 180) {
      b.classList.add("board-rotated");
    } else {
      b.classList.remove("board-rotated");
    }
  }
}

export function renderBoard() {
  let sNum = 1;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const sq = document.querySelector(`#board .square[data-row="${r}"][data-col="${c}"]`);
      if (!sq) continue;
      
      sq.innerHTML = "";
      sq.classList.remove("highlight");
      
      const isDark = (r + c) % 2 !== 0;
      if (isDark) {
        const sp = document.createElement("span");
        sp.className = "square-number";
        sp.textContent = sNum++;
        sq.appendChild(sp);
      }
      
      const p = gameState.grid[r][c];
      if (p !== 0) {
        const pd = document.createElement("div");
        pd.classList.add("piece");
        if (typeof p === "string") {
          if (p.includes("white")) pd.classList.add("white");
          if (p.includes("black")) pd.classList.add("black");
          if (p.includes("king")) pd.classList.add("king");
        }
        if (pendingCaptures.some(cap => cap.r === r && cap.c === c)) {
          pd.style.opacity = "0.4";
        }
        sq.appendChild(pd);
      }
    }
  }
  
  validMovesForSelected.forEach(m => {
    const targetSq = document.querySelector(`#board .square[data-row="${m.toRow}"][data-col="${m.toCol}"]`);
    if (targetSq) targetSq.classList.add("highlight");
  });
}

function onSquareClick(row, col) {
  if (gameState.isEditorMode) {
    if ((row + col) % 2 !== 0) {
      gameState.grid[row][col] = gameState.selectedEditorPiece;
      renderBoard();
    }
    return;
  }

  if (gameState.gameActive && gameState.aiEnabled && gameState.currentPlayer !== gameState.playerColor) return;

  if (pieceLockedForCapture) {
    if (selectedSquare?.row === row && selectedSquare?.col === col) return;
    
    const move = validMovesForSelected.find(m => m.toRow === row && m.toCol === col);
    if (move) {
      makeMove(selectedSquare.row, selectedSquare.col, row, col, true);
      return;
    }
  }

  const piece = gameState.grid[row][col];
  if (pendingCaptures.some(cap => cap.r === row && cap.c === col)) return;

  if (piece && typeof piece === "string" && piece.startsWith(gameState.currentPlayer)) {
    const moves = getValidMoves(gameState.grid, row, col, gameState.currentPlayer, pendingCaptures);
    selectedSquare = { row, col };
    validMovesForSelected = moves;
    renderBoard();
  } else if (selectedSquare) {
    const move = validMovesForSelected.find(m => m.toRow === row && m.toCol === col);
    if (move) {
      makeMove(selectedSquare.row, selectedSquare.col, row, col, move.isCapture);
    } else {
      selectedSquare = null;
      validMovesForSelected = [];
      renderBoard();
    }
  }
}

export function makeMove(fromRow, fromCol, toRow, toCol, isCapture) {
  const prevBoard = JSON.parse(JSON.stringify(gameState.grid));
  const prevPlayer = gameState.currentPlayer;

  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  if (isCapture) {
    const cap = findCapturedPieceBetween(gameState.grid, fromRow, fromCol, toRow, toCol);
    if (cap) pendingCaptures.push(cap);
  }

  if (getPossibleCapturesForPiece(gameState.grid, toRow, toCol, pendingCaptures).length > 0) {
    pieceLockedForCapture = true;
    selectedSquare = { row: toRow, col: toCol };
    validMovesForSelected = getValidMoves(gameState.grid, toRow, toCol, gameState.currentPlayer, pendingCaptures);
    renderBoard();
    return;
  }

  if (pendingCaptures.length > 0) {
    pendingCaptures.forEach(c => {
      gameState.grid[c.r][c.c] = 0;
    });
    pendingCaptures = [];
  }

  const p = gameState.grid[toRow][toCol];
  if (p && !p.includes("king")) {
    if (gameState.currentPlayer === "white" && toRow === 0) {
      gameState.grid[toRow][toCol] = "white_king";
    }
    if (gameState.currentPlayer === "black" && toRow === 9) {
      gameState.grid[toRow][toCol] = "black_king";
    }
  }

  gameState.currentPlayer = gameState.currentPlayer === "white" ? "black" : "white";
  pieceLockedForCapture = false;
  selectedSquare = null;
  validMovesForSelected = [];

  updateCurrentPlayerDisplay();
  renderBoard();
  updateEvaluationDisplay(gameState.grid, gameState.currentPlayer);

  const winner = checkGameState(gameState.grid, gameState.currentPlayer);
  if (winner) {
    setTimeout(() => alert(`KONIEC GRY! Wygrywają ${winner === "white" ? "Białe" : "Czarne"}`), 100);
    gameState.gameActive = false;
    return;
  }

  if (gameState.gameActive && gameState.aiEnabled && gameState.currentPlayer !== gameState.playerColor && !pieceLockedForCapture) {
    setTimeout(performAiMove, 500);
  }
}

async function performAiMove() {
  console.log("AI computing move...");
  const move = getBestMove(gameState.grid, gameState.currentPlayer);
  if (!move) return;
  
  console.log("AI move:", move);
  makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move.isCapture);
}
