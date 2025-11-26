// src/core/rules.js

function isSquareOnBoard(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 10;
}

function isOpponent(p1, p2) {
  if (!p1 || !p2 || p1 === 0 || p2 === 0) return false;
  // p1 i p2 to np. 'white', 'black'
  return p1[0] !== p2[0]; // Porównujemy pierwszą literę 'w' !== 'b'
}

export function isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
  if (!isSquareOnBoard(toRow, toCol)) return false;
  if (board[toRow][toCol] !== 0) return false; 

  const piece = board[fromRow][fromCol];
  // Upewnij się, że gracz rusza swoim pionkiem
  if (!piece || !piece.startsWith(player)) return false;

  const dr = toRow - fromRow;
  const dc = toCol - fromCol;

  // Ruch prosty (1 pole)
  if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
    if (player === 'white' && dr > 0) return false; 
    if (player === 'black' && dr < 0) return false; 
    return true;
  }

  // Bicie (2 pola) - sprawdzamy czy przeskakujemy wroga
  if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
    const midRow = fromRow + dr / 2;
    const midCol = fromCol + dc / 2;
    const jumpedPiece = board[midRow][midCol];
    return isOpponent(piece, jumpedPiece);
  }

  return false;
}

export function getPossibleCapturesForPiece(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  const player = piece.startsWith('white') ? 'white' : 'black';
  const captures = [];
  const directions = [[-2, -2], [-2, 2], [2, -2], [2, 2]]; 

  directions.forEach(([dr, dc]) => {
    const toRow = row + dr;
    const toCol = col + dc;
    
    // Sprawdzamy "manualnie" logikę bicia, żeby nie polegać tylko na isValidMove
    if (isSquareOnBoard(toRow, toCol) && board[toRow][toCol] === 0) {
        const midRow = row + dr / 2;
        const midCol = col + dc / 2;
        const midPiece = board[midRow][midCol];
        
        if (isOpponent(piece, midPiece)) {
            captures.push([toRow, toCol]);
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
        if (getPossibleCapturesForPiece(board, r, c).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}
