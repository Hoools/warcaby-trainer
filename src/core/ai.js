import { getAllMovesForPlayer, findCapturedPieceBetween } from './rules.js';

// Wagi dla oceny sytuacji
const SCORES = {
    PAWN: 10,
    KING: 30,       // Damka jest warta 3x więcej niż pion
    POSITION: 1,    // Bonus za zajmowanie środka planszy
    RANDOM: 0.5     // Mały czynnik losowy, żeby gry nie były identyczne
};

export function getBestMove(board, player, depth = 3) {
    // Pracujemy na głębokiej kopii planszy, żeby symulacje nie psuły stanu gry
    const boardCopy = JSON.parse(JSON.stringify(board));
    
    // Uruchamiamy algorytm Minimax
    const result = minimax(boardCopy, depth, -Infinity, Infinity, true, player);
    
    // Zwracamy najlepszy znaleziony ruch (lub null jeśli brak ruchów)
    return result.move;
}

function minimax(board, depth, alpha, beta, isMaximizing, playerColor) {
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const currentPlayer = isMaximizing ? playerColor : opponentColor;
    
    // Pobieramy wszystkie legalne ruchy (uwzględniając zasady bicia)
    const validMoves = getAllMovesForPlayer(board, currentPlayer);

    // Warunek końcowy: osiągnięto głębokość 0 lub brak ruchów (przegrana)
    if (depth === 0 || validMoves.length === 0) {
        return { score: evaluateBoard(board, playerColor) };
    }

    let bestMove = null;

    if (isMaximizing) {
        let maxEval = -Infinity;
        // Sortujemy ruchy: bicia sprawdzamy jako pierwsze (optymalizacja alfa-beta)
        validMoves.sort((a, b) => b.isCapture - a.isCapture);

        for (const move of validMoves) {
            const newBoard = simulateMove(board, move);
            const evalNode = minimax(newBoard, depth - 1, alpha, beta, false, playerColor);
            
            // Dodajemy losowy szum
            const currentScore = evalNode.score + (Math.random() * SCORES.RANDOM);

            if (currentScore > maxEval) {
                maxEval = currentScore;
                bestMove = move;
            }
            alpha = Math.max(alpha, currentScore);
            if (beta <= alpha) break; // Cięcie alfa-beta
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        validMoves.sort((a, b) => b.isCapture - a.isCapture);

        for (const move of validMoves) {
            const newBoard = simulateMove(board, move);
            const evalNode = minimax(newBoard, depth - 1, alpha, beta, true, playerColor);
            
            const currentScore = evalNode.score - (Math.random() * SCORES.RANDOM);

            if (currentScore < minEval) {
                minEval = currentScore;
                bestMove = move;
            }
            beta = Math.min(beta, currentScore);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove };
    }
}

function evaluateBoard(board, playerColor) {
    let score = 0;
    const opponentColor = playerColor === 'white' ? 'black' : 'white';

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            if (!p) continue;

            const isMe = p.startsWith(playerColor);
            const isOpponent = p.startsWith(opponentColor);
            const isKing = p.includes('king');

            let value = isKing ? SCORES.KING : SCORES.PAWN;
            
            // Bonus za pozycję w centrum (pola od 3 do 6)
            if (c >= 3 && c <= 6 && r >= 3 && r <= 6) value += SCORES.POSITION;

            if (isMe) score += value;
            if (isOpponent) score -= value;
        }
    }
    return score;
}

function simulateMove(board, move) {
    const newBoard = JSON.parse(JSON.stringify(board));
    
    // Przesunięcie piona
    newBoard[move.toRow][move.toCol] = newBoard[move.fromRow][move.fromCol];
    newBoard[move.fromRow][move.fromCol] = 0;

    // Usunięcie zbitego piona (symulacja pojedynczego skoku)
    if (move.isCapture) {
        const cap = findCapturedPieceBetween(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
        if (cap) {
            newBoard[cap.r][cap.c] = 0;
        }
    }

    // Promocja na damkę
    const p = newBoard[move.toRow][move.toCol];
    if (p && !p.includes('king')) {
        if (p.startsWith('white') && move.toRow === 0) newBoard[move.toRow][move.toCol] = 'white_king';
        if (p.startsWith('black') && move.toRow === 9) newBoard[move.toRow][move.toCol] = 'black_king';
    }

    return newBoard;
}
