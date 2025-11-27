importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js');

let model = null;
const MODEL_PATH = 'indexeddb://checkers-pro-v1'; 

self.onmessage = async (e) => {
    const { command } = e.data;
    if (command === 'START_TRAINING') {
        await trainLoop();
    }
};

async function trainLoop() {
    try {
        model = await tf.loadLayersModel(MODEL_PATH);
        // WAŻNE: Po załadowaniu trzeba skompilować, aby działało model.fit()
        model.compile({optimizer: tf.train.adam(0.001), loss: 'meanSquaredError'});
    } catch (e) {
        model = tf.sequential();
        model.add(tf.layers.conv2d({inputShape: [10, 10, 4], filters: 64, kernelSize: 3, activation: 'relu', padding: 'same'}));
        model.add(tf.layers.conv2d({filters: 64, kernelSize: 3, activation: 'relu', padding: 'same'}));
        model.add(tf.layers.conv2d({filters: 64, kernelSize: 3, activation: 'relu', padding: 'same'}));
        model.add(tf.layers.conv2d({filters: 32, kernelSize: 1, activation: 'relu', padding: 'same'}));
        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({units: 256, activation: 'relu'}));
        model.add(tf.layers.dense({units: 128, activation: 'relu'}));
        model.add(tf.layers.dense({units: 1, activation: 'tanh'}));
        model.compile({optimizer: tf.train.adam(0.001), loss: 'meanSquaredError'});
    }

    const TOTAL_GAMES = 50;
    let gamesPlayed = 0;
    
    self.postMessage({ type: 'STATUS', msg: 'Trening rozpoczęty (Self-Play)...' });

    while (gamesPlayed < TOTAL_GAMES) {
        await playSelfGameAndTrain();
        gamesPlayed++;
        self.postMessage({ type: 'PROGRESS', current: gamesPlayed, total: TOTAL_GAMES });
    }

    self.postMessage({ type: 'STATUS', msg: 'Przesyłanie modelu...' });
    
    await model.save(tf.io.withSaveHandler(async (artifacts) => {
        self.postMessage({ 
            type: 'SAVE_MODEL_DATA', 
            artifacts: artifacts 
        });
        return { 
            modelArtifactsInfo: { 
                dateSaved: new Date(), 
                modelTopologyType: 'JSON' 
            } 
        };
    }));
    
    self.postMessage({ type: 'FINISHED' });
}

function boardToTensor(board) {
    const tensorData = [];
    for (let r = 0; r < 10; r++) {
        const row = [];
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            let channels = [0, 0, 0, 0];
            if (typeof p === 'string') {
                if (p === 'white') channels[0] = 1;
                if (p === 'white_king') channels[1] = 1;
                if (p === 'black') channels[2] = 1;
                if (p === 'black_king') channels[3] = 1;
            }
            row.push(channels);
        }
        tensorData.push(row);
    }
    return tf.tensor4d([tensorData]);
}

async function playSelfGameAndTrain() {
    let board = Array(10).fill(null).map(() => Array(10).fill(0));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) if ((r + c) % 2 !== 0) board[r][c] = 'black';
    for (let r = 6; r < 10; r++) for (let c = 0; c < 10; c++) if ((r + c) % 2 !== 0) board[r][c] = 'white';
    
    let currentPlayer = 'white';
    let movesHistory = [];
    let step = 0;

    while (step < 150) { 
        const winner = checkWinner(board, currentPlayer);
        if (winner) break;

        const moves = generateMoves(board, currentPlayer);
        if (moves.length === 0) break;

        let chosenMove;
        if (Math.random() < 0.25) {
            chosenMove = moves[Math.floor(Math.random() * moves.length)];
        } else {
            let bestVal = -Infinity;
            let bestMoves = [];
            const candidates = moves.length > 5 ? moves.sort(() => 0.5 - Math.random()).slice(0, 5) : moves;
            
            for (let m of candidates) {
                const nextBoard = simulateMove(board, m);
                const tensor = boardToTensor(nextBoard);
                const pred = model.predict(tensor).dataSync()[0];
                tensor.dispose();
                
                let val = (currentPlayer === 'white') ? pred : -pred;
                if (val > bestVal) { bestVal = val; bestMoves = [m]; } 
                else if (val === bestVal) { bestMoves.push(m); }
            }
            chosenMove = bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : moves[0];
        }

        movesHistory.push({ boardInput: boardToTensor(board), player: currentPlayer });
        board = simulateMove(board, chosenMove);
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        step++;
    }

    let finalReward = 0;
    const winner = checkWinner(board, currentPlayer); 
    
    if (winner === 'white') finalReward = 1;
    else if (winner === 'black') finalReward = -1;
    else if (generateMoves(board, currentPlayer).length === 0) finalReward = (currentPlayer === 'white') ? -1 : 1;

    const gamma = 0.95;
    let r = finalReward;
    for (let i = movesHistory.length - 1; i >= 0; i--) {
        const state = movesHistory[i];
        await model.fit(state.boardInput, tf.tensor2d([r], [1, 1]), { epochs: 1, verbose: 0 });
        state.boardInput.dispose();
        r = r * gamma;
    }
}

function checkWinner(board, player) {
    let w = 0, b = 0;
    for(let r=0; r<10; r++) for(let c=0; c<10; c++) {
        const p = board[r][c];
        if(p && p.toString().startsWith('white')) w++;
        if(p && p.toString().startsWith('black')) b++;
    }
    if (w === 0) return 'black';
    if (b === 0) return 'white';
    return null;
}

function generateMoves(board, player) {
    let moves = [];
    let captures = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            if (!p || !p.toString().startsWith(player)) continue;
            const isKing = p.includes('king');
            const dirs = isKing ? [[-1,-1],[-1,1],[1,-1],[1,1]] : (player==='white' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]);
            
            for (let d of dirs) {
                let tr = r + d[0], tc = c + d[1];
                if (tr>=0 && tr<10 && tc>=0 && tc<10 && board[tr][tc] === 0) {
                     moves.push({fromRow:r, fromCol:c, toRow:tr, toCol:tc, isCapture:false});
                }
                let jr = r + d[0]*2, jc = c + d[1]*2;
                let mr = r + d[0], mc = c + d[1];
                if (jr>=0 && jr<10 && jc>=0 && jc<10 && board[jr][jc] === 0) {
                    const mid = board[mr][mc];
                    if (mid && mid !== 0 && !mid.toString().startsWith(player)) {
                        captures.push({fromRow:r, fromCol:c, toRow:jr, toCol:jc, isCapture:true});
                    }
                }
            }
        }
    }
    return captures.length > 0 ? captures : moves;
}

function simulateMove(board, move) {
    const newBoard = JSON.parse(JSON.stringify(board));
    const p = newBoard[move.fromRow][move.fromCol];
    newBoard[move.toRow][move.toCol] = p;
    newBoard[move.fromRow][move.fromCol] = 0;
    if (move.isCapture) {
        const mr = (move.fromRow + move.toRow)/2;
        const mc = (move.fromCol + move.toCol)/2;
        newBoard[mr][mc] = 0;
    }
    if (p && !p.includes('king')) {
        if ((p.startsWith('white') && move.toRow===0) || (p.startsWith('black') && move.toRow===9)) {
            newBoard[move.toRow][move.toCol] = p.split('_')[0] + '_king';
        }
    }
    return newBoard;
}
