import { getBestMoveWithEvaluation } from '../core/ai.js';

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

    // Używamy setTimeout, żeby nie blokować interfejsu przy cięższych obliczeniach
    setTimeout(() => {
        // Pobieramy najlepsze ruchy (depth 5 dla analizy UI)
        const data = getBestMoveWithEvaluation(board, player, 5);
        
        updateBar(data.evaluation);
        updateTopMoves(data.topMoves);
    }, 10);
}

function updateBar(evalData) {
    const scoreEl = document.getElementById('evalScore');
    const whiteBar = document.getElementById('evalBarWhite');
    const blackBar = document.getElementById('evalBarBlack');
    const whitePerc = document.getElementById('whitePercentage');
    const blackPerc = document.getElementById('blackPercentage');

    if (!scoreEl || !whiteBar) return;

    // Wyświetlanie wyniku (np. +1.50)
    // Dzielimy przez 100, bo score 100 = 1 pionek
    const scoreNum = (evalData.score / 100).toFixed(2);
    const sign = evalData.score > 0 ? '+' : '';
    scoreEl.textContent = `${sign}${scoreNum}`;
    scoreEl.style.color = evalData.score > 0 ? '#4a9eff' : '#ff4444';

    // Obliczanie szerokości paska na podstawie winPercent
    let wp = evalData.winPercent;
    // Jeśli to tura czarnych, winPercent jest z ich perspektywy, ale pasek White jest zawsze z lewej/prawej
    // Musimy ustandaryzować: winPercent zawsze z perspektywy aktualnego gracza
    
    // Jeśli oceniamy pozycję dla 'white', wp to szansa białych.
    // Jeśli dla 'black', wp to szansa czarnych.
    let whiteChance = evalData.player === 'white' ? wp : (100 - wp);
    
    // Ograniczenia graficzne (żeby pasek nie zniknął całkowicie)
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
        list.innerHTML = '<div class="move-item">Brak ruchów</div>';
        return;
    }

    moves.forEach((m, index) => {
        const div = document.createElement('div');
        div.className = 'move-item';
        if (index === 0) div.classList.add('best'); // Wyróżnienie najlepszego

        const scoreDisplay = (m.score / 100).toFixed(2);
        const sign = m.score > 0 ? '+' : '';
        
        // Kolorowanie winrate
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
