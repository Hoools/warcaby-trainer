import { getAllMovesForPlayer, findCapturedPieceBetween, getPossibleCaptures, calculateMaxCaptures } from "./rules.js";
import { predictBoard } from "./neuralNet.js";

// HYBRYDOWY SILNIK AI: Minimax + Sieć neuronowa

const SCORES = {
  PAWN: 100,
  KING: 300,
  MOBILITY: 5,
  CENTERCONTROL: 10,
  EDGESAFETY: 8,
  BACKROW: 15,
  PROMOTIONBONUS: 20,
  CAPTURECHAIN: 50,
  GROUPBONUS: 3,
};

const TRANSPOSITION_TABLE = new Map();

function boardHash(board, player) {
  let hash = player;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      hash += r + ":" + c + ":" + board[r][c] + "|";
    }
  }
  return hash;
}

// Zwraca tylko najlepszy ruch (używane przez silnik gry)
export function getBestMove(board, player, depth = 8) {
  TRANSPOSITION_TABLE.clear();
  const boardCopy = JSON.parse(JSON.stringify(board));
  const result = minimax(boardCopy, depth, -Infinity, Infinity, true, player);
  return result.move;
}

// Zwraca: najlepszy ruch + oceny do panelu UI
// scorePlayer: z perspektywy player (dodatni = dobrze dla gracza na ruchu)
// scoreWhiteView: w konwencji szachowej (dodatni = dobrze dla białych)
// winPercentWhite: szansa białych w %, liczona z scoreWhiteView
export function getBestMoveWithEvaluation(board, player, depth = 7) {
  TRANSPOSITION_TABLE.clear();

  const validMoves = getAllMovesForPlayer(board, player);
  if (validMoves.length === 0) {
    const scorePlayer = -20000;
    const scoreWhiteView = player === "white" ? scorePlayer : -scorePlayer;
    const winPercentWhite = scoreToWinPercentage(scoreWhiteView, "white");
    return {
      bestMove: null,
      evaluation: {
        scorePlayer,
        scoreWhiteView,
        winPercentWhite,
        player,
      },
      topMoves: [],
    };
  }

  const moveEvaluations = validMoves.map((move) => {
    const newBoard = simulateCompleteMove(board, move, player);

    // Płytsze przeszukiwanie dla panelu
    const searchDepth = Math.max(1, depth - 2);
    const evalResult = minimax(newBoard, searchDepth, -Infinity, Infinity, false, player);

    let scorePlayer = evalResult.score;
    if (scorePlayer === Infinity) scorePlayer = 15000;
    if (scorePlayer === -Infinity) scorePlayer = -15000;

    const scoreWhiteView = player === "white" ? scorePlayer : -scorePlayer;
    const winPercentWhite = scoreToWinPercentage(scoreWhiteView, "white");

    return {
      move,
      scorePlayer,
      scoreWhiteView,
      winPercentWhite,
      notation: getMoveNotation(move),
    };
  });

  // Sortujemy po scorePlayer – najlepszy dla strony na ruchu
  moveEvaluations.sort((a, b) => b.scorePlayer - a.scorePlayer);
  const bestOption = moveEvaluations[0];

  return {
    bestMove: bestOption.move,
    evaluation: {
      scorePlayer: bestOption.scorePlayer,
      scoreWhiteView: bestOption.scoreWhiteView,
      winPercentWhite: bestOption.winPercentWhite,
      player,
    },
    topMoves: moveEvaluations.slice(0, 5),
  };
}

function getMoveNotation(move) {
  const from = move.fromRow * 5 + Math.floor(move.fromCol / 2) + 1;
  const to = move.toRow * 5 + Math.floor(move.toCol / 2) + 1;
  return `${from}-${to}`;
}

function minimax(board, depth, alpha, beta, isMaximizing, playerColor) {
  const hashKey = boardHash(board, isMaximizing ? playerColor : (playerColor === "white" ? "black" : "white"));
  if (TRANSPOSITION_TABLE.has(hashKey)) {
    const cached = TRANSPOSITION_TABLE.get(hashKey);
    if (cached.depth >= depth) {
      return cached;
    }
  }

  if (depth === 0) {
    const scorePlayer = evaluateBoard(board, playerColor);
    return { score: scorePlayer, move: null, depth: 0 };
  }

  const opponentColor = playerColor === "white" ? "black" : "white";
  const currentPlayer = isMaximizing ? playerColor : opponentColor;

  const validMoves = getAllMovesForPlayer(board, currentPlayer);
  if (validMoves.length === 0) {
    const scorePlayer = isMaximizing ? -15000 : 15000;
    return { score: scorePlayer, move: null, depth: 0 };
  }

  sortMoves(validMoves, board, currentPlayer);

  // heurystyka: preferuj bicia + ogranicz liczbę ruchów
  let movesToSearch;
  if (depth >= 4) {
    const captures = validMoves.filter((m) => m.isCapture);
    const quiet = validMoves.filter((m) => !m.isCapture).slice(0, 8);
    movesToSearch = captures.concat(quiet);
  } else {
    movesToSearch = validMoves;
  }

  const finalMoves = movesToSearch.length > 0 ? movesToSearch : validMoves;
  let bestMove = finalMoves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of finalMoves) {
      const newBoard = simulateCompleteMove(board, move, currentPlayer);
      const evalResult = minimax(newBoard, depth - 1, alpha, beta, false, playerColor);
      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break;
    }
    const result = { score: maxEval, move: bestMove, depth };
    TRANSPOSITION_TABLE.set(hashKey, result);
    return result;
  } else {
    let minEval = Infinity;
    for (const move of finalMoves) {
      const newBoard = simulateCompleteMove(board, move, currentPlayer);
      const evalResult = minimax(newBoard, depth - 1, alpha, beta, true, playerColor);
      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = move;
      }
      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) break;
    }
    const result = { score: minEval, move: bestMove, depth };
    TRANSPOSITION_TABLE.set(hashKey, result);
    return result;
  }
}

