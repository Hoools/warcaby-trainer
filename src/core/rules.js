// src/core/rules.js

function isSquareOnBoard(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 10;
}

function isOpponent(p1, p2) {
  if (!p1 || !p2 || p1 === 0 || p2 === 0) return false;
  // Sprawdzamy pierwszą literę koloru ('w' vs 'b')
  // Obsługuje: 'white', 'black', 'white_king', 'black_king'
  return p1[0] !== p2[0]; 
}

// Pomocnicza: czy droga po przekątnej jest pusta?
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
  // Upewniamy się, że ruszamy własnym pionkiem/damką
  if (!piece || !piece.startsWith(player)) return false;

  const isKing = piece.includes('king');
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;

  // Musi być ruch po przekątnej
  if (Math.abs(dr) !== Math.abs(dc)) return false;

  // --- ZWYKŁY PIONEK ---
  if (!isKing) {
      // Ruch prosty (1 pole)
      if (Math.abs(dr) === 1) {
          if (player === 'white' && dr > 0) return false;
          if (player === 'black' && dr < 0) return false;
          return true;
      }
      // Bicie (2 pola)
      if (Math.abs(dr) === 2) {
          const midRow = fromRow + dr / 2;
          const midCol = fromCol + dc / 2;
          const jumpedPiece = board[midRow][midCol];
          return isOpponent(piece, jumpedPiece);
      }
  } 
  // --- DAMKA ---
  else {
      // Ruch bez bicia: Droga musi być pusta
      // (Bicie jest sprawdzane osobno przez mechanizm capture)
      return isPathClear(board, fromRow, fromCol, toRow, toCol);
  }

  return false;
}

/**
 * Zwraca listę dostępnych pól docelowych dla bicia.
 * pendingCaptures - lista współrzędnych pionków, które zostały już "przeskoczone" w tej sekwencji.
 */
export function getPossibleCapturesForPiece(board, row, col, pendingCaptures = []) {
  const piece = board[row][col];
  if (!piece) return [];

  const isKing = piece.includes('king');
  const captures = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  directions.forEach(([dr, dc]) => {
    // --- DAMKA (Latające bicie) ---
    if (isKing) {
        let dist = 1;
        let foundEnemy = false;
        let enemyPos = null;

        while (true) {
            const rCurrent = row + (dr * dist);
            const cCurrent = col + (dc * dist);
            
            // Wyjście poza planszę
            if (!isSquareOnBoard(rCurrent, cCurrent)) break;
            
            const cellContent = board[rCurrent][cCurrent];
            
            // 1. Jeszcze nie znaleziono wroga
            if (!foundEnemy) {
                // Jeśli trafimy na swój pionek -> koniec w tym kierunku
                if (cellContent !== 0 && !isOpponent(piece, cellContent)) break;

                // Jeśli trafimy na wroga
                if (isOpponent(piece, cellContent)) {
                    // Sprawdź czy ten wróg nie jest już "martwy" (w pendingCaptures)
                    const alreadyJumped = pendingCaptures.some(cap => cap.r === rCurrent && cap.c === cCurrent);
                    
                    if (alreadyJumped) {
                        // Traktujemy martwego wroga jak puste pole? 
                        // Nie, w warcabach NIE MOŻNA przeskakiwać 2x przez tę samą bierkę, 
                        // ale nie można też stawać na niej. Martwy pionek blokuje drogę do czasu zdjęcia.
                        // Więc jeśli trafimy na alreadyJumped -> KONIEC w tym kierunku.
                        break; 
                    } else {
                        // Znaleziono "żywego" wroga do bicia
                        foundEnemy = true;
                        enemyPos = { r: rCurrent, c: cCurrent };
                    }
                }
                // Jeśli puste pole -> idziemy dalej szukać wroga
            } 
            // 2. Już znaleziono wroga (szukamy miejsca do lądowania)
            else {
                if (cellContent !== 0) {
                    // Napotkano przeszkodę (inny pionek) ZA wrogiem -> koniec bicia w tym kierunku
                    break; 
                }
                // Puste pole za wrogiem -> jest to poprawne bicie
                captures.push([rCurrent, cCurrent]);
            }
            
            dist++;
        }
    } 
    // --- ZWYKŁY PIONEK ---
    else {
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
        // Sprawdzamy bicia z pustą listą pendingCaptures (start tury)
        if (getPossibleCapturesForPiece(board, r, c, []).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}
