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

    // Ukryj ocenę, jeśli to tura przeciwnika i AI gra (nie chcemy spoilerów/rozpraszania)
    if (gameState.aiEnabled && player !== gameState.playerColor) {
        const list = document.getElementById('topMovesList');
        const score = document.getElementById('evalScore');
        if(list) list.innerHTML = '<div class="move-item">Analiza przeciwnika...</div>';
        if(score) score.innerText = '...';
        return;
    }

    setTimeout(() => {
        // Depth 7 dla lepszej jakości porad
        const data = getBestMoveWithEvaluation(board, player, 7);
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

    const scoreNum = (evalData.score / 100).toFixed(2);
    const sign = evalData.score > 0 ? '+' : '';
    scoreEl.textContent = `${sign}${scoreNum}`;
    scoreEl.style.color = evalData.score > 0 ? '#4a9eff' : '#ff4444';

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

        const scoreDisplay = (m.score / 100).toFixed(2);
        const sign = m.score > 0 ? '+' : '';
        
        let winRateClass = 'neutral';
        if (m.winPercent > 60) winRateClass = 'good';
        if (m.winPercent < 40) winRateClass = 'bad';

        div.innerHTML = `
            <span class="move-notation">${index + 1}. <strong>${m.notation}</strong></span>
            <div class="move-eval">
                <span class="move-score" style="color: ${m.score > 0 ? '#4a9eff' : '#ff6b6b'}">${sign}${scoreDisplay}</span>
                <span class="move-winrate ${winRateClass}">${Math.round(m.winPercent)}%</span>
            </div>
        `;
        list.appendChild(div);
    });
}
