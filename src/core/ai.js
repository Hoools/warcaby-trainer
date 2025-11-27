import { getAllMovesForPlayer, findCapturedPieceBetween, getPossibleCaptures, calculateMaxCaptures } from './rules.js';

// ===========================
// ZAAWANSOWANY SILNIK AI (POPRAWIONY)
// ===========================

const SCORES = {
    PAWN: 100,
    KING: 300,
    MOBILITY: 5,
    CENTER_CONTROL: 8,
    EDGE_SAFETY: 6,
    BACK_ROW: 12,
    PROMOTION_BONUS: 15,
    ADVANCED_POSITION: 3,
    CAPTURE_CHAIN: 50
};

const TRANSPOSITION_TABLE = new Map();

function boardHash(board, player) {
    let hash = player;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            hash += `${r}${c}${board[r][c]}_`;
        }
    }
    return hash;
}

export function getBestMove(board, player, depth = 6) {
    TRANSPOSITION_TABLE.clear();
    const boardCopy = JSON.parse(JSON.stringify(board));
    // Używamy minimax z alfa-beta
    const result = minimax(boardCopy, depth, -Infinity, Infinity, true, player);
    return result.move;
}

function minimax(board, depth, alpha, beta, isMaximizing, playerColor) {
    const hash = boardHash(board, isMaximizing ? playerColor : (playerColor === 'white' ? 'black' : 'white'));
    if (TRANSPOSITION_TABLE.has(hash)) {
        const cached = TRANSPOSITION_TABLE.get(hash);
        if (cached.depth >= depth) return cached;
    }

    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const currentPlayer = isMaximizing ? playerColor : opponentColor;
    const validMoves = getAllMovesForPlayer(board, currentPlayer);

    if (depth === 0 || validMoves.length === 0) {
        const score = evaluateBoard(board, playerColor);
        return { score, move: null, depth: 0 };
    }

    sortMoves(validMoves, board, currentPlayer);
    
    // Ograniczenie liczby sprawdzanych ruchów dla głębszych poziomów (Move pruning)
    // Sprawdzamy tylko 8 najlepszych ruchów, chyba że to bicia (bicia zawsze sprawdzamy)
    const movesToSearch = depth > 4 ? validMoves.filter(m => m.isCapture).concat(validMoves.filter(m => !m.isCapture).slice(0, 8)) : validMoves;

    let bestMove = null;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of movesToSearch) {
            const newBoard = simulateCompleteMove(board, move, currentPlayer);
            const evalResult = minimax(newBoard, depth - 1, alpha, beta, false, playerColor);
            if (evalResult.score > maxEval) { maxEval = evalResult.score; bestMove = move; }
            alpha = Math.max(alpha, evalResult.score);
            if (beta <= alpha) break;
        }
        const result = { score: maxEval, move: bestMove, depth };
        TRANSPOSITION_TABLE.set(hash, result);
        return result;
    } else {
        let minEval = Infinity;
        for (const move of movesToSearch) {
            const newBoard = simulateCompleteMove(board, move, currentPlayer);
            const evalResult = minimax(newBoard, depth - 1, alpha, beta, true, playerColor);
            if (evalResult.score < minEval) { minEval = evalResult.score; bestMove = move; }
            beta = Math.min(beta, evalResult.score);
            if (beta <= alpha) break;
        }
        const result = { score: minEval, move: bestMove, depth };
        TRANSPOSITION_TABLE.set(hash, result);
        return result;
    }
}

function sortMoves(moves, board, player) {
    moves.forEach(move => {
        move.priority = 0;
        // Bicia mają absolutny priorytet
        if (move.isCapture) {
            move.priority += 10000;
            // Preferuj bicia, które zbijają więcej pionków (heurystyka)
            // Symulujemy płytko, żeby sprawdzić ile bić nastąpi
            move.priority += calculateMaxCaptures(board, move.fromRow, move.fromCol, board[move.fromRow][move.fromCol], []) * 100;
        }
        
        // Promocja do damki
        if ((player === 'white' && move.toRow === 0) || (player === 'black' && move.toRow === 9)) move.priority += 500;
        
        // Ruchy damką
        const piece = board[move.fromRow][move.fromCol];
        if (piece && piece.includes('king')) move.priority += 200;
        
        // Kontrola centrum
        const centerDist = Math.abs(4.5 - move.toRow) + Math.abs(4.5 - move.toCol);
        move.priority += (20 - centerDist) * 5;
    });
    moves.sort((a, b) => b.priority - a.priority);
}

