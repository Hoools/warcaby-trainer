import { getBestMoveWithEvaluation } from '../core/ai.js';
import { gameState } from '../core/gameState.js';

let isAnalysisEnabled = true;

export function initEvaluationUI() {
    const toggleBtn = document.getElementById('toggle-analysis');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isAnalysisEnabled = !isAnalysisEnabled;
            toggleBtn.textContent = isAnalysisEnabled ? 'Analiza: ON' : 'Analiza: OFF';
            const panel = document.querySelector('.eval-bar-container');
            const list = document.querySelector('.top-moves');
            if (panel) panel.style.opacity = isAnalysisEnabled ? '1' : '0.3';
            if (list) list.style.opacity = isAnalysisEnabled ? '1' : '0.3';
        });
    }
}

export function updateEvaluationDisplay(board, player) {
    if (!isAnalysisEnabled) return;

    if (gameState.aiEnabled && player !== gameState.playerColor) {
        const list = document.getElementById('topMovesList');
        const score = document.getElementById('evalScore');
        if(list) list.innerHTML = '<div class="move-item">Ruch przeciwnika...</div>';
        if(score) score.innerText = '...';
        return;
    }

    setTimeout(() => {
        const data = getBestMoveWithEvaluation(board, player, 8); // Depth 8
        updateBar(data.evaluation);
        updateTopMoves(data.topMoves);
    }, 50);
}

function updateBar(evalData) {
    const scoreEl = document.getElementById('evalScore');
    const whiteBar = document.getElementById('evalBarWhite');
    const blackBar = document.getElementById('evalBarBlack');
    const whitePerc = document.getElementById('whitePercentage');
    const blackPerc = document.getElementById('blackPercentage');

    if (!scoreEl || !whiteBar) return;

    let displayScore = evalData.score;
    // W konwencji szachowej: + zawsze oznacza przewagę Białych, - Czarnych.
    // Jeśli 'player' to black, a 'score' jest dodatni (czyli dobrze dla black),
    // to w notacji absolutnej powinien być ujemny.
    if (evalData.player === 'black') {
        displayScore = -displayScore;
    }

    const scoreNum = (displayScore / 100).toFixed(2);
    const sign = displayScore > 0 ? '+' : '';
    scoreEl.textContent = `${sign}${scoreNum}`;
    scoreEl.style.color = displayScore > 0 ? '#fff' : '#aaa'; // Neutralny kolor

    let wp = evalData.winPercent;
    let whiteChance = evalData.player === 'white' ? wp : (100 - wp);
    whiteChance = Math.max(5, Math.min(95, whiteChance));
    
    whiteBar.style.width = `${whiteChance}%`;
    blackBar.style.width = `${100 - whiteChance}%`;
    whitePerc.textContent = Math.round(whiteChance) + '%';
    blackPerc.textContent = Math.round(100 - whiteChance) + '%';
}

function updateTopMoves(moves) {
    const list = document.getElementById('topMovesList');
    if (!list) return;
    list.innerHTML = '';

    if (moves.length === 0) {
        list.innerHTML = '<div class="move-item">Brak dobrych ruchów</div>';
        return;
    }

    moves.forEach((m, index) => {
        const div = document.createElement('div');
        div.className = 'move-item';
        if (index === 0) div.classList.add('best');
        
        div.style.cursor = 'pointer';
        div.title = "Kliknij, aby wykonać ten ruch";
        div.addEventListener('mouseover', () => div.style.background = '#34495e');
        div.addEventListener('mouseout', () => div.style.background = index === 0 ? '#1a2a1a' : '#1a1a1a');

        div.addEventListener('click', () => {
            const event = new CustomEvent('forceMove', { 
                detail: { ...m.move } 
            });
            document.dispatchEvent(event);
        });

        // Korekta wyświetlania +/-
        let displayScore = m.score;
        // Jeśli oceniamy ruchy czarnych, wynik dodatni = dobrze dla czarnych = minus w notacji.
        // Ale uwaga: getBestMoveWithEvaluation zwraca score relatywny do gracza.
        // Musimy sprawdzić, czyja to tura.
        if (gameState.currentPlayer === 'black') {
            displayScore = -displayScore;
        }

        const scoreDisplay = (displayScore / 100).toFixed(2);
        const sign = displayScore > 0 ? '+' : '';
        
        let winRateClass = 'neutral';
        if (m.winPercent > 60) winRateClass = 'good';
        if (m.winPercent < 40) winRateClass = 'bad';

        div.innerHTML = `
            <span class="move-notation">${index + 1}. <strong>${m.notation}</strong></span>
            <div class="move-eval">
                <span class="move-score" style="color: ${displayScore > 0 ? '#4a9eff' : '#ff6b6b'}">${sign}${scoreDisplay}</span>
                <span class="move-winrate ${winRateClass}">${Math.round(m.winPercent)}%</span>
            </div>
        `;
        list.appendChild(div);
    });
}
