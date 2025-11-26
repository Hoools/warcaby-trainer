// src/core/rules.js

// ... (isSquareOnBoard, isOpponent, isValidMove - bez zmian) ...
function isSquareOnBoard(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 10; }
function isOpponent(p1, p2) { if (!p1 || !p2 || p1 === 0 || p2 === 0) return false; return p1[0] !== p2[0]; }

export function isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
  if (!isSquareOnBoard(toRow, toCol)) return false;
  if (board[toRow][toCol] !== 0) return false; 
  const piece = board[fromRow][fromCol];
  if (!piece || !piece.startsWith(player)) return false;
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
    if (player === 'white' && dr > 0) return false; 
    if (player === 'black' && dr < 0) return false; 
    return true;
  }
  if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
    const midRow = fromRow + dr / 2;
    const midCol = fromCol + dc / 2;
    const jumpedPiece = board[midRow][midCol];
    return isOpponent(piece, jumpedPiece);
  }
  return false;
}

// ZMIANA: Dodano parametr pendingCaptures (domyślnie pusta tablica)
export function getPossibleCapturesForPiece(board, row, col, pendingCaptures = []) {
  const piece = board[row][col];
  if (!piece) return [];

  const captures = [];
  const directions = [[-2, -2], [-2, 2], [2, -2], [2, 2]]; 

  directions.forEach(([dr, dc]) => {
    const toRow = row + dr;
    const toCol = col + dc;
    
    if (isSquareOnBoard(toRow, toCol) && board[toRow][toCol] === 0) {
        const midRow = row + dr / 2;
        const midCol = col + dc / 2;
        const midPiece = board[midRow][midCol];
        
        // Sprawdź czy:
        // 1. Jest tam pionek przeciwnika
        // 2. Ten pionek NIE został już przeskoczony w tej sekwencji!
        const alreadyJumped = pendingCaptures.some(cap => cap.r === midRow && cap.c === midCol);
        
        if (isOpponent(piece, midPiece) && !alreadyJumped) {
            captures.push([toRow, toCol]);
        }
    }
  });
  return captures;
}

export function hasAnyCapture(board, player) {
  // Tu pendingCaptures jest puste, bo to sprawdzenie na początku tury
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
