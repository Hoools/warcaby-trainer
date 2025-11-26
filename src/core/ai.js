import { getAllMovesForPlayer, findCapturedPieceBetween } from './rules.js';

// Wagi dla oceny sytuacji
const SCORES = {
    PAWN: 10,
    KING: 30,       // Damka jest warta 3x więcej niż pion
    POSITION: 1,    // Bonus za zajmowanie kluczowych pól
    PROMOTION: 0.5, // Bonus za zbliżanie się do linii przemiany
    EDGE: 1,        // Bonus za bezpieczne pozycje przy bandzie
    RANDOM: 0.3     // Mniejszy czynnik losowy, by nie psuć dobrych decyzji
};

// Zwiększona domyślna głębokość do 4 (lepsza gra, akceptowalna wydajność)
export function getBestMove(board, player, depth = 4) {
    // Pracujemy na głębokiej kopii planszy, żeby symulacje nie psuły stanu gry
    const boardCopy = JSON.parse(JSON.stringify(board));
    
    // Uruchamiamy algorytm Minimax
    // isMaximizing = true (AI chce zmaksymalizować swój wynik)
    const result = minimax(boardCopy, depth, -Infinity, Infinity, true, player);
    
    console.log(`AI (${player}) ocena ruchu: ${result.score.toFixed(2)}`);
    return result.move;
}

function minimax(board, depth, alpha, beta, isMaximizing, playerColor) {
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const currentPlayer = isMaximizing ? playerColor : opponentColor;
    
    // Pobieramy wszystkie legalne ruchy
    const validMoves = getAllMovesForPlayer(board, currentPlayer);

    // Warunek końcowy: osiągnięto głębokość 0 lub brak ruchów (przegrana)
    if (depth === 0 || validMoves.length === 0) {
        return { score: evaluateBoard(board, playerColor) };
    }

    // Sortowanie ruchów dla lepszej optymalizacji alfa-beta
    // 1. Bicia (najważniejsze)
    // 2. Promocja na damkę (jeśli ruch kończy się na linii przemiany)
    validMoves.sort((a, b) => {
        if (a.isCapture !== b.isCapture) return b.isCapture - a.isCapture;
        
        const aPromotes = (currentPlayer === 'white' && a.toRow === 0) || (currentPlayer === 'black' && a.toRow === 9);
        const bPromotes = (currentPlayer === 'white' && b.toRow === 0) || (currentPlayer === 'black' && b.toRow === 9);
        
        if (aPromotes && !bPromotes) return -1; // a lepsze (wyżej na liście)
        if (!aPromotes && bPromotes) return 1;
        return 0;
    });

    let bestMove = null;

    if (isMaximizing) {
        let maxEval = -Infinity;

        for (const move of validMoves) {
            const newBoard = simulateMove(board, move);
            const evalNode = minimax(newBoard, depth - 1, alpha, beta, false, playerColor);
            
            // Delikatny szum losowy tylko przy głównej ocenie, żeby urozmaicić grę przy równych szansach
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
            // Sprawdzenie typu, żeby uniknąć błędów na pustych polach (0)
            if (!p || typeof p !== 'string') continue;

            const isMe = p.startsWith(playerColor);
            const isOpponent = p.startsWith(opponentColor);

            if (!isMe && !isOpponent) continue;

            let value = 0;
            const isKing = p.includes('king');

            // 1. Materiał
            value += isKing ? SCORES.KING : SCORES.PAWN;
            
            // 2. Pozycja (Centrum jest silne)
            if (c >= 3 && c <= 6 && r >= 3 && r <= 6) value += SCORES.POSITION;

            // 3. Bezpieczeństwo na bandach (trudniej zbić)
            if (c === 0 || c === 9) value += SCORES.EDGE;

            // 4. Dążenie do promocji (tylko dla zwykłych pionów)
            if (!isKing) {
                // Białe zaczynają na dole (r=6..9), idą w stronę r=0
                if (p.startsWith('white')) {
                    // Im mniejsze r (bliżej 0), tym lepiej
                    value += (9 - r) * SCORES.PROMOTION; 
                } 
                // Czarne zaczynają na górze (r=0..3), idą w stronę r=9
                else if (p.startsWith('black')) {
                    // Im większe r (bliżej 9), tym lepiej
                    value += r * SCORES.PROMOTION;
                }
            }

            if (isMe) score += value;
            else score -= value;
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
    if (p && typeof p === 'string' && !p.includes('king')) {
        if (p.startsWith('white') && move.toRow === 0) newBoard[move.toRow][move.toCol] = 'white_king';
        if (p.startsWith('black') && move.toRow === 9) newBoard[move.toRow][move.toCol] = 'black_king';
    }

    return newBoard;
}
