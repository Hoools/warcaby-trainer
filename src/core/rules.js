// src/core/rules.js

function isSquareOnBoard(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 10;
}

function isOpponent(p1, p2) {
  if (!p1 || !p2 || p1 === 0 || p2 === 0) return false;
  return p1[0] !== p2[0]; // 'w' vs 'b'
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
  if (!piece || !piece.startsWith(player)) return false;

  const isKing = piece.includes('king');
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;

  // Musi być ruch po przekątnej
  if (Math.abs(dr) !== Math.abs(dc)) return false;

  // --- Logika ZWYKŁEGO pionka ---
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
  // --- Logika DAMKI (Latająca) ---
  else {
      // Ruch o dowolną liczbę pól, o ile droga jest pusta
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
    // --- DAMKA (Flying capture) ---
    if (isKing) {
        // Skanuj w danym kierunku
        let dist = 1;
        while (true) {
            const rEnemy = row + (dr * dist);
            const cEnemy = col + (dc * dist);
            
            if (!isSquareOnBoard(rEnemy, cEnemy)) break;
            
            const cellContent = board[rEnemy][cEnemy];
            
            // 1. Jeśli spotkasz swój pionek -> koniec szukania w tym kierunku
            if (cellContent !== 0 && !isOpponent(piece, cellContent)) break;
            
            // 2. Jeśli spotkasz wroga
            if (isOpponent(piece, cellContent)) {
                // Sprawdź, czy ten wróg nie został już zbity w tej turze
                const alreadyJumped = pendingCaptures.some(cap => cap.r === rEnemy && cap.c === cEnemy);
                if (alreadyJumped) break; // Nie można bić 2x tego samego

                // 3. Sprawdź pola ZA wrogiem (miejsca lądowania)
                let landDist = 1;
                while (true) {
                    const rLand = rEnemy + (dr * landDist);
                    const cLand = cEnemy + (dc * landDist);
                    
                    if (!isSquareOnBoard(rLand, cLand)) break;
                    if (board[rLand][cLand] !== 0) break; // Blokada za wrogiem

                    // Znaleziono legalne miejsce lądowania!
                    captures.push([rLand, cLand]);
                    
                    landDist++;
                }
                break; // Po znalezieniu wroga i sprawdzeniu pól za nim, kończymy ten kierunek
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
        if (getPossibleCapturesForPiece(board, r, c, []).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}
