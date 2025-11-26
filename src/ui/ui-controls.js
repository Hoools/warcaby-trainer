// src/ui/ui-controls.js
import { gameState, initGame, clearBoard } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { renderBoard, updateCurrentPlayerDisplay, initUI } from './ui-board.js';
import { runTests } from '../tests/testRunner.js';
import { gameTests } from '../tests/gameTests.js';

export function initControls() {
  const controlsDiv = document.getElementById('controls');
  if (!controlsDiv) return;
  controlsDiv.innerHTML = '';

  // --- Kontener główny dla przycisków ---
  const gameControls = document.createElement('div');
  gameControls.id = 'game-controls';
  gameControls.style.display = 'flex';
  gameControls.style.gap = '10px';
  gameControls.style.flexWrap = 'wrap';
  gameControls.style.justifyContent = 'center';
  
  // 1. Cofnij
  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Cofnij';
  undoBtn.onclick = () => {
    const lastMove = moveHistory.undoMove();
    if (lastMove) {
      gameState.grid = JSON.parse(JSON.stringify(lastMove.previousBoard));
      gameState.currentPlayer = lastMove.previousPlayer;
      updateCurrentPlayerDisplay();
      renderBoard();
    }
  };

  // 2. Restart
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Restart';
  resetBtn.style.backgroundColor = '#e67e22';
  resetBtn.onclick = () => {
    moveHistory.clear();
    initGame();
    initUI();
  };

  // 3. Tryb Edycji
  const editorToggleBtn = document.createElement('button');
  editorToggleBtn.textContent = '🔧 Edytor';
  editorToggleBtn.style.backgroundColor = '#f39c12';
  editorToggleBtn.onclick = () => toggleEditorMode(true);

  // 4. Testy (dodajemy przycisk tutaj, żeby był dostępny)
  const testBtn = document.createElement('button');
  testBtn.textContent = '🧪 Testy';
  testBtn.style.backgroundColor = '#9b59b6';
  testBtn.onclick = () => {
      console.clear();
      runTests(gameTests);
  };

  gameControls.append(undoBtn, resetBtn, editorToggleBtn, testBtn);
  controlsDiv.appendChild(gameControls);


  // --- Panel Edytora (domyślnie ukryty) ---
  const editorControls = document.createElement('div');
  editorControls.id = 'editor-controls';
  editorControls.style.display = 'none';
  editorControls.style.flexDirection = 'column';
  editorControls.style.gap = '10px';
  editorControls.style.marginTop = '10px';
  editorControls.style.padding = '10px';
  editorControls.style.background = 'rgba(0,0,0,0.2)';
  editorControls.style.borderRadius = '8px';

  // Narzędzia
  const toolsContainer = document.createElement('div');
  toolsContainer.style.display = 'flex';
  toolsContainer.style.gap = '5px';
  toolsContainer.style.flexWrap = 'wrap';
  toolsContainer.style.justifyContent = 'center';

  const tools = [
      { name: 'Biały', value: 'white', color: '#fff', textColor: '#000' },
      { name: 'Czarny', value: 'black', color: '#333', textColor: '#fff' },
      { name: 'Biała D.', value: 'white_king', color: '#eee', textColor: '#000' },
      { name: 'Czarna D.', value: 'black_king', color: '#222', textColor: '#fff' },
      { name: 'Gumka', value: 0, color: '#e74c3c', textColor: '#fff' }
  ];

  tools.forEach(tool => {
      const btn = document.createElement('button');
      btn.textContent = tool.name;
      btn.style.backgroundColor = tool.color;
      btn.style.color = tool.textColor;
      btn.style.padding = '5px 10px';
      btn.style.fontSize = '0.9rem';
      btn.onclick = () => {
          gameState.selectedEditorPiece = tool.value;
          toolsContainer.querySelectorAll('button').forEach(b => b.style.border = 'none');
          btn.style.border = '2px solid #3498db'; 
      };
      toolsContainer.appendChild(btn);
  });
  editorControls.appendChild(toolsContainer);

  // Opcje Edytora
  const settingsContainer = document.createElement('div');
  settingsContainer.style.display = 'flex';
  settingsContainer.style.gap = '10px';
  settingsContainer.style.justifyContent = 'center';

  const playerToggleBtn = document.createElement('button');
  playerToggleBtn.id = 'editor-player-toggle';
  playerToggleBtn.textContent = `Ruch: ${gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne'}`;
  playerToggleBtn.style.backgroundColor = '#8e44ad';
  playerToggleBtn.onclick = () => {
      gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      playerToggleBtn.textContent = `Ruch: ${gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne'}`;
      updateCurrentPlayerDisplay();
      renderBoard(); // Odśwież panel boczny
  };

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🗑️ Wyczyść';
  clearBtn.style.backgroundColor = '#c0392b';
  clearBtn.onclick = () => {
      clearBoard();
      renderBoard();
  };

  settingsContainer.append(playerToggleBtn, clearBtn);
  editorControls.appendChild(settingsContainer);

  const playBtn = document.createElement('button');
  playBtn.textContent = '▶️ Graj (Wyjdź)';
  playBtn.style.backgroundColor = '#2ecc71';
  playBtn.onclick = () => toggleEditorMode(false);
  editorControls.appendChild(playBtn);

  controlsDiv.appendChild(editorControls);
}

function toggleEditorMode(enable) {
    gameState.isEditorMode = enable;
    const gameCtrls = document.getElementById('game-controls');
    const editorCtrls = document.getElementById('editor-controls');
    const statusDiv = document.getElementById('status');

    if (enable) {
        gameCtrls.style.display = 'none';
        editorCtrls.style.display = 'flex';
        statusDiv.textContent = "TRYB EDYCJI";
        statusDiv.style.color = '#f39c12';
        const playerBtn = document.getElementById('editor-player-toggle');
        if(playerBtn) playerBtn.textContent = `Ruch: ${gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne'}`;
    } else {
        gameCtrls.style.display = 'flex';
        editorCtrls.style.display = 'none';
        updateCurrentPlayerDisplay();
        statusDiv.style.color = 'white';
        renderBoard(); // Odśwież, by przeliczyć ruchy
    }
}
