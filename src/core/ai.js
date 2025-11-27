import { getAllMovesForPlayer, findCapturedPieceBetween, getPossibleCaptures, calculateMaxCaptures } from './rules.js';
import { predictBoard } from './neuralNet.js';

// ===========================
// HYBRYDOWY SILNIK AI (Minimax + Neural Net)
// ===========================

const SCORES = {
    PAWN: 100,
    KING: 300,
    MOBILITY: 5,
    CENTER_CONTROL: 10,
    EDGE_SAFETY: 8,
    BACK_ROW: 15,
    PROMOTION_BONUS: 20,
    CAPTURE_CHAIN: 50,
    GROUP_BONUS: 3
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

export function getBestMove(board, player, depth = 8) {
    TRANSPOSITION_TABLE.clear();
    const boardCopy = JSON.parse(JSON.stringify(board));
    const result = minimax(boardCopy, depth, -Infinity, Infinity, true, player);
    return result.move;
}

export function getBestMoveWithEvaluation(board, player, depth = 7) {
    TRANSPOSITION_TABLE.clear();
    const validMoves = getAllMovesForPlayer(board, player);

    if (validMoves.length === 0) {
        return { 
            bestMove: null, 
            evaluation: { score: -20000, winPercent: 0, player }, 
            topMoves: [] 
        };
    }

    const moveEvaluations = validMoves.map(move => {
        const newBoard = simulateCompleteMove(board, move, player);
        
        // Optymalizacja: Płytsze przeszukiwanie dla panelu
        const searchDepth = Math.max(1, depth - 2);
        
        const evalResult = minimax(newBoard, searchDepth, -Infinity, Infinity, false, player);
        
        let safeScore = evalResult.score;
        if (safeScore === Infinity) safeScore = 15000;
        if (safeScore === -Infinity) safeScore = -15000;

        return {
            move: move,
            score: safeScore,
            winPercent: scoreToWinPercentage(safeScore, player),
            notation: getMoveNotation(move)
        };
    });

    moveEvaluations.sort((a, b) => b.score - a.score);
    const bestOption = moveEvaluations[0];

    return {
        bestMove: bestOption.move,
        evaluation: { 
            score: bestOption.score, 
            winPercent: bestOption.winPercent, 
            player 
        },
        topMoves: moveEvaluations.slice(0, 5)
    };
}

function getMoveNotation(move) {
    const from = (move.fromRow * 5) + Math.floor(move.fromCol / 2) + 1;
    const to = (move.toRow * 5) + Math.floor(move.toCol / 2) + 1;
    return `${from}-${to}`;
}

function minimax(board, depth, alpha, beta, isMaximizing, playerColor) {
    const hash = boardHash(board, isMaximizing ? playerColor : (playerColor === 'white' ? 'black' : 'white'));
    if (TRANSPOSITION_TABLE.has(hash)) {
        const cached = TRANSPOSITION_TABLE.get(hash);
        if (cached.depth >= depth) return cached;
    }

    // Jeśli depth 0, używamy hybrydowej oceny (Sieć + Klasyka)
    if (depth === 0) {
        const score = evaluateBoard(board, playerColor); 
        return { score, move: null, depth: 0 };
    }

    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const currentPlayer = isMaximizing ? playerColor : opponentColor;
    const validMoves = getAllMovesForPlayer(board, currentPlayer);

    if (validMoves.length === 0) {
        const score = isMaximizing ? -15000 : 15000;
        return { score, move: null, depth: 0 };
    }

    sortMoves(validMoves, board, currentPlayer);
    const movesToSearch = depth > 4 ? validMoves.filter(m => m.isCapture).concat(validMoves.filter(m => !m.isCapture).slice(0, 8)) : validMoves;
    const finalMoves = movesToSearch.length > 0 ? movesToSearch : validMoves;

    let bestMove = finalMoves[0];

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of finalMoves) {
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
        for (const move of finalMoves) {
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
        if (move.isCapture) {
            move.priority += 10000;
            move.priority += calculateMaxCaptures(board, move.fromRow, move.fromCol, board[move.fromRow][move.fromCol], []) * 100;
        }
        if ((player === 'white' && move.toRow === 0) || (player === 'black' && move.toRow === 9)) move.priority += 500;
        const piece = board[move.fromRow][move.fromCol];
        if (piece && piece.includes('king')) move.priority += 200;
        const centerDist = Math.abs(4.5 - move.toRow) + Math.abs(4.5 - move.toCol);
        move.priority += (15 - centerDist) * 10;
    });
    moves.sort((a, b) => b.priority - a.priority);
}

function evaluateBoard(board, playerColor) {
    // --- 1. KLASYCZNA OCENA ---
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
            const centerDist = Math.abs(4.5 - r) + Math.abs(4.5 - c);
            if (centerDist <= 2) value += SCORES.CENTER_CONTROL;
            if (c === 0 || c === 9) value += SCORES.EDGE_SAFETY;
            if ((isMe && ((playerColor === 'white' && r === 9) || (playerColor === 'black' && r === 0)))) {
                value += SCORES.BACK_ROW;
            }
            if (!p.includes('king')) {
                const advanceRow = p.startsWith('white') ? (9 - r) : r;
                value += advanceRow * SCORES.ADVANCED_POSITION;
                if (advanceRow >= 7) value += SCORES.PROMOTION_BONUS;
                
                // Group bonus
                const supportRow = p.startsWith('white') ? r + 1 : r - 1;
                if (supportRow >= 0 && supportRow < 10) {
                    if ((c > 0 && board[supportRow][c-1] && board[supportRow][c-1].toString().startsWith(isMe ? playerColor : opponentColor)) ||
                        (c < 9 && board[supportRow][c+1] && board[supportRow][c+1].toString().startsWith(isMe ? playerColor : opponentColor))) {
                        value += SCORES.GROUP_BONUS;
                    }
                }
            }
            if (isMe) score += value; else score -= value;
        }
    }

    // --- 2. INTUICJA SIECI NEURONOWEJ ---
    const nnEval = predictBoard(board);
    let adjustedNN = nnEval;
    // Sieć zwraca + (White win) lub - (Black win).
    // Musimy to obrócić, jeśli oceniamy z perspektywy 'black' (gdzie + ma być dla black)
    if (playerColor === 'black') adjustedNN = -nnEval;

    return score + adjustedNN;
}

function simulateCompleteMove(board, move, player) {
    const newBoard = JSON.parse(JSON.stringify(board));
    const piece = newBoard[move.fromRow][move.fromCol];
    newBoard[move.toRow][move.toCol] = piece;
    newBoard[move.fromRow][move.fromCol] = 0;

    if (!move.isCapture) {
        checkPromotion(newBoard, move.toRow, move.toCol);
        return newBoard;
    }

    const cap = findCapturedPieceBetween(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
    if (cap) newBoard[cap.r][cap.c] = 0;

    let currentRow = move.toRow;
    let currentCol = move.toCol;
    while (true) {
        const nextCaptures = getPossibleCaptures(newBoard, currentRow, currentCol, piece, []);
        if (nextCaptures.length === 0) break;
        const nextJump = nextCaptures[0]; 
        const nextRow = nextJump[0];
        const nextCol = nextJump[1];
        newBoard[nextRow][nextCol] = piece;
        newBoard[currentRow][currentCol] = 0;
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

export function scoreToWinPercentage(score, player) {
    const SCALE = 300;
    const winProb = 100 / (1 + Math.exp(-score / SCALE));
    return Math.max(0, Math.min(100, winProb));
}
