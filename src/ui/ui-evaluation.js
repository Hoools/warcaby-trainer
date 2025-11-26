// Dodaj to do nowego pliku src/ui/ui-evaluation.js

import { getBestMoveWithEvaluation, scoreToWinPercentage } from '../core/ai.js';
import { gameState } from '../core/gameState.js';

let analysisEnabled = true;

export function initEvaluationUI() {
    const toggleBtn = document.getElementById('toggle-analysis');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            analysisEnabled = !analysisEnabled;
            toggleBtn.textContent = analysisEnabled ? 'Analiza ON' : 'Analiza OFF';
            if (!analysisEnabled) {
                clearEvaluationDisplay();
            }
        });
    }
}

export function updateEvaluationDisplay(board, currentPlayer) {
    if (!analysisEnabled) return;

    // Asynchronicznie analizuj pozycję (żeby nie blokować UI)
    setTimeout(() => {
        const analysis = getBestMoveWithEvaluation(board, currentPlayer, 6); // Głębokość 6 dla szybszej analizy
        displayEvaluation(analysis, currentPlayer);
    }, 100);
}

function displayEvaluation(analysis, player) {
    const { evaluation, topMoves } = analysis;

    // Aktualizuj pasek oceny
    updateEvalBar(evaluation.winPercent, player);

    // Aktualizuj wynik
    const scoreElem = document.getElementById('evalScore');
    if (scoreElem) {
        const sign = evaluation.score >= 0 ? '+' : '';
        scoreElem.textContent = `${sign}${(evaluation.score / 100).toFixed(2)}`;
        scoreElem.style.color = evaluation.score > 0 ? '#00ff00' : 
                                 evaluation.score < 0 ? '#ff4444' : '#4a9eff';
    }

    // Wyświetl top ruchy
    displayTopMoves(topMoves);
}

function updateEvalBar(winPercent, player) {
    const blackBar = document.getElementById('evalBarBlack');
    const whiteBar = document.getElementById('evalBarWhite');
    const blackPct = document.getElementById('blackPercentage');
    const whitePct = document.getElementById('whitePercentage');

    if (!blackBar || !whiteBar) return;

    // Oblicz procenty dla obu stron
    let whiteWinPercent, blackWinPercent;

    if (player === 'white') {
        whiteWinPercent = winPercent;
        blackWinPercent = 100 - winPercent;
    } else {
        blackWinPercent = winPercent;
        whiteWinPercent = 100 - winPercent;
    }

    // Aktualizuj szerokości
    blackBar.style.width = `${blackWinPercent}%`;
    whiteBar.style.width = `${whiteWinPercent}%`;

    // Aktualizuj tekst
    if (blackPct) blackPct.textContent = `${blackWinPercent.toFixed(1)}%`;
    if (whitePct) whitePct.textContent = `${whiteWinPercent.toFixed(1)}%`;
}

function displayTopMoves(topMoves) {
    const container = document.getElementById('topMovesList');
    if (!container) return;

    container.innerHTML = '';

    topMoves.forEach((moveData, index) => {
        const { move, score, winPercent } = moveData;

        const moveDiv = document.createElement('div');
        moveDiv.className = `move-item ${index === 0 ? 'best' : ''}`;

        // Notacja ruchu (np. "e4-e6")
        const notation = getMoveNotation(move);

        moveDiv.innerHTML = `
            <div class="move-notation">${index + 1}. ${notation}</div>
            <div class="move-eval">
                <span class="move-score">${(score / 100).toFixed(2)}</span>
                <span class="move-winrate ${winPercent > 50 ? 'good' : 'bad'}">${winPercent.toFixed(1)}%</span>
            </div>
        `;

        container.appendChild(moveDiv);
    });
}

function getMoveNotation(move) {
    // Konwersja numerów pól na notację (możesz dostosować)
    const fromSquare = rowColToNotation(move.fromRow, move.fromCol);
    const toSquare = rowColToNotation(move.toRow, move.toCol);
    const capture = move.isCapture ? 'x' : '-';
    return `${fromSquare}${capture}${toSquare}`;
}

function rowColToNotation(row, col) {
    // Prosta numeracja 1-50 dla warcab 10x10 (tylko czarne pola)
    // Lub możesz użyć notacji szachowej a1-j10
    return `${String.fromCharCode(97 + col)}${10 - row}`;
}

function clearEvaluationDisplay() {
    const blackBar = document.getElementById('evalBarBlack');
    const whiteBar = document.getElementById('evalBarWhite');
    const scoreElem = document.getElementById('evalScore');
    const container = document.getElementById('topMovesList');

    if (blackBar) blackBar.style.width = '50%';
    if (whiteBar) whiteBar.style.width = '50%';
    if (scoreElem) {
        scoreElem.textContent = '+0.00';
        scoreElem.style.color = '#4a9eff';
    }
    if (container) container.innerHTML = '';
}

// Eksportuj dla użycia w main.js
export { analysisEnabled };