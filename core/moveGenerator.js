import { isValidMove } from './rules.js';
import { evaluateBoard } from './eval.js';

function generateAllLegalMoves(board, player) {
  const moves = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (board[r][c] && board[r][c][0] === player[0]) {
        // Sprawdź legalne ruchy (proste i bicie)
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (isValidMove(board, r, c, nr, nc, player)) {
              moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
            }
          }
        }
      }
    }
  }
  return moves;
}

function getTopMoves(board, player, topN = 3) {
  const legalMoves = generateAllLegalMoves(board, player);
  const moveEvaluations = legalMoves.map((move) => {
    // Symulacja ruchu
    const tempBoard = JSON.parse(JSON.stringify(board));
    tempBoard[move.toRow][move.toCol] = tempBoard[move.fromRow][move.fromCol];
    tempBoard[move.fromRow][move.fromCol] = 0;

    // Usuwanie zbitego pionka jeśli bicie
    if (Math.abs(move.toRow - move.fromRow) === 2) {
      const capRow = (move.fromRow + move.toRow) / 2;
      const capCol = (move.fromCol + move.toCol) / 2;
      tempBoard[capRow][capCol] = 0;
    }

    const score = evaluateBoard(tempBoard, player);
    return { move, score };
  });

  moveEvaluations.sort((a, b) => b.score - a.score);
  return moveEvaluations.slice(0, topN);
}

export { generateAllLegalMoves, getTopMoves };
