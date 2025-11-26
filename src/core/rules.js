// src/core/rules.js

function isSquareOnBoard(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 10;
}

function isOpponent(p1, p2) {
  if (!p1 || !p2 || p1 === 0 || p2 === 0) return false;
  return p1[0] !== p2[0]; 
}

function isPathClear(board, r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    let r = r1 + dr;
    let c = c1 + dc;
    while (r !== r2 && c !== c2) {
        if (board[r][c] !== 0) return false;
        r += dr;
        c += dc;
    }
    return true;
}

export function isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
  if (!isSquareOnBoard(toRow, toCol)) return false;
  if (board[toRow][toCol] !== 0) return false;

  const piece = board[fromRow][fromCol];
  if (!piece || !piece.startsWith(player)) return false;

  const isKing = piece.includes('king');
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;

  if (Math.abs(dr) !== Math.abs(dc)) return false;

  if (!isKing) {
      if (Math.abs(dr) === 1) {
          if (player === 'white' && dr > 0) return false;
          if (player === 'black' && dr < 0) return false;
          return true;
      }
      if (Math.abs(dr) === 2) {
          const midRow = fromRow + dr / 2;
          const midCol = fromCol + dc / 2;
          const jumpedPiece = board[midRow][midCol];
          return isOpponent(piece, jumpedPiece);
      }
  } else {
      return isPathClear(board, fromRow, fromCol, toRow, toCol);
  }
  return false;
}

export function getPossibleCapturesForPiece(board, row, col, pendingCaptures = []) {
  const piece = board[row][col];
  if (!piece) return [];

  const isKing = piece.includes('king');
  const captures = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  directions.forEach(([dr, dc]) => {
    if (isKing) {
        let dist = 1;
        let foundEnemy = false;
        while (true) {
            const rCurrent = row + (dr * dist);
            const cCurrent = col + (dc * dist);
            if (!isSquareOnBoard(rCurrent, cCurrent)) break;
            
            const cellContent = board[rCurrent][cCurrent];
            
            if (!foundEnemy) {
                if (cellContent !== 0 && !isOpponent(piece, cellContent)) break;
                if (isOpponent(piece, cellContent)) {
                    const alreadyJumped = pendingCaptures.some(cap => cap.r === rCurrent && cap.c === cCurrent);
                    if (alreadyJumped) break; 
                    foundEnemy = true;
                }
            } else {
                if (cellContent !== 0) break; 
                captures.push([rCurrent, cCurrent]);
            }
            dist++;
        }
    } else {
        const toRow = row + (dr * 2);
        const toCol = col + (dc * 2);
        if (isSquareOnBoard(toRow, toCol) && board[toRow][toCol] === 0) {
            const midRow = row + dr;
            const midCol = col + dc;
            const midPiece = board[midRow][midCol];
            const alreadyJumped = pendingCaptures.some(cap => cap.r === midRow && cap.c === midCol);
            if (isOpponent(piece, midPiece) && !alreadyJumped) {
                captures.push([toRow, toCol]);
            }
        }
    }
  });
  return captures;
}

export function hasAnyCapture(board, player) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const piece = board[r][c];
      if (piece && piece.startsWith(player)) {
        if (getPossibleCapturesForPiece(board, r, c, []).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// Helper: Znajdź pionka między dwoma polami (logika uniwersalna)
export function findCapturedPieceBetween(board, r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    let r = r1 + dr;
    let c = c1 + dc;
    while (r !== r2 && c !== c2) {
        if (r < 0 || r > 9 || c < 0 || c > 9) break;
        if (board[r][c] !== 0) return { r, c };
        r += dr;
        c += dc;
    }
    return null;
}

// NOWE: Rekurencyjne liczenie maksymalnej liczby bić z danej pozycji
export function calculateMaxCaptures(board, row, col, pendingCaptures = []) {
    const possibleMoves = getPossibleCapturesForPiece(board, row, col, pendingCaptures);
    if (possibleMoves.length === 0) return 0;

    let maxDepth = 0;
    possibleMoves.forEach(move => {
        const [toR, toC] = move;
        const captured = findCapturedPieceBetween(board, row, col, toR, toC);
        const newPending = [...pendingCaptures];
        if (captured) newPending.push(captured);

        const depth = 1 + calculateMaxCaptures(board, toR, toC, newPending);
        if (depth > maxDepth) maxDepth = depth;
    });
    return maxDepth;
}
