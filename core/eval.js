// Prosta ocena pozycji na podstawie różnicy materiału
// 'w' to biały pion, 'b' czarny pion, duże litery to damki

function pieceValue(piece) {
  if (!piece) return 0;
  const p = piece.toLowerCase();
  if (p === 'w' || p === 'b') return 1;
  if (p === 'W' || p === 'B') return 3; // damka wartości 3
  return 0;
}

export function evaluateBoard(board, player) {
  let whiteScore = 0;
  let blackScore = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const p = board[r][c];
      if (p) {
        const isDamka = p === p.toUpperCase();
        const value = isDamka ? 3 : 1;
        if (p.toLowerCase() === 'w') whiteScore += value;
        else if (p.toLowerCase() === 'b') blackScore += value;
      }
    }
  }
  const diff = whiteScore - blackScore;
  return player === 'white' ? diff : -diff;
}