function evaluateBoard(board, playerColor) {
    let score = 0;
    const opponentColor = playerColor === 'white' ? 'black' : 'white';

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            if (!p || typeof p !== 'string') continue;
            const isMe = p.startsWith(playerColor);
            const isOpponent = p.startsWith(opponentColor);
            if (!isMe && !isOpponent) continue;

            let value = p.includes('king') ? SCORES.KING : SCORES.PAWN;
            
            // Bonusy pozycyjne
            const centerDist = Math.abs(4.5 - r) + Math.abs(4.5 - c);
            if (centerDist <= 2) value += SCORES.CENTER_CONTROL;
            
            // Pionki na bandach są bezpieczniejsze
            if (c === 0 || c === 9) value += SCORES.EDGE_SAFETY;

            // Zaawansowanie
            if (!p.includes('king')) {
                const advanceRow = p.startsWith('white') ? (9 - r) : r;
                value += advanceRow * SCORES.ADVANCED_POSITION;
                if (advanceRow >= 7) value += SCORES.PROMOTION_BONUS;
            }

            if (isMe) score += value; else score -= value;
        }
    }
    return score;
}

// --- KLUCZOWA ZMIANA: Rekurencyjna symulacja całego łańcucha ---
function simulateCompleteMove(board, move, player) {
    const newBoard = JSON.parse(JSON.stringify(board));
    
    // Przesuwamy pionek (pierwszy skok)
    const piece = newBoard[move.fromRow][move.fromCol];
    newBoard[move.toRow][move.toCol] = piece;
    newBoard[move.fromRow][move.fromCol] = 0;

    // Jeśli to nie bicie, kończymy i sprawdzamy promocję
    if (!move.isCapture) {
        checkPromotion(newBoard, move.toRow, move.toCol);
        return newBoard;
    }

    // Jeśli to bicie, usuwamy zbity pionek
    const cap = findCapturedPieceBetween(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
    if (cap) newBoard[cap.r][cap.c] = 0;

    // REKURENCJA: Sprawdzamy czy pionek musi bić dalej
    // Symulujemy "wymuszenie" dalszych bić (Greedy approach - bierzemy pierwsze możliwe dalsze bicie)
    let currentRow = move.toRow;
    let currentCol = move.toCol;
    
    while (true) {
        // Pobieramy możliwe dalsze bicia z nowej pozycji
        // Musimy uważać, żeby nie przekazać 'pendingCaptures' błędnie, tu upraszczamy
        const nextCaptures = getPossibleCaptures(newBoard, currentRow, currentCol, piece, []);
        
        if (nextCaptures.length === 0) break;

        // Wybieramy pierwszy lepszy (w prawdziwym silniku powinniśmy rozgałęziać, ale dla szybkości bierzemy jeden)
        const nextJump = nextCaptures[0]; // [row, col]
        const nextRow = nextJump[0];
        const nextCol = nextJump[1];

        // Wykonaj skok w pamięci
        newBoard[nextRow][nextCol] = piece;
        newBoard[currentRow][currentCol] = 0;

        // Usuń zbitego
        const nextCap = findCapturedPieceBetween(newBoard, currentRow, currentCol, nextRow, nextCol);
        if (nextCap) newBoard[nextCap.r][nextCap.c] = 0;

        currentRow = nextRow;
        currentCol = nextCol;
    }

    checkPromotion(newBoard, currentRow, currentCol);
    return newBoard;
}

function checkPromotion(board, r, c) {
    const p = board[r][c];
    if (p && typeof p === 'string' && !p.includes('king')) {
        if ((p.startsWith('white') && r === 0) || (p.startsWith('black') && r === 9)) {
            board[r][c] = p.split('_')[0] + '_king';
        }
    }
}

// === HELPERS FOR UI ===
export function scoreToWinPercentage(score, player) {
    const SCALE = 300;
    const winProb = 100 / (1 + Math.exp(-score / SCALE));
    return Math.max(0, Math.min(100, winProb));
}

export function getBestMoveWithEvaluation(board, player, depth = 6) {
    const bestMoveMove = getBestMove(board, player, depth);
    // Odtwarzamy ocenę dla UI (trochę hack, ale oszczędza czas)
    const score = evaluateBoard(simulateCompleteMove(board, bestMoveMove, player), player);
    
    return {
        bestMove: bestMoveMove,
        evaluation: { score: score, winPercent: scoreToWinPercentage(score, player), player },
        topMoves: [] // Można rozbudować w przyszłości
    };
}
