// src/ui/ui-evaluation.js

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
      if (panel) panel.style.opacity = isAnalysisEnabled ? 1 : 0.3;
      if (list) list.style.opacity = isAnalysisEnabled ? 1 : 0.3;
    });
  }
}

// board, player – kogo ruch analizujemy
export function updateEvaluationDisplay(board, player) {
  if (!isAnalysisEnabled) return;

  // Pokazujemy sugestie tylko dla wybranego koloru gracza
  if (gameState.aiEnabled && player !== gameState.playerColor) {
    const list = document.getElementById("topMovesList");
    const scoreEl = document.getElementById("evalScore");
    if (list) list.innerHTML = '<div class="move-item">Ruch przeciwnika...</div>';
    if (scoreEl) scoreEl.innerText = "...";
    return;
  }

  const list = document.getElementById("topMovesList");
  const scoreEl = document.getElementById("evalScore");
  if (list) list.innerHTML = '<div class="move-item">Analiza...</div>';
  if (scoreEl) scoreEl.innerText = "...";

  setTimeout(() => {
    const data = getBestMoveWithEvaluation(board, player, 8); // Depth 8
    updateBar(data.evaluation);
    updateTopMoves(data.topMoves, data.evaluation.player);
  }, 50);
}

// evalData: { scorePlayer, scoreWhiteView, winPercentWhite, player }
function updateBar(evalData) {
  const scoreEl = document.getElementById("evalScore");
  const whiteBar = document.getElementById("evalBarWhite");
  const blackBar = document.getElementById("evalBarBlack");
  const whitePerc = document.getElementById("whitePercentage");
  const blackPerc = document.getElementById("blackPercentage");

  if (!scoreEl || !whiteBar || !blackBar || !whitePerc || !blackPerc) return;

  // Używamy scoreWhiteView – dodatni = przewaga białych (konwencja szachowa)
  const displayScore = evalData.scoreWhiteView;

  // Szansa białych w %, bez kombinowania z perspektywą gracza
  let whiteChance = evalData.winPercentWhite;
  whiteChance = Math.max(5, Math.min(95, whiteChance)); // Clamp, żeby paski nie były 0/100
  const blackChance = 100 - whiteChance;

  whiteBar.style.width = whiteChance + "%";
  blackBar.style.width = blackChance + "%";

  whitePerc.textContent = Math.round(whiteChance) + "%";
  blackPerc.textContent = Math.round(blackChance) + "%";

  const absScore = Math.abs(displayScore);
  let text;
  if (absScore > 10000) {
    text = displayScore > 0 ? "Białe wygrywają" : "Czarne wygrywają";
  } else {
    const scoreNum = displayScore / 100;
    text = (scoreNum >= 0 ? "+" : "") + scoreNum.toFixed(2);
  }
  scoreEl.textContent = text;
  scoreEl.style.color = "#4a9eff";
}

// topMoves: { move, scorePlayer, scoreWhiteView, winPercentWhite, notation }[]
// player: kto ma ruch (dla kogo liczony scorePlayer)
function updateTopMoves(moves, player) {
  const list = document.getElementById("topMovesList");
  if (!list) return;

  list.innerHTML = "";

  if (!moves || moves.length === 0) {
    list.innerHTML = '<div class="move-item">Brak dobrych ruchów</div>';
    return;
  }

  moves.forEach((m, index) => {
    const div = document.createElement("div");
    div.className = "move-item";
    if (index === 0) div.classList.add("best");
    div.style.cursor = "pointer";
    div.title = "Kliknij, aby wykonać ten ruch";

    // Kliknięcie sugestii wykonuje ruch na planszy
    div.addEventListener("click", () => {
      const event = new CustomEvent("forceMove", { detail: { ...m.move } });
      document.dispatchEvent(event);
    });

    const notationSpan = document.createElement("span");
    notationSpan.className = "move-notation";
    notationSpan.innerHTML = `${index + 1}. <strong>${m.notation}</strong>`;

    const evalDiv = document.createElement("div");
    evalDiv.className = "move-eval";

    // scorePlayer – z perspektywy gracza na ruchu
    const scoreSpan = document.createElement("span");
    scoreSpan.className = "move-score";
    const sVal = m.scorePlayer / 100;
    const sText = (sVal >= 0 ? "+" : "") + sVal.toFixed(2);
    scoreSpan.textContent = sText;
    scoreSpan.style.color = sVal >= 0 ? "#4a9eff" : "#ff6b6b";

    // winPercentWhite – szansa białych
    const winSpan = document.createElement("span");
    winSpan.className = "move-winrate";
    const wp = Math.round(m.winPercentWhite);
    winSpan.textContent = `Białe: ${wp}%`;

    // Kolorowanie jakości ruchu z punktu widzenia strony na ruchu
    if (player === "white") {
      if (wp >= 55) winSpan.classList.add("good");
      else if (wp <= 35) winSpan.classList.add("bad");
    } else {
      if (wp <= 45) winSpan.classList.add("good");
      else if (wp >= 65) winSpan.classList.add("bad");
    }

    evalDiv.appendChild(scoreSpan);
    evalDiv.appendChild(winSpan);

    div.appendChild(notationSpan);
    div.appendChild(evalDiv);

    list.appendChild(div);
  });
}
