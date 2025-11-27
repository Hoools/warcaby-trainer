// src/core/ai.js - ULEPSZONA WERSJA BEZ SIECI NEURONOWEJ
import { getAllMovesForPlayer, findCapturedPieceBetween, getPossibleCaptures } from './rules.js';

// Ulepszone wagi oceny pozycji
const SCORES = {
  PAWN: 100,
  KING: 300,
  CENTER_CONTROL: 12,
  EDGE_SAFETY: 10,
  BACK_ROW: 18,
  PROMOTION_BONUS: 25,
  ADVANCED_PAWN: 5,
  MOBILITY: 3,
  CAPTURE_THREAT: 15,
  KING_CENTER: 8,
  DOUBLED_PIECES: -10,
  SAFE_KING: 20
};

const TRANSPOSITION_TABLE = new Map();
const MAX_CACHE_SIZE = 100000;

function boardHash(board, player) {
  let hash = player;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      hash += `${r}${c}${board[r][c] || 0}`;
    }
  }
  return hash;
}

// Główna funkcja AI - zwiększona głębokość do 6
export function getBestMove(board, player, depth = 6) {
  console.log('AI szuka ruchu dla', player);

  // Czyszczenie cache jeśli za duży
  if (TRANSPOSITION_TABLE.size > MAX_CACHE_SIZE) {
    TRANSPOSITION_TABLE.clear();
  }

  const boardCopy = JSON.parse(JSON.stringify(board));
  const result = minimax(boardCopy, depth, -Infinity, Infinity, true, player);
  console.log('AI ruch:', result.move, 'ocena:', result.score);
  return result.move;
}

// Funkcja dla UI z ewaluacją top ruchów
export function getBestMoveWithEvaluation(board, player, depth = 5) {
  console.log('UI evaluation dla', player);
  const validMoves = getAllMovesForPlayer(board, player);

  if (validMoves.length === 0) {
    return {
      bestMove: null,
      evaluation: { score: -20000, winPercent: 0 },
      player,
      topMoves: []
    };
  }

  const moveEvaluations = validMoves.slice(0, 8).map(move => {
    const newBoard = simulateMove(board, move, player);
    const searchDepth = Math.max(1, depth - 1);
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

// Minimax z alpha-beta pruning i cache
function minimax(board, depth, alpha, beta, isMaximizing, playerColor) {
  const hash = boardHash(board, isMaximizing ? playerColor : (playerColor === 'white' ? 'black' : 'white'));

  if (TRANSPOSITION_TABLE.has(hash)) {
    const cached = TRANSPOSITION_TABLE.get(hash);
    if (cached.depth >= depth) {
      return cached;
    }
  }

  if (depth === 0) {
    const score = evaluateBoard(board, playerColor);
    return { score, move: null, depth: 0 };
  }

  const opponentColor = playerColor === 'white' ? 'black' : 'white';
  const currentPlayer = isMaximizing ? playerColor : opponentColor;
  const validMoves = getAllMovesForPlayer(board, currentPlayer);

  if (validMoves.length === 0) {
    return { score: isMaximizing ? -10000 : 10000, move: null, depth: 0 };
  }

  // Sortowanie ruchów: bicia najpierw, potem według pozycji
  validMoves.sort((a, b) => {
    if (a.isCapture !== b.isCapture) return b.isCapture ? 1 : -1;
    return (b.toRow * 10 + b.toCol) - (a.toRow * 10 + a.toCol);
  });

  let bestMove = validMoves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    const movesToCheck = Math.min(10, validMoves.length);

    for (const move of validMoves.slice(0, movesToCheck)) {
      const newBoard = simulateMove(board, move, currentPlayer);
      const evalResult = minimax(newBoard, depth - 1, alpha, beta, false, playerColor);

      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break; // Alpha-beta pruning
    }

    const result = { score: maxEval, move: bestMove, depth };
    TRANSPOSITION_TABLE.set(hash, result);
    return result;
  } else {
    let minEval = Infinity;
    const movesToCheck = Math.min(10, validMoves.length);

    for (const move of validMoves.slice(0, movesToCheck)) {
      const newBoard = simulateMove(board, move, currentPlayer);
      const evalResult = minimax(newBoard, depth - 1, alpha, beta, true, playerColor);

      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = move;
      }

      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) break; // Alpha-beta pruning
    }

    const result = { score: minEval, move: bestMove, depth };
    TRANSPOSITION_TABLE.set(hash, result);
    return result;
  }
}

// ZAAWANSOWANA FUNKCJA OCENY POZYCJI
function evaluateBoard(board, playerColor) {
  let score = 0;
  const opponentColor = playerColor === 'white' ? 'black' : 'white';

  let myPieces = 0, oppPieces = 0;
  let myKings = 0, oppKings = 0;
  let myMobility = 0, oppMobility = 0;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const p = board[r][c];
      if (!p || typeof p !== 'string') continue;

      const isMe = p.startsWith(playerColor);
      const isOpponent = p.startsWith(opponentColor);
      if (!isMe && !isOpponent) continue;

      const isKing = p.includes('king');
      let value = isKing ? SCORES.KING : SCORES.PAWN;

      // Kontrola centrum (preferuj pola centralne)
      const centerDist = Math.abs(4.5 - r) + Math.abs(4.5 - c);
      if (centerDist < 4) {
        value += SCORES.CENTER_CONTROL * (4 - centerDist);
      }

      // Bezpieczeństwo na brzegu
      if (c === 0 || c === 9) {
        value += SCORES.EDGE_SAFETY;
      }

      // Zaawansowanie pionków
      if (!isKing) {
        if (playerColor === 'white') {
          value += (9 - r) * SCORES.ADVANCED_PAWN;
          if (r <= 2) value += SCORES.PROMOTION_BONUS; // Blisko promocji
        } else {
          value += r * SCORES.ADVANCED_PAWN;
          if (r >= 7) value += SCORES.PROMOTION_BONUS;
        }
      } else {
        // Króle w centrum są silniejsze
        if (centerDist < 3) {
          value += SCORES.KING_CENTER * (3 - centerDist);
        }
      }

      // Bezpieczne króle (chronione przez inne pionki)
      if (isKing && isMe) {
        const protected = checkIfProtected(board, r, c, playerColor);
        if (protected) value += SCORES.SAFE_KING;
      }

      // Mobilność (liczba możliwych ruchów)
      const mobility = countMoves(board, r, c, isMe ? playerColor : opponentColor);
      if (isMe) {
        myMobility += mobility;
      } else {
        oppMobility += mobility;
      }

      // Suma wartości
      if (isMe) {
        score += value;
        myPieces++;
        if (isKing) myKings++;
      } else {
        score -= value;
        oppPieces++;
        if (isKing) oppKings++;
      }
    }
  }

  // Bonus za mobilność
  score += (myMobility - oppMobility) * SCORES.MOBILITY;

  // Kara za przewagę liczbową przeciwnika
  if (oppPieces > myPieces) {
    score -= (oppPieces - myPieces) * 50;
  }

  // Bonus za przewagę królów
  score += (myKings - oppKings) * 100;

  return score;
}

// Sprawdza czy pionek jest chroniony
function checkIfProtected(board, r, c, player) {
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of directions) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
      const p = board[nr][nc];
      if (p && typeof p === 'string' && p.startsWith(player)) {
        return true;
      }
    }
  }
  return false;
}

// Liczy dostępne ruchy dla pionka
function countMoves(board, row, col, player) {
  const piece = board[row][col];
  if (!piece) return 0;

  const isKing = piece.includes('king');
  let count = 0;
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  for (const [dr, dc] of directions) {
    if (isKing) {
      let dist = 1;
      while (dist < 10) {
        const nr = row + dr * dist;
        const nc = col + dc * dist;
        if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) break;
        if (board[nr][nc] === 0) {
          count++;
          dist++;
        } else {
          break;
        }
      }
    } else {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 && board[nr][nc] === 0) {
        count++;
      }
    }
  }

  return count;
}

// Symulacja ruchu
function simulateMove(board, move, player) {
  const newBoard = JSON.parse(JSON.stringify(board));
  const piece = newBoard[move.fromRow][move.fromCol];
  newBoard[move.toRow][move.toCol] = piece;
  newBoard[move.fromRow][move.fromCol] = 0;

  if (move.isCapture) {
    const cap = findCapturedPieceBetween(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
    if (cap) {
      newBoard[cap.r][cap.c] = 0;
    }
  }

  // Promocja do króla
  if (piece && !piece.includes('king')) {
    if ((player === 'white' && move.toRow === 0) || 
        (player === 'black' && move.toRow === 9)) {
      newBoard[move.toRow][move.toCol] = player + 'king';
    }
  }

  return newBoard;
}

// Notacja ruchu (do wyświetlania)
function getMoveNotation(move) {
  const from = (move.fromRow * 5) - Math.floor(move.fromCol / 2) + 1;
  const to = (move.toRow * 5) - Math.floor(move.toCol / 2) + 1;
  return `${from}-${to}`;
}

// Konwersja wyniku na procenty wygranej
function scoreToWinPercentage(score, player) {
  const SCALE = 400;
  let winProb = 50 + (score / SCALE) * 50;
  return Math.max(0, Math.min(100, winProb));
}