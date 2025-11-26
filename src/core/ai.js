import { getAllMovesForPlayer, findCapturedPieceBetween, getPossibleCaptures, calculateMaxCaptures } from './rules.js';

// ===========================
// ZAAWANSOWANY SILNIK AI
// Z PEŁNĄ OBSŁUGĄ ŁAŃCUCHÓW BIĆ
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
    CAPTURE_CHAIN: 50  // NOWE: Bonus za każde dodatkowe bicie w łańcuchu
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
        const toDelete = TRANSPOSITION_TABLE.size - MAX_CACHE_SIZE + 10000;
        const keys = Array.from(TRANSPOSITION_TABLE.keys());
        for (let i = 0; i < toDelete; i++) {
            TRANSPOSITION_TABLE.delete(keys[i]);
        }
    }
}

export function getBestMove(board, player, depth = 7) {
    TRANSPOSITION_TABLE.clear();

    const boardCopy = JSON.parse(JSON.stringify(board));
    const startTime = Date.now();

    console.log(`AI rozpoczyna analizę dla gracza: ${player}, głębokość: ${depth}`);

    const result = minimax(boardCopy, depth, -Infinity, Infinity, true, player);

    const elapsed = Date.now() - startTime;
    console.log(`AI (${player}) ocena: ${result.score.toFixed(2)}, czas: ${elapsed}ms, pozycji: ${TRANSPOSITION_TABLE.size}`);

    if (!result.move) {
        console.warn('AI nie znalazło ruchu! Sprawdź getAllMovesForPlayer');
    }

    return result.move;
}

function minimax(board, depth, alpha, beta, isMaximizing, playerColor) {
    const hash = boardHash(board, isMaximizing ? playerColor : (playerColor === 'white' ? 'black' : 'white'));

    if (TRANSPOSITION_TABLE.has(hash)) {
        const cached = TRANSPOSITION_TABLE.get(hash);
        if (cached.depth >= depth) {
            return cached;
        }
    }

    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const currentPlayer = isMaximizing ? playerColor : opponentColor;

    const validMoves = getAllMovesForPlayer(board, currentPlayer);

    // Debug: loguj liczbę dostępnych ruchów
    if (depth === 7) {
        console.log(`Gracz ${currentPlayer} ma ${validMoves.length} dostępnych ruchów`);
        const captures = validMoves.filter(m => m.isCapture);
        if (captures.length > 0) {
            console.log(`  - w tym ${captures.length} bić`);
        }
    }

    if (depth === 0 || validMoves.length === 0) {
        const score = evaluateBoard(board, playerColor);
        return { score, move: null, depth: 0 };
    }

    sortMoves(validMoves, board, currentPlayer, isMaximizing);

    let bestMove = null;

    if (isMaximizing) {
        let maxEval = -Infinity;

        for (const move of validMoves) {
            // KLUCZOWA ZMIANA: simulateCompleteMove obsługuje łańcuchy
            const newBoard = simulateCompleteMove(board, move, currentPlayer);
            const evalResult = minimax(newBoard, depth - 1, alpha, beta, false, playerColor);

            if (evalResult.score > maxEval) {
                maxEval = evalResult.score;
                bestMove = move;
            }

            alpha = Math.max(alpha, evalResult.score);
            if (beta <= alpha) break;
        }

        const result = { score: maxEval, move: bestMove, depth };
        TRANSPOSITION_TABLE.set(hash, result);
        cleanTranspositionTable();

        return result;
    } else {
        let minEval = Infinity;

        for (const move of validMoves) {
            const newBoard = simulateCompleteMove(board, move, currentPlayer);
            const evalResult = minimax(newBoard, depth - 1, alpha, beta, true, playerColor);

            if (evalResult.score < minEval) {
                minEval = evalResult.score;
                bestMove = move;
            }

            beta = Math.min(beta, evalResult.score);
            if (beta <= alpha) break;
        }

        const result = { score: minEval, move: bestMove, depth };
        TRANSPOSITION_TABLE.set(hash, result);
        cleanTranspositionTable();

        return result;
    }
}

function sortMoves(moves, board, player, isMaximizing) {
    moves.forEach(move => {
        move.priority = 0;

        // Priorytet za bicia - WYŻSZY jeśli to łańcuch
        if (move.isCapture) {
            move.priority += 1000;
            // Jeśli move ma informację o liczbie bić w łańcuchu
            if (move.totalVal) {
                move.priority += move.totalVal * 200; // Więcej bić = wyższy priorytet
            }
        }

        const promotionRow = player === 'white' ? 0 : 9;
        if (move.toRow === promotionRow) move.priority += 500;

        const piece = board[move.fromRow][move.fromCol];
        if (piece && piece.includes('king')) move.priority += 200;

        const centerDistance = Math.abs(4.5 - move.toRow) + Math.abs(4.5 - move.toCol);
        move.priority += (20 - centerDistance) * 5;

        if (player === 'white') {
            move.priority += (9 - move.toRow) * 3;
        } else {
            move.priority += move.toRow * 3;
        }
    });

    moves.sort((a, b) => b.priority - a.priority);
}

function evaluateBoard(board, playerColor) {
    let score = 0;
    const opponentColor = playerColor === 'white' ? 'black' : 'white';

    let myPawns = 0, myKings = 0, oppPawns = 0, oppKings = 0;
    let myMobility = 0, oppMobility = 0;

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            if (!p || typeof p !== 'string') continue;

            const isMe = p.startsWith(playerColor);
            const isOpponent = p.startsWith(opponentColor);
            if (!isMe && !isOpponent) continue;

            const isKing = p.includes('king');
            let value = 0;

            if (isKing) {
                value += SCORES.KING;
                if (isMe) myKings++;
                else oppKings++;
            } else {
                value += SCORES.PAWN;
                if (isMe) myPawns++;
                else oppPawns++;
            }

            const distFromCenter = Math.abs(4.5 - r) + Math.abs(4.5 - c);
            if (distFromCenter <= 3) {
                value += SCORES.CENTER_CONTROL;
                if (isKing) value += SCORES.KING_ACTIVITY;
            }

            if (c === 0 || c === 9) {
                value += SCORES.EDGE_SAFETY;
            }

            if ((playerColor === 'white' && isMe && r === 9) || 
                (playerColor === 'black' && isMe && r === 0)) {
                value += SCORES.BACK_ROW;
            }

            if (!isKing) {
                let advancementBonus = 0;
                if (p.startsWith('white')) {
                    advancementBonus = (9 - r) * SCORES.ADVANCED_POSITION;
                    if (r <= 2) advancementBonus += SCORES.PROMOTION_BONUS;
                } else if (p.startsWith('black')) {
                    advancementBonus = r * SCORES.ADVANCED_POSITION;
                    if (r >= 7) advancementBonus += SCORES.PROMOTION_BONUS;
                }
                value += advancementBonus;
            }

            let neighbors = 0;
            const checkPositions = [
                [r-1, c-1], [r-1, c+1], [r+1, c-1], [r+1, c+1]
            ];
            for (const [nr, nc] of checkPositions) {
                if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10) {
                    const neighbor = board[nr][nc];
                    if (neighbor && typeof neighbor === 'string' && 
                        ((isMe && neighbor.startsWith(playerColor)) || 
                         (isOpponent && neighbor.startsWith(opponentColor)))) {
                        neighbors++;
                    }
                }
            }
            value += neighbors * 2;

            if (isMe) score += value;
            else score -= value;
        }
    }

    myMobility = getAllMovesForPlayer(board, playerColor).length;
    oppMobility = getAllMovesForPlayer(board, opponentColor).length;
    score += (myMobility - oppMobility) * SCORES.MOBILITY;

    const materialDiff = (myPawns + myKings * 3) - (oppPawns + oppKings * 3);
    score += materialDiff * SCORES.TEMPO;

    const totalPieces = myPawns + myKings + oppPawns + oppKings;
    if (totalPieces <= 8) {
        score += (myKings - oppKings) * 50;
        if (myKings > oppKings) score += 30;
    }

    if (myMobility === 0) score -= 10000;
    if (oppMobility === 0) score += 10000;

    return score;
}

// ===========================
// KLUCZOWA FUNKCJA: SYMULACJA PEŁNEGO RUCHU
// Obsługuje zarówno pojedyncze ruchy jak i łańcuchy bić
// ===========================
function simulateCompleteMove(board, move, player) {
    const newBoard = JSON.parse(JSON.stringify(board));

    // PRZYPADEK 1: Prosty ruch bez bicia
    if (!move.isCapture) {
        newBoard[move.toRow][move.toCol] = newBoard[move.fromRow][move.fromCol];
        newBoard[move.fromRow][move.fromCol] = 0;

        // Promocja
        const p = newBoard[move.toRow][move.toCol];
        if (p && typeof p === 'string' && !p.includes('king')) {
            if (p.startsWith('white') && move.toRow === 0) {
                newBoard[move.toRow][move.toCol] = 'white_king';
            }
            if (p.startsWith('black') && move.toRow === 9) {
                newBoard[move.toRow][move.toCol] = 'black_king';
            }
        }

        return newBoard;
    }

    // PRZYPADEK 2: Bicie (może być łańcuch)
    // Wykonujemy rekurencyjnie wszystkie skoki w łańcuchu
    return simulateCaptureChain(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol, player, []);
}

// Rekurencyjna symulacja łańcucha bić
function simulateCaptureChain(board, fromRow, fromCol, toRow, toCol, player, capturedSoFar) {
    const piece = board[fromRow][fromCol];

    // Wykonaj ten skok
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = 0;

    // Usuń zbity pionek
    const cap = findCapturedPieceBetween(board, fromRow, fromCol, toRow, toCol);
    if (cap) {
        board[cap.r][cap.c] = 0;
        capturedSoFar.push(cap);
    }

    // Promocja (jeśli nastąpiła, kończymy łańcuch - zasady warcab)
    let promoted = false;
    const p = board[toRow][toCol];
    if (p && typeof p === 'string' && !p.includes('king')) {
        if (p.startsWith('white') && toRow === 0) {
            board[toRow][toCol] = 'white_king';
            promoted = true;
        }
        if (p.startsWith('black') && toRow === 9) {
            board[toRow][toCol] = 'black_king';
            promoted = true;
        }
    }

    // Jeśli promocja - koniec łańcucha (zasada międzynarodowych warcab)
    if (promoted) {
        return board;
    }

    // Sprawdź czy są dalsze bicia z nowej pozycji
    const furtherCaptures = getPossibleCaptures(board, toRow, toCol, board[toRow][toCol], capturedSoFar);

    // Jeśli nie ma dalszych bić, koniec
    if (furtherCaptures.length === 0) {
        return board;
    }

    // UWAGA: W prawdziwej implementacji gracz wybiera, którym bić dalej.
    // W symulacji AI bierzemy pierwsze dostępne (lub najdłuższy łańcuch).
    // Dla uproszczenia: bierzemy pierwsze możliwe bicie.
    // LEPSZE ROZWIĄZANIE: getAllMovesForPlayer powinno zwracać KOMPLETNE łańcuchy jako pojedyncze ruchy

    // Na razie dla symulacji: jeśli są dalsze bicia, wybieramy pierwsze
    const [nextR, nextC] = furtherCaptures[0];
    return simulateCaptureChain(board, toRow, toCol, nextR, nextC, player, capturedSoFar);
}