const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const cellSize = 50;
const boardSize = 10;

let board = Array(boardSize).fill().map(() => Array(boardSize).fill(0));
let selected = null; // {row, col}
let possibleMoves = []; // [{row, col, capture: {row,col} or null}]
let currentPlayer = 1; // 1 white (bottom), 2 black (top)

const colors = {
    light: '#f0d9b5',
    dark: '#b58863',
    whiteMan: '#ffffff',
    blackMan: '#000000',
    whiteKing: '#ffebcd',
    blackKing: '#8b4513',
    select: '#ffff00',
    highlight: 'rgba(0,255,0,0.3)',
    captureHighlight: 'rgba(255,0,0,0.3)'
};

// Helper functions
function getPlayer(piece) {
    return piece === 1 || piece === 3 ? 1 : 2;
}

function isKing(piece) {
    return piece > 2;
}

function isMan(piece) {
    return piece < 3;
}

function getOpponent(player) {
    return 3 - player;
}

function getDirection(player) {
    return player === 1 ? -1 : 1; // white up, black down
}

function isValidPos(row, col) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function isEmpty(row, col) {
    return isValidPos(row, col) && board[row][col] === 0;
}

function getBasicMoves(row, col) {
    const moves = [];
    const piece = board[row][col];
    const player = getPlayer(piece);
    const dir = getDirection(player);
    const dirs = isKing(piece) ? [dir, -dir] : [dir];
    const dcols = [-1, 1];
    for (const drow of dirs) {
        for (const dcol of dcols) {
            const nr = row + drow;
            const nc = col + dcol;
            if (isEmpty(nr, nc)) {
                moves.push({row: nr, col: nc, capture: null});
            }
        }
    }
    return moves;
}

function minimax(b, depth, alpha, beta, maximizing) {
    if (depth === 0) {
        return evaluate(b, currentPlayer);
    }
    const player = maximizing ? currentPlayer : getOpponent(currentPlayer);
    const moves = getAllLegalMoves(player);
    if (moves.length === 0) {
        return evaluate(b, currentPlayer);
    }
    if (maximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const newBoard = cloneBoard();
            executeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, {capture: move.capture});
            const evalScore = minimax(newBoard, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const newBoard = cloneBoard();
            executeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, {capture: move.capture});
            const evalScore = minimax(newBoard, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluate(board, maximizingPlayer) {
    let score = 0;
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const piece = board[row][col];
            const player = getPlayer(piece);
            if (player === maximizingPlayer) {
                const value = isKing(piece) ? 3 : 1;
                score += value;
                // Position bonus
                if (isMan(piece)) {
                    score += (maximizingPlayer === 1 ? (9 - row) : row) * 0.1;
                } else {
                    score += 0.5; // king center bonus
                }
            } else if (player === getOpponent(maximizingPlayer)) {
                const value = isKing(piece) ? 3 : 1;
                score -= value;
            }
        }
    }
    return score;
}

function getAllLegalMoves(player) {
    const moves = [];
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const piece = board[row][col];
            if (getPlayer(piece) === player) {
                const legal = getLegalMoves(row, col);
                for (const m of legal) {
                    moves.push({fromRow: row, fromCol: col, toRow: m.row, toCol: m.col, capture: m.capture});
                }
            }
        }
    }
    return moves;
}

function cloneBoard() {
    return board.map(row => [...row]);
}

function updateUI() {
    document.getElementById('score').textContent = '--';
    document.getElementById('moves-list').innerHTML = '';
}

// Canvas click handler
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (!isValidPos(row, col)) return;

    const piece = board[row][col];

    if (selected) {
        const move = possibleMoves.find(m => m.row === row && m.col === col);
        if (move) {
            executeMove(selected.row, selected.col, row, col, move);
            updateUI();
        }
        selected = null;
        possibleMoves = [];
    } else {
        const playerPieces = currentPlayer === 1 ? [1, 3] : [2, 4];
        if (playerPieces.includes(piece)) {
            selected = {row, col};
            possibleMoves = getLegalMoves(row, col);
        }
    }
    drawBoard();
});

initBoard();
drawBoard();
updateUI();

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const x = col * cellSize;
            const y = row * cellSize;
            ctx.fillStyle = (row + col) % 2 === 0 ? colors.light : colors.dark;
            ctx.fillRect(x, y, cellSize, cellSize);

            const piece = board[row][col];
            if (piece !== 0) {
                ctx.beginPath();
                ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 3, 0, 2 * Math.PI);
                ctx.fillStyle = piece === 1 ? colors.whiteMan :
                                piece === 2 ? colors.blackMan :
                                piece === 3 ? colors.whiteKing :
                                colors.blackKing;
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();

                if (isKing(piece)) {
                    ctx.fillStyle = '#ffd700';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('👑', x + cellSize / 2, y + cellSize / 2);
                }

                if (selected && selected.row === row && selected.col === col) {
                    ctx.fillStyle = colors.select;
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 3 + 5, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    possibleMoves.forEach(move => {
        const x = move.col * cellSize;
        const y = move.row * cellSize;
        ctx.fillStyle = move.capture ? colors.captureHighlight : colors.highlight;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.globalAlpha = 1;
    });
}

function updateUI() {
    document.getElementById('score').textContent = '--';
    document.getElementById('moves-list').innerHTML = '';
}

function initBoard() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if ((row + col) % 2 === 0) continue; // light squares empty
            if (row < 4) {
                board[row][col] = 2; // black men top
            } else if (row >= 6) {
                board[row][col] = 1; // white men bottom
            }
        }
    }
}

function executeMove(fromRow, fromCol, toRow, toCol, moveObj) {
    const piece = board[fromRow][fromCol];
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = 0;
    if (moveObj.capture) {
        board[moveObj.capture.row][moveObj.capture.col] = 0;
    }
    // Promotion
    const player = getPlayer(piece);
    const promoteRow = player === 1 ? 0 : boardSize - 1;
    if (isMan(piece) && toRow === promoteRow) {
        board[toRow][toCol] += 2; // man to king
    }
    currentPlayer = getOpponent(player);
    selected = null;
    possibleMoves = [];
}

function hasAnyCaptures(player) {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const piece = board[row][col];
            if (getPlayer(piece) === player) {
                if (getCaptureMoves(row, col).length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getLegalMoves(row, col) {
    const captures = getCaptureMoves(row, col);
    if (captures.length > 0 || hasAnyCaptures(currentPlayer)) {
        return captures;
    }
    return getBasicMoves(row, col);
}

function getCaptureMoves(row, col) {
    const moves = [];
    const piece = board[row][col];
    const player = getPlayer(piece);
    const opp = getOpponent(player);
    const dir = getDirection(player);
    const dirs = isKing(piece) ? [dir, -dir] : [dir];
    const dcols = [-1, 1];
    for (const drow of dirs) {
        for (const dcol of dcols) {
            const mr = row + drow;
            const mc = col + dcol;
            const tr = row + 2 * drow;
            const tc = col + 2 * dcol;
            if (isValidPos(mr, mc) && isValidPos(tr, tc) &&
                board[mr][mc] === opp && isEmpty(tr, tc)) {
                moves.push({row: tr, col: tc, capture: {row: mr, col: mc}});
            }
        }
    }
    return moves;
}
