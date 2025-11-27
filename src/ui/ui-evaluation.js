import { getBestMoveWithEvaluation } from "../core/ai.js";
import { gameState } from "../core/gameState.js";

let isAnalysisEnabled = true;

export function initEvaluationUI() {
  const toggleBtn = document.getElementById("toggle-analysis");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      isAnalysisEnabled = !isAnalysisEnabled;
      toggleBtn.textContent = isAnalysisEnabled ? "Analiza ON" : "Analiza OFF";
      
      const panel = document.querySelector(".eval-bar-container");
      const list = document.querySelector(".top-moves");
      if (panel) panel.style.opacity = isAnalysisEnabled ? "1" : "0.3";
      if (list) list.style.opacity = isAnalysisEnabled ? "1" : "0.3";
    });
  }
}

export function updateEvaluationDisplay(board, player) {
  if (!isAnalysisEnabled) return;

  if (gameState.aiEnabled && player !== gameState.playerColor) {
    const list = document.getElementById("topMovesList");
    const score = document.getElementById("evalScore");
    if (list) list.innerHTML = '<div class="move-item">Ruch przeciwnika...</div>';
    if (score) score.innerText = "...";
    return;
  }

  setTimeout(() => {
    const data = getBestMoveWithEvaluation(board, player, 7); // Depth 7 dla szybkości UI
    updateBar(data.evaluation);
    updateTopMoves(data.topMoves);
  }, 50);
}

function updateBar(evalData) {
  const scoreEl = document.getElementById("evalScore");
  const whiteBar = document.getElementById("evalBarWhite");
  const blackBar = document.getElementById("evalBarBlack");
  const whitePerc = document.getElementById("whitePercentage");
  const blackPerc = document.getElementById("blackPercentage");

  if (!scoreEl || !whiteBar) return;

  let displayScore = evalData.scoreWhiteView;
  
  const scoreNum = (Math.abs(displayScore) / 100).toFixed(2);
  const sign = displayScore >= 0 ? "+" : "";
  scoreEl.textContent = `${sign}${scoreNum}`;
  scoreEl.style.color = displayScore >= 0 ? "#4a9eff" : "#ff6b6b";

  let wp = evalData.winPercentWhite;
  let whiteChance = wp;
  whiteChance = Math.max(5, Math.min(95, whiteChance));

  if (whiteBar) whiteBar.style.width = `${whiteChance}%`;
  if (blackBar) blackBar.style.width = `${100 - whiteChance}%`;
  if (whitePerc) whitePerc.textContent = `${Math.round(whiteChance)}%`;
  if (blackPerc) blackPerc.textContent = `${Math.round(100 - whiteChance)}%`;
}

function updateTopMoves(moves) {
  const list = document.getElementById("topMovesList");
  if (!list) return;

  list.innerHTML = "";
  if (moves.length === 0) {
    list.innerHTML = '<div class="move-item">Brak dobrych ruchów</div>';
    return;
  }

  moves.forEach((m, index) => {
    const div = document.createElement("div");
    div.className = `move-item ${index === 0 ? "best" : ""}`;
    div.style.cursor = "pointer";
    div.title = "Kliknij, aby wykonać ten ruch";

    div.addEventListener("mouseover", () => div.style.background = "#34495e");
    div.addEventListener("mouseout", () => div.style.background = index === 0 ? "#1a2a1a" : "#1a1a1a");

    div.addEventListener("click", () => {
      const event = new CustomEvent("forceMove", { detail: m });
      document.dispatchEvent(event);
    });

    let displayScore = m.scoreWhiteView;
    const scoreDisplay = (Math.abs(displayScore) / 100).toFixed(2);
    const sign = displayScore >= 0 ? "+" : "";
    let winRateClass = "neutral";
    if (m.winPercentWhite >= 60) winRateClass = "good";
    if (m.winPercentWhite <= 40) winRateClass = "bad";

    div.innerHTML = `
      <span class="move-notation">${index + 1}. <strong>${m.notation}</strong></span>
      <div class="move-eval">
        <span class="move-score" style="color: ${displayScore >= 0 ? '#4a9eff' : '#ff6b6b'}">${sign}${scoreDisplay}</span>
        <span class="move-winrate ${winRateClass}">${Math.round(m.winPercentWhite)}%</span>
      </div>
    `;
    list.appendChild(div);
  });
}
