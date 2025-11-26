import { generateAllLegalMoves } from './moveGenerator.js';

function evaluateBoardSimple(board, player) {
  // Ta sama prosta heurystyka z eval.js
  let whiteScore = 0;
  let blackScore = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const p = board[r][c];
      if (p) {
        if (p.toLowerCase() === 'w') whiteScore += p.toLowerCase() === p ? 1 : 3;
        else if (p.toLowerCase() === 'b') blackScore += p.toLowerCase() === p ? 1 : 3;
      }
    }
  }
  const diff = whiteScore - blackScore;
  return player === 'white' ? diff : -diff;
}

function minimax(board, player, depth, alpha, beta, maximizingPlayer) {
  if (depth === 0) {
    return { score: evaluateBoardSimple(board, player) };
  }

  const moves = generateAllLegalMoves(board, player);
  if (moves.length === 0) {
    return { score: maximizingPlayer ? -Infinity : Infinity };
  }

  let bestMove = null;

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(board, move);
      const evalResult = minimax(newBoard, opponent(player), depth - 1, alpha, beta, false);
      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(board, move);
      const evalResult = minimax(newBoard, opponent(player), depth - 1, alpha, beta, true);
      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = move;
      }
      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

function simulateMove(board, move) {
  const newBoard = JSON.parse(JSON.stringify(board));
  newBoard[move.toRow][move.toCol] = newBoard[move.fromRow][move.fromCol];
  newBoard[move.fromRow][move.fromCol] = 0;

  if (Math.abs(move.toRow - move.fromRow) === 2) {
    const capRow = (move.fromRow + move.toRow) / 2;
    const capCol = (move.fromCol + move.toCol) / 2;
    newBoard[capRow][capCol] = 0;
  }
  return newBoard;
}

function opponent(player) {
  return player === 'white' ? 'black' : 'white';
}

// Funkcja wybierająca ruch AI na podstawie minimax o podanej głębokości
function selectBestMove(board, player, depth = 3) {
  const result = minimax(board, player, depth, -Infinity, Infinity, true);
  return result.move;
}

export { selectBestMove };
