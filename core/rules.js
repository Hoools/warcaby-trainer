const BOARD_SIZE = 10;

// Sprawdza, czy ruch jest w granicach planszy
function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// Sprawdza, czy pole jest ciemne (do gry)
function isDarkSquare(row, col) {
  return (row + col) % 2 !== 0;
}

// Sprawdza ruch pojedynczego kroku pionka (ruch przelotowy bez bicia)
function isValidSimpleMove(board, fromRow, fromCol, toRow, toCol, player) {
  if (!isInsideBoard(toRow, toCol)) return false;
  // Ruch musi być na ciemne pole i puste
  if (!isDarkSquare(toRow, toCol)) return false;
  if (board[toRow][toCol] !== 0) return false;

  const deltaRow = toRow - fromRow;
  const deltaCol = Math.abs(toCol - fromCol);

  if (deltaCol !== 1) return false;

  if (player === 'white') {
    // biały pionek porusza się do góry planszy (malejące wiersze)
    return deltaRow === -1;
  } else if (player === 'black') {
    // czarny pionek porusza się w dół planszy (rosnące wiersze)
    return deltaRow === 1;
  }
  return false;
}

// Sprawdza, czy bicie jest legalne
function isValidCaptureMove(board, fromRow, fromCol, overRow, overCol, toRow, toCol, player) {
  if (!isInsideBoard(toRow, toCol)) return false;
  if (!isDarkSquare(toRow, toCol)) return false;
  if (board[toRow][toCol] !== 0) return false;
  if (!isInsideBoard(overRow, overCol)) return false;

  const opponent = player === 'white' ? 'black' : 'white';
  const pieceCaptured = board[overRow][overCol];
  if (pieceCaptured === 0 || pieceCaptured[0] !== opponent[0]) return false;

  const deltaRow = toRow - fromRow;
  const deltaCol = Math.abs(toCol - fromCol);
  if (deltaCol !== 2) return false;
  if (Math.abs(deltaRow) !== 2) return false;

  return true;
}

// Funkcja sprawdzająca, czy dany ruch (prosty lub bicie) jest prawidłowy
function isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
  // Sprawdź prosty ruch bez bicia
  if (isValidSimpleMove(board, fromRow, fromCol, toRow, toCol, player)) {
    // ale sprawdź, czy nie ma obowiązku bicia w tej turze
    if (hasAnyCapture(board, player)) {
      return false; // obowiązek bicia - ruch prosty niedozwolony
    }
    return true;
  }

  // Sprawdź bicie
  const overRow = (fromRow + toRow) / 2;
  const overCol = (fromCol + toCol) / 2;
  if (Number.isInteger(overRow) && Number.isInteger(overCol)) {
    if (isValidCaptureMove(board, fromRow, fromCol, overRow, overCol, toRow, toCol, player)) {
      return true;
    }
  }

  return false;
}

// Sprawdza, czy gracz ma jakiekolwiek możliwe bicie
function hasAnyCapture(board, player) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] && board[r][c][0] === player[0]) {
        const captures = getPossibleCaptures(board, r, c, player);
        if (captures.length > 0) return true;
      }
    }
  }
  return false;
}

// Zwraca listę możliwych ruchów bicia dla pionka na danym polu
function getPossibleCaptures(board, row, col, player) {
  const captures = [];
  const directions = [
    [-2, -2],
    [-2, 2],
    [2, -2],
    [2, 2],
  ];
  directions.forEach(([dr, dc]) => {
    const toRow = row + dr;
    const toCol = col + dc;
    const overRow = row + dr / 2;
    const overCol = col + dc / 2;
    if (
      isValidCaptureMove(board, row, col, overRow, overCol, toRow, toCol, player)
    ) {
      captures.push([toRow, toCol]);
    }
  });
  return captures;
}

export {
  isValidMove,
  hasAnyCapture,
  getPossibleCaptures,
  isValidSimpleMove,
  isValidCaptureMove,
  isInsideBoard,
  isDarkSquare,
};