function sortMoves(moves, board, player) {
  moves.forEach((move) => {
    move.priority = 0;
    if (move.isCapture) {
      move.priority += 10000;
      move.priority += calculateMaxCaptures(board, move.fromRow, move.fromCol, board[move.fromRow][move.fromCol], []) * 100;
    }
    if (player === "white" && move.toRow === 0) move.priority += 500;
    if (player === "black" && move.toRow === 9) move.priority += 500;

    const piece = board[move.fromRow][move.fromCol];
    if (piece && typeof piece === "string" && piece.includes("king")) {
      move.priority += 200;
    }

    const centerDist = Math.abs(4.5 - move.toRow) + Math.abs(4.5 - move.toCol);
    move.priority += (15 - centerDist) * 10;
  });

  moves.sort((a, b) => b.priority - a.priority);
}

// HYBRYDOWA OCENA: klasyczna + sieć neuronowa
// ZWRACA scorePlayer: dodatni = dobrze dla playerColor, ujemny = dobrze dla przeciwnika
function evaluateBoard(board, playerColor) {
  let score = 0;
  const opponentColor = playerColor === "white" ? "black" : "white";

  // 1. Klasyczna ocena
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
        if (playerColor === "white" && r === 9) value += SCORES.BACKROW;
        if (playerColor === "black" && r === 0) value += SCORES.BACKROW;
      }

      if (!p.includes("king")) {
        const advanceRow = p.startsWith("white") ? 9 - r : r;
        value += advanceRow * SCORES.MOBILITY;
        if (advanceRow >= 7) value += SCORES.PROMOTIONBONUS;
      }

      // Group bonus
      const supportRow = p.startsWith("white") ? r + 1 : r - 1;
      if (supportRow >= 0 && supportRow < 10) {
        if (c > 0) {
          const s = board[supportRow][c - 1];
          if (s && typeof s === "string" && s.startsWith(isMe ? playerColor : opponentColor)) {
            value += SCORES.GROUPBONUS;
          }
        }
        if (c < 9) {
          const s = board[supportRow][c + 1];
          if (s && typeof s === "string" && s.startsWith(isMe ? playerColor : opponentColor)) {
            value += SCORES.GROUPBONUS;
          }
        }
      }

      if (isMe) score += value;
      else score -= value;
    }
  }

  // 2. Intuicja sieci neuronowej (predictBoard zwraca >0 dla przewagi białych)
  const nnEval = predictBoard(board);
  let adjustedNN = nnEval;
  if (playerColor === "black") {
    adjustedNN = -nnEval;
  }

  return score + adjustedNN;
}

function simulateCompleteMove(board, move, player) {
  const newBoard = JSON.parse(JSON.stringify(board));
  const piece = newBoard[move.fromRow][move.fromCol];

  newBoard[move.toRow][move.toCol] = piece;
  newBoard[move.fromRow][move.fromCol] = 0;

  if (!move.isCapture) {
    checkPromotion(newBoard, move.toRow, move.toCol);
    return newBoard;
  }

  const cap = findCapturedPieceBetween(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
  if (cap) {
    newBoard[cap.r][cap.c] = 0;
  }

  let currentRow = move.toRow;
  let currentCol = move.toCol;

  while (true) {
    const nextCaptures = getPossibleCaptures(newBoard, currentRow, currentCol, piece, []);
    if (nextCaptures.length === 0) break;

    const nextJump = nextCaptures[0];
    const nextRow = nextJump[0];
    const nextCol = nextJump[1];

    newBoard[nextRow][nextCol] = piece;
    newBoard[currentRow][currentCol] = 0;

    const nextCap = findCapturedPieceBetween(newBoard, currentRow, currentCol, nextRow, nextCol);
    if (nextCap) {
      newBoard[nextCap.r][nextCap.c] = 0;
    }

    currentRow = nextRow;
    currentCol = nextCol;
  }

  checkPromotion(newBoard, currentRow, currentCol);
  return newBoard;
}

function checkPromotion(board, r, c) {
  const p = board[r][c];
  if (!p || typeof p !== "string" || p.includes("king")) return;
  if (p.startsWith("white") && r === 0) {
    board[r][c] = p.split("0")[0] + "king";
  }
  if (p.startsWith("black") && r === 9) {
    board[r][c] = p.split("0")[0] + "king";
  }
}

// scoreWhiteView -> prawdopodobieństwo wygranej białych
export function scoreToWinPercentage(score, player) {
  const SCALE = 300;
  const winProb = 100 / (1 + Math.exp(-score / SCALE));
  return Math.max(0, Math.min(100, winProb));
}