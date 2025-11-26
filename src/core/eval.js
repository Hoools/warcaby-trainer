// ===========================
// ZAAWANSOWANA OCENA POZYCJI
// ===========================
// 
// Ten plik zawiera alternatywną/zapasową funkcję oceny.
// Główna ocena jest teraz w ai.js, ale możesz użyć tej jako backup.

const PIECE_VALUES = {
    PAWN: 100,
    KING: 300
};

export function evaluateBoard(board, player) {
    let score = 0;
    const opponent = player === 'white' ? 'black' : 'white';

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const piece = board[r][c];
            if (!piece || piece === 0 || typeof piece !== 'string') continue;

            const isPlayerPiece = piece.startsWith(player);
            const isOpponentPiece = piece.startsWith(opponent);

            if (!isPlayerPiece && !isOpponentPiece) continue;

            const isKing = piece.includes('king');
            let value = isKing ? PIECE_VALUES.KING : PIECE_VALUES.PAWN;

            // Pozycja - centrum
            const centerDist = Math.abs(4.5 - r) + Math.abs(4.5 - c);
            if (centerDist <= 3) value += 8;

            // Bezpieczeństwo na brzegu
            if (c === 0 || c === 9) value += 5;

            // Zaawansowanie pionka
            if (!isKing) {
                if (piece.startsWith('white')) {
                    value += (9 - r) * 3;
                    if (r <= 2) value += 15; // Blisko promocji
                } else {
                    value += r * 3;
                    if (r >= 7) value += 15;
                }
            }

            if (isPlayerPiece) score += value;
            else score -= value;
        }
    }

    return score;
}

// Funkcja pomocnicza - ocena dla minimax (jeśli potrzebna gdzie indziej)
export function quickEval(board, player) {
    let myScore = 0, oppScore = 0;
    const opponent = player === 'white' ? 'black' : 'white';

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            if (!p || p === 0) continue;

            const val = p.includes('king') ? 3 : 1;
            if (p.startsWith(player)) myScore += val;
            else if (p.startsWith(opponent)) oppScore += val;
        }
    }

    return myScore - oppScore;
}