// src/core/rules.js

/**
 * Sprawdza, czy pole (r, c) jest na planszy 10x10.
 */
function isSquareOnBoard(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 10;
}

/**
 * Sprawdza, czy `p2` jest pionkiem przeciwnika dla `p1`.
 */
function isOpponent(p1, p2) {
  if (!p1 || !p2 || p1 === 0 || p2 === 0) return false;
  return p1.toLowerCase()[0] !== p2.toLowerCase()[0];
}

/**
 * Główna funkcja walidująca ruch.
 * Sprawdza, czy ruch z (fromRow, fromCol) do (toRow, toCol) jest legalny dla danego gracza.
 */
export function isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
  if (!isSquareOnBoard(toRow, toCol)) return false;
  if (board[toRow][toCol] !== 0) return false; // Miejsce docelowe musi być puste

  const piece = board[fromRow][fromCol];
  if (!piece || piece.toLowerCase()[0] !== player[0]) return false; // Musi być twój pionek

  const dr = toRow - fromRow;
  const dc = toCol - fromCol;

  // Ruch prosty
  if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
    if (player === 'white' && dr > 0) return false; // Białe nie mogą cofać się
    if (player === 'black' && dr < 0) return false; // Czarne nie mogą cofać się
    return true;
  }

  // Ruch bicia
  if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
    const midRow = fromRow + dr / 2;
    const midCol = fromCol + dc / 2;
    const opponentPiece = board[midRow][midCol];
    return isOpponent(piece, opponentPiece); // Musi być pionek przeciwnika do zbicia
  }

  return false;
}

/**
 * Znajduje wszystkie możliwe (pojedyncze) bicia dla konkretnego pionka.
 * @returns {Array} Tablica możliwych pól docelowych, np. [[3, 4], [3, 6]]
 */
export function getPossibleCapturesForPiece(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];

  const player = piece.toLowerCase().startsWith('w') ? 'white' : 'black';
  const captures = [];
  const directions = [[-2, -2], [-2, 2], [2, -2], [2, 2]]; // 4 kierunki bicia

  directions.forEach(([dr, dc]) => {
    const toRow = row + dr;
    const toCol = col + dc;
    if (isValidMove(board, row, col, toRow, toCol, player)) {
        // Dodatkowo upewnijmy się, że to na pewno bicie
        const midRow = row + dr / 2;
        const midCol = col + dc / 2;
        if (isOpponent(board[row][col], board[midRow][midCol])) {
           captures.push([toRow, toCol]);
        }
    }
  });
  return captures;
}

/**
 * Sprawdza, czy gracz ma jakiekolwiek dostępne bicie na całej planszy.
 * @returns {boolean}
 */
export function hasAnyCapture(board, player) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const piece = board[r][c];
      if (piece && piece.toLowerCase().startsWith(player[0])) {
        if (getPossibleCapturesForPiece(board, r, c).length > 0) {
          return true; // Znaleziono przynajmniej jedno bicie
        }
      }
    }
  }
  return false;
}
