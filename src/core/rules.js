function isSquareOnBoard(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 10; }
function isOpponent(p1, p2) { if (!p1 || !p2 || p1 === 0 || p2 === 0) return false; return p1[0] !== p2[0]; }
function isPathClear(board, r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    let r = r1 + dr, c = c1 + dc;
    while (r !== r2 && c !== c2) { if (board[r][c] !== 0) return false; r += dr; c += dc; }
    return true;
}
export function findCapturedPieceBetween(board, r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    let r = r1 + dr, c = c1 + dc;
    while (r !== r2 && c !== c2) { if (r < 0 || r > 9 || c < 0 || c > 9) break; if (board[r][c] !== 0) return { r, c }; r += dr; c += dc; }
    return null;
}
export function isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
  if (!isSquareOnBoard(toRow, toCol) || board[toRow][toCol] !== 0) return false;
  const piece = board[fromRow][fromCol];
  if (!piece || typeof piece !== 'string' || !piece.startsWith(player)) return false; // POPRAWKA: sprawdzenie typu
  const isKing = piece.includes('king'), dr = toRow - fromRow, dc = toCol - fromCol;
  if (Math.abs(dr) !== Math.abs(dc)) return false;
  if (!isKing) {
      if (Math.abs(dr) === 1) { return player === 'white' ? dr < 0 : dr > 0; }
      if (Math.abs(dr) === 2) return isOpponent(piece, board[fromRow + dr / 2][fromCol + dc / 2]);
  } else return isPathClear(board, fromRow, fromCol, toRow, toCol);
  return false;
}
export function getPossibleCaptures(board, row, col, piece, pendingCaptures = []) {
  const currentPiece = piece || board[row][col];
  if (!currentPiece || currentPiece === 0) return []; // POPRAWKA
  const isKing = typeof currentPiece === 'string' && currentPiece.includes('king'); // POPRAWKA
  const captures = [], directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  
  directions.forEach(([dr, dc]) => {
    if (isKing) {
        let dist = 1, foundEnemy = false;
        while (true) {
            const r = row + dr * dist, c = col + dc * dist;
            if (!isSquareOnBoard(r, c)) break;
            const content = board[r][c];
            if (!foundEnemy) {
                if (content !== 0 && !isOpponent(currentPiece, content)) break;
                if (isOpponent(currentPiece, content)) {
                    if (pendingCaptures.some(cap => cap.r === r && cap.c === c)) break;
                    foundEnemy = true;
                }
            } else { if (content !== 0) break; captures.push([r, c]); }
            dist++;
        }
    } else {
        const toRow = row + dr * 2, toCol = col + dc * 2;
        if (isSquareOnBoard(toRow, toCol) && board[toRow][toCol] === 0) {
            const midRow = row + dr, midCol = col + dc;
            if (isOpponent(currentPiece, board[midRow][midCol]) && !pendingCaptures.some(cap => cap.r === midRow && cap.c === midCol)) captures.push([toRow, toCol]);
        }
    }
  });
  return captures;
}
export function getPossibleCapturesForPiece(board, row, col, pendingCaptures = []) {
    return getPossibleCaptures(board, row, col, board[row][col], pendingCaptures);
}
export function calculateMaxCaptures(board, row, col, piece, pendingCaptures = []) {
    const moves = getPossibleCaptures(board, row, col, piece, pendingCaptures);
    if (moves.length === 0) return 0;
    let max = 0;
    moves.forEach(([tR, tC]) => {
        const cap = findCapturedPieceBetween(board, row, col, tR, tC);
        const newPending = [...pendingCaptures];
        if (cap) newPending.push(cap);
        const depth = 1 + calculateMaxCaptures(board, tR, tC, piece, newPending);
        if (depth > max) max = depth;
    });
    return max;
}
export function getValidMoves(board, row, col, player, pendingCaptures = []) {
    let globalMax = 0;
    const movingPiece = board[row][col];
    
    // Jeśli brak wymuszonych bić z poprzednich kroków, szukamy globalnie
    if (pendingCaptures.length === 0) {
        for(let r=0; r<10; r++) for(let c=0; c<10; c++) {
            const p = board[r][c];
            if(p && typeof p === 'string' && p.startsWith(player)) { // POPRAWKA
                 const m = calculateMaxCaptures(board, r, c, p, []); 
                 if(m > globalMax) globalMax = m; 
            }
        }
    }

    if (globalMax === 0 && pendingCaptures.length === 0) {
        const simpleMoves = [];
        const piece = board[row][col];
        if (!piece || piece === 0) return []; // POPRAWKA
        const isKing = piece.includes('king');
        const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : (player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
        directions.forEach(([dr, dc]) => {
            if (isKing) {
                let r = row + dr, c = col + dc;
                while (isValidMove(board, row, col, r, c, player)) {
                    simpleMoves.push({ toRow: r, toCol: c, isCapture: false });
                    r += dr; c += dc; if (r<0||r>9||c<0||c>9) break;
                }
            } else {
                const r = row + dr, c = col + dc;
                if (isValidMove(board, row, col, r, c, player)) simpleMoves.push({ toRow: r, toCol: c, isCapture: false });
            }
        });
        return simpleMoves;
    }
    
    const myMax = calculateMaxCaptures(board, row, col, movingPiece, pendingCaptures);
    if (pendingCaptures.length === 0 && myMax < globalMax) return [];
    
    const captureMoves = getPossibleCaptures(board, row, col, movingPiece, pendingCaptures);
    const movesWithDepth = captureMoves.map(([tR, tC]) => {
         const cap = findCapturedPieceBetween(board, row, col, tR, tC);
         const newPending = [...pendingCaptures];
         if(cap) newPending.push(cap);
         return { toRow: tR, toCol: tC, isCapture: true, totalVal: 1 + calculateMaxCaptures(board, tR, tC, movingPiece, newPending) };
    });
    
    if (movesWithDepth.length === 0) return []; // Zabezpieczenie
    const best = Math.max(...movesWithDepth.map(m => m.totalVal));
    return movesWithDepth.filter(m => m.totalVal === best);
}

// --- TO BYŁO ŹRÓDŁEM BŁĘDU W TWOJEJ KONSOLI ---
export function canPlayerMove(board, player) {
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const piece = board[r][c];
            // POPRAWKA: Sprawdzamy piece !== 0 oraz typ string
            if (piece !== 0 && typeof piece === 'string' && piece.startsWith(player)) {
                 if (getValidMoves(board, r, c, player, []).length > 0) return true;
            }
        }
    }
    return false; 
}

export function checkGameState(board, currentPlayer) { 
    return !canPlayerMove(board, currentPlayer) ? (currentPlayer === 'white' ? 'black' : 'white') : null; 
}

export function getAllMovesForPlayer(board, player) {
    const allMoves = [];
    let globalMaxCapture = 0;

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            // POPRAWKA: Bezpieczne sprawdzenie typu
            if (p && typeof p === 'string' && p.startsWith(player)) {
                const max = calculateMaxCaptures(board, r, c, p, []);
                if (max > globalMaxCapture) globalMaxCapture = max;
            }
        }
    }

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            // POPRAWKA: Bezpieczne sprawdzenie typu
            if (p && typeof p === 'string' && p.startsWith(player)) {
                const moves = getValidMoves(board, r, c, player, []);
                moves.forEach(m => {
                    allMoves.push({
                        fromRow: r,
                        fromCol: c,
                        toRow: m.toRow,
                        toCol: m.toCol,
                        isCapture: m.isCapture
                    });
                });
            }
        }
    }
    return allMoves;
}
