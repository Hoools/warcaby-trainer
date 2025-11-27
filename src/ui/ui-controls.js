import { initGame, gameState, clearBoard } from "../core/gameState.js";
import { renderBoard, updateCurrentPlayerDisplay, applyBoardRotation } from "./ui-board.js";
import { updateEvaluationDisplay } from "./ui-evaluation.js";

export function initControls() {
  const controlsDiv = document.getElementById("controls");
  if (!controlsDiv) return;

  controlsDiv.innerHTML = `
    <button id="restart-btn">Restart Gry</button>
    <button id="undo-btn">Cofnij Ruch</button>
    <button id="toggle-editor-btn">Tryb Kreatywny</button>
    <button id="clear-board-btn" style="display: none;">Wyczyść planszę</button>
    <button id="choose-white-btn">Gram Białymi</button>
    <button id="choose-black-btn">Gram Czarnymi</button>

    <div id="editor-toolbar" style="display: none; margin-top: 10px; gap: 5px;">
      <button class="piece-selector" data-piece="white">⚪ Biały pion</button>
      <button class="piece-selector" data-piece="white_king">👑 Biała damka</button>
      <button class="piece-selector" data-piece="black">⚫ Czarny pion</button>
      <button class="piece-selector" data-piece="black_king">🔴 Czarna damka</button>
      <button class="piece-selector" data-piece="0">❌ Usuń</button>
    </div>
  `;

  // Restart Gry
  document.getElementById("restart-btn").addEventListener("click", () => {
    initGame();
    renderBoard();
    updateCurrentPlayerDisplay();
    updateEvaluationDisplay(gameState.grid, gameState.currentPlayer);
    document.dispatchEvent(new CustomEvent("gameStateChanged"));
  });

  // Cofnij Ruch
  document.getElementById("undo-btn").addEventListener("click", () => {
    console.log("Cofnij ruch - funkcja w budowie");
  });

  // Tryb Kreatywny
  document.getElementById("toggle-editor-btn").addEventListener("click", () => {
    gameState.isEditorMode = !gameState.isEditorMode;
    const btn = document.getElementById("toggle-editor-btn");
    const toolbar = document.getElementById("editor-toolbar");
    const clearBtn = document.getElementById("clear-board-btn");

    if (gameState.isEditorMode) {
      btn.textContent = "Tryb Normalny";
      btn.style.background = "#e74c3c";
      toolbar.style.display = "flex";
      clearBtn.style.display = "inline-block";
      gameState.aiEnabled = false;
      gameState.gameActive = false;
    } else {
      btn.textContent = "Tryb Kreatywny";
      btn.style.background = "#3498db";
      toolbar.style.display = "none";
      clearBtn.style.display = "none";
      gameState.aiEnabled = true;
      gameState.gameActive = true;
      document.dispatchEvent(new CustomEvent("gameStateChanged"));
    }
    renderBoard();
  });

  // Wyczyść planszę
  document.getElementById("clear-board-btn").addEventListener("click", () => {
    clearBoard();
    renderBoard();
    updateEvaluationDisplay(gameState.grid, gameState.currentPlayer);
  });

  // Gram Białymi
  document.getElementById("choose-white-btn").addEventListener("click", () => {
    startGame("white");
  });

  // Gram Czarnymi
  document.getElementById("choose-black-btn").addEventListener("click", () => {
    startGame("black");
  });

  // Selektor pionków w trybie edytora
  document.querySelectorAll(".piece-selector").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".piece-selector").forEach((b) => b.classList.remove("selected"));
      e.target.classList.add("selected");
      gameState.selectedEditorPiece = e.target.dataset.piece;
    });
  });

  // Skróty klawiszowe do wyboru pionków
  document.addEventListener("keydown", (e) => {
    if (!gameState.isEditorMode) return;
    const keys = { "1": "white", "2": "white_king", "3": "black", "4": "black_king", "0": "0" };
    if (keys[e.key]) {
      gameState.selectedEditorPiece = keys[e.key];
      document.querySelectorAll(".piece-selector").forEach((btn) => {
        btn.classList.toggle("selected", btn.dataset.piece === keys[e.key]);
      });
    }
  });

  // Kopiuj stan planszy
  document.getElementById("copy-state-btn")?.addEventListener("click", () => {
    const output = document.getElementById("board-state-output");
    if (output) {
      navigator.clipboard.writeText(output.textContent);
      alert("Stan planszy skopiowany do schowka!");
    }
  });
}

function startGame(color) {
  initGame();
  gameState.playerColor = color;
  gameState.boardRotation = color === "black" ? 180 : 0;
  gameState.aiEnabled = true;
  gameState.gameActive = true;
  applyBoardRotation();
  renderBoard();
  updateCurrentPlayerDisplay();
  updateEvaluationDisplay(gameState.grid, gameState.currentPlayer);
  document.dispatchEvent(new CustomEvent("gameStateChanged"));
}