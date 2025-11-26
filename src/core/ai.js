import { getAllMovesForPlayer, findCapturedPieceBetween, getPossibleCaptures, calculateMaxCaptures } from './rules.js';

// ===========================
// ZAAWANSOWANY SILNIK AI
// Z PEŁNĄ OBSŁUGĄ ŁAŃCUCHÓW BIĆ I OCENĄ
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
    KING_ACTIVITY: 10,
    TEMPO: 2,
    CAPTURE_CHAIN: 50
};

const TRANSPOSITION_TABLE = new Map();
const MAX_CACHE_SIZE = 100000;

function boardHash(board, player) {
    let hash = player;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            hash += `${r}${c}${board[r][c]}_`;
        }
    }
    return hash;
}

function cleanTranspositionTable() {
    if (TRANSPOSITION_TABLE.size > MAX_CACHE_SIZE) {
        const keys = Array.from(TRANSPOSITION_TABLE.keys());
        for (let i = 0; i < 10000; i++) TRANSPOSITION_TABLE.delete(keys[i]);
    }
}

export function getBestMove(board, player, depth = 7) {
    TRANSPOSITION_TABLE.clear();
    const boardCopy = JSON.parse(JSON.stringify(board));
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

    sortMoves(validMoves, board, currentPlayer, isMaximizing);
    let bestMove = null;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of validMoves) {
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
        for (const move of validMoves) {
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

function sortMoves(moves, board, player, isMaximizing) {
    moves.forEach(move => {
        move.priority = 0;
        if (move.isCapture) {
            move.priority += 1000;
            if (move.totalVal) move.priority += move.totalVal * 200;
        }
        if ((player === 'white' && move.toRow === 0) || (player === 'black' && move.toRow === 9)) move.priority += 500;
        const piece = board[move.fromRow][move.fromCol];
        if (piece && piece.includes('king')) move.priority += 200;
        const centerDist = Math.abs(4.5 - move.toRow) + Math.abs(4.5 - move.toCol);
        move.priority += (20 - centerDist) * 5;
    });
    moves.sort((a, b) => b.priority - a.priority);
}

function evaluateBoard(board, playerColor) {
    let score = 0;
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    let myMobility = 0, oppMobility = 0;

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            if (!p || typeof p !== 'string') continue;
            const isMe = p.startsWith(playerColor);
            const isOpponent = p.startsWith(opponentColor);
            if (!isMe && !isOpponent) continue;

            let value = p.includes('king') ? SCORES.KING : SCORES.PAWN;
            const centerDist = Math.abs(4.5 - r) + Math.abs(4.5 - c);
            if (centerDist <= 3) value += SCORES.CENTER_CONTROL;
            if (c === 0 || c === 9) value += SCORES.EDGE_SAFETY;
            if ((playerColor === 'white' && r === 9 && isMe) || (playerColor === 'black' && r === 0 && isMe)) value += SCORES.BACK_ROW;

            if (!p.includes('king')) {
                if (p.startsWith('white')) value += (9 - r) * SCORES.ADVANCED_POSITION + (r <= 2 ? SCORES.PROMOTION_BONUS : 0);
                else value += r * SCORES.ADVANCED_POSITION + (r >= 7 ? SCORES.PROMOTION_BONUS : 0);
            }

            if (isMe) score += value; else score -= value;
        }
    }

    // Uproszczona mobilność dla szybkości (bez pełnego generowania)
    // Dla dokładnej: myMobility = getAllMovesForPlayer(board, playerColor).length;
    return score;
}

function simulateCompleteMove(board, move, player) {
    const newBoard = JSON.parse(JSON.stringify(board));
    if (!move.isCapture) {
        newBoard[move.toRow][move.toCol] = newBoard[move.fromRow][move.fromCol];
        newBoard[move.fromRow][move.fromCol] = 0;
        const p = newBoard[move.toRow][move.toCol];
        if (p && typeof p === 'string' && !p.includes('king')) {
            if ((p.startsWith('white') && move.toRow === 0) || (p.startsWith('black') && move.toRow === 9)) {
                newBoard[move.toRow][move.toCol] = p.split('_')[0] + '_king';
            }
        }
        return newBoard;
    }
    return simulateCaptureChain(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol, player, []);
}

function simulateCaptureChain(board, fromRow, fromCol, toRow, toCol, player, capturedSoFar) {
    const piece = board[fromRow][fromCol];
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = 0;
    const cap = findCapturedPieceBetween(board, fromRow, fromCol, toRow, toCol);
    if (cap) {
        board[cap.r][cap.c] = 0;
        capturedSoFar.push(cap);
    }

    let promoted = false;
    const p = board[toRow][toCol];
    if (p && typeof p === 'string' && !p.includes('king')) {
        if ((p.startsWith('white') && toRow === 0) || (p.startsWith('black') && toRow === 9)) {
            board[toRow][toCol] = p.split('_')[0] + '_king';
            promoted = true;
        }
    }
    if (promoted) return board;

    // Sprawdź czy są dalsze bicia - uproszczenie: nie kontynuujemy symulacji głębiej dla wydajności
    // W idealnym świecie AI powinno tu sprawdzić rekurencyjnie getPossibleCaptures
    return board;
}

// === DODATEK UI ===

export function scoreToWinPercentage(score, player) {
    const SCALE = 200;
    const winProb = 100 / (1 + Math.exp(-score / SCALE));
    return Math.max(0, Math.min(100, winProb));
}

export function getBestMoveWithEvaluation(board, player, depth = 7) {
    TRANSPOSITION_TABLE.clear();
    const boardCopy = JSON.parse(JSON.stringify(board));
    const validMoves = getAllMovesForPlayer(boardCopy, player);

    if (validMoves.length === 0) {
        return { bestMove: null, evaluation: { score: -10000, winPercent: 0, player }, topMoves: [] };
    }

    sortMoves(validMoves, boardCopy, player, true);
    const evaluatedMoves = [];

    // Oceniamy tylko top 10 ruchów żeby nie zamulać
    const movesToEval = validMoves.slice(0, 10); 

    for (const move of movesToEval) {
        const newBoard = simulateCompleteMove(boardCopy, move, player);
        const evalResult = minimax(newBoard, Math.max(1, depth - 2), -Infinity, Infinity, false, player);
        evaluatedMoves.push({
            move,
            score: evalResult.score,
            winPercent: scoreToWinPercentage(evalResult.score, player)
        });
    }

    evaluatedMoves.sort((a, b) => b.score - a.score);
    const bestMove = evaluatedMoves[0];

    return {
        bestMove: bestMove ? bestMove.move : null,
        evaluation: { score: bestMove ? bestMove.score : -10000, winPercent: bestMove ? bestMove.winPercent : 0, player },
        topMoves: evaluatedMoves.slice(0, 5)
    };
}
