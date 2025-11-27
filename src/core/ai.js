// src/core/ai.js - PEŁNY + EVALUATION
import { getAllMovesForPlayer, findCapturedPieceBetween, getPossibleCaptures } from "./rules.js";

const SCORES = {
  PAWN: 100, KING: 300, CENTERCONTROL: 10, EDGESAFETY: 8, 
  BACKROW: 15, PROMOTIONBONUS: 20, GROUPBONUS: 3
};

const TRANSPOSITION_TABLE = new Map();

function boardHash(board, player) {
  let hash = player;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      hash += `${r}${c}${board[r][c] || '0'}`;
    }
  }
  return hash;
}

export function getBestMove(board, player, depth = 5) {
  console.log("🔍 AI szuka ruchu dla", player);
  TRANSPOSITION_TABLE.clear();
  
  const boardCopy = JSON.parse(JSON.stringify(board));
  const result = minimax(boardCopy, depth, -Infinity, Infinity, true, player);
  
  console.log("✅ AI ruch:", result.move);
  return result.move;
}

export function getBestMoveWithEvaluation(board, player, depth = 4) {
  console.log("📊 UI evaluation dla", player);
  const validMoves = getAllMovesForPlayer(board, player);
  
  if (validMoves.length === 0) {
    return {
      bestMove: null,
      evaluation: { score: -20000, winPercent: 0 },
      player,
      topMoves: []
    };
  }

  const moveEvaluations = validMoves.slice(0, 5).map(move => {
    const newBoard = simulateMove(board, move, player);
    const searchDepth = Math.max(1, depth - 2);
    const evalResult = minimax(newBoard, searchDepth, -Infinity, Infinity, false, player);
    
    let safeScore = evalResult.score;
    if (safeScore === Infinity) safeScore = 15000;
    if (safeScore === -Infinity) safeScore = -15000;
    
    return {
      move,
      score: safeScore,
      winPercent: scoreToWinPercentage(safeScore, player),
      notation: getMoveNotation(move)
    };
  });

  moveEvaluations.sort((a, b) => b.score - a.score);
  const bestOption = moveEvaluations[0];

  return {
    bestMove: bestOption.move,
    evaluation: { 
      score: bestOption.score,
      winPercent: bestOption.winPercent 
    },
    player,
    topMoves: moveEvaluations
  };
}

function minimax(board, depth, alpha, beta, isMaximizing, playerColor) {
  const hash = boardHash(board, isMaximizing ? playerColor : (playerColor === "white" ? "black" : "white"));
  
  if (TRANSPOSITION_TABLE.has(hash)) {
    const cached = TRANSPOSITION_TABLE.get(hash);
    if (cached.depth >= depth) return cached;
  }

  if (depth === 0) {
    const score = evaluateBoard(board, playerColor);
    return { score, move: null, depth: 0 };
  }

  const opponentColor = playerColor === "white" ? "black" : "white";
  const currentPlayer = isMaximizing ? playerColor : opponentColor;
  
  const validMoves = getAllMovesForPlayer(board, currentPlayer);
  if (validMoves.length === 0) {
    return { score: isMaximizing ? -10000 : 10000, move: null, depth: 0 };
  }

  validMoves.sort((a, b) => (b.isCapture ? 1 : 0) - (a.isCapture ? 1 : 0));
  let bestMove = validMoves[0];
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of validMoves.slice(0, Math.min(6, validMoves.length))) {
      const newBoard = simulateMove(board, move, currentPlayer);
      const evalResult = minimax(newBoard, depth - 1, alpha, beta, false, playerColor);
      
      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break;
    }
    const result = { score: maxEval, move: bestMove, depth };
    TRANSPOSITION_TABLE.set(hash, result);
    return result;
  } else {
    let minEval = Infinity;
    for (const move of validMoves.slice(0, Math.min(6, validMoves.length))) {
      const newBoard = simulateMove(board, move, currentPlayer);
      const evalResult = minimax(newBoard, depth - 1, alpha, beta, true, playerColor);
      
      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = move;
      }
      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) break;
    }
    const result = { score: minEval, move: bestMove, depth };
    TRANSPOSITION_TABLE.set(hash, result);
    return result;
  }
}

function evaluateBoard(board, playerColor) {
  let score = 0;
  const opponentColor = playerColor === "white" ? "black" : "white";

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const p = board[r][c];
      if (!p || typeof p !== "string") continue;
      
      const isMe = p.startsWith(playerColor);
      const isOpponent = p.startsWith(opponentColor);
      if (!isMe && !isOpponent) continue;

      let value = p.includes("king") ? SCORES.KING : SCORES.PAWN;
      
      const centerDist = Math.abs(4.5 - r) + Math.abs(4.5 - c);
      if (centerDist <= 2) value += SCORES.CENTERCONTROL;
      if (c === 0 || c === 9) value += SCORES.EDGESAFETY;
      
      if (isMe) {
        if ((playerColor === "white" && r >= 8) || (playerColor === "black" && r <= 1)) {
          value += SCORES.PROMOTIONBONUS;
        }
      }
      
      if (isMe) score += value;
      else score -= value;
    }
  }
  return score;
}

function simulateMove(board, move, player) {
  const newBoard = JSON.parse(JSON.stringify(board));
  const piece = newBoard[move.fromRow][move.fromCol];
  
  newBoard[move.toRow][move.toCol] = piece;
  newBoard[move.fromRow][move.fromCol] = 0;
  
  if (move.isCapture) {
    const cap = findCapturedPieceBetween(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
    if (cap) newBoard[cap.r][cap.c] = 0;
  }
  
  if (piece && !piece.includes("king")) {
    if (player === "white" && move.toRow === 0) {
      newBoard[move.toRow][move.toCol] = "whiteking";
    } else if (player === "black" && move.toRow === 9) {
      newBoard[move.toRow][move.toCol] = "blackking";
    }
  }
  
  return newBoard;
}

function getMoveNotation(move) {
  const from = `${move.fromRow + 5}-${Math.floor(move.fromCol / 2) + 1}`;
  const to = `${move.toRow + 5}-${Math.floor(move.toCol / 2) + 1}`;
  return `${from}-${to}`;
}

function scoreToWinPercentage(score, player) {
  const SCALE = 300;
  let winProb = 50 + (score / SCALE) * 50;
  return Math.max(0, Math.min(100, winProb));
}
