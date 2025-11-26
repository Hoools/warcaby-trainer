// src/ui/ui-controls.js
import { gameState, initGame, clearBoard } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { renderBoard, updateCurrentPlayerDisplay, initUI } from './ui-board.js';

export function initControls() {
  const controlsDiv = document.getElementById('controls');
  if (!controlsDiv) return;
  controlsDiv.innerHTML = '';

  // --- Sekcja Gry ---
  const gameControls = document.createElement('div');
  gameControls.id = 'game-controls';
  
  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Cofnij ruch';
  undoBtn.onclick = () => {
    const lastMove = moveHistory.undoMove();
    if (lastMove) {
      gameState.grid = JSON.parse(JSON.stringify(lastMove.previousBoard));
      gameState.currentPlayer = lastMove.previousPlayer;
      updateCurrentPlayerDisplay();
      renderBoard();
    }
  };

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Restartuj grę';
  resetBtn.onclick = () => {
    moveHistory.clear();
    initGame();
    initUI();
  };

  const editorToggleBtn = document.createElement('button');
  editorToggleBtn.textContent = '🔧 Tryb Edycji';
  editorToggleBtn.style.backgroundColor = '#f39c12';
  editorToggleBtn.onclick = () => toggleEditorMode(true);

  gameControls.append(undoBtn, resetBtn, editorToggleBtn);
  controlsDiv.appendChild(gameControls);


  // --- Sekcja Edytora ---
  const editorControls = document.createElement('div');
  editorControls.id = 'editor-controls';
  editorControls.style.display = 'none';
  editorControls.style.flexDirection = 'column'; // Zmiana na kolumnę dla lepszego układu
  editorControls.style.gap = '10px';
  editorControls.style.marginTop = '10px';
  editorControls.style.padding = '10px';
  editorControls.style.background = 'rgba(0,0,0,0.2)';
  editorControls.style.borderRadius = '8px';

  // 1. Narzędzia (Pionki)
  const toolsContainer = document.createElement('div');
  toolsContainer.style.display = 'flex';
  toolsContainer.style.gap = '5px';
  toolsContainer.style.flexWrap = 'wrap';

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
      btn.style.border = '2px solid transparent';
      btn.onclick = () => {
          gameState.selectedEditorPiece = tool.value;
          toolsContainer.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = '#3498db'; 
      };
      toolsContainer.appendChild(btn);
  });
  editorControls.appendChild(toolsContainer);

  // 2. Ustawienia stanu (NOWE: Wybór gracza na ruchu)
  const settingsContainer = document.createElement('div');
  settingsContainer.style.display = 'flex';
  settingsContainer.style.gap = '10px';
  settingsContainer.style.alignItems = 'center';

  // Przełącznik gracza
  const playerToggleBtn = document.createElement('button');
  playerToggleBtn.id = 'editor-player-toggle';
  playerToggleBtn.textContent = `Na ruchu: ${gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne'}`;
  playerToggleBtn.style.backgroundColor = '#8e44ad';
  playerToggleBtn.onclick = () => {
      // Zmień gracza w gameState
      gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
      // Zaktualizuj napis na przycisku
      playerToggleBtn.textContent = `Na ruchu: ${gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne'}`;
      // Zaktualizuj też główny wyświetlacz
      updateCurrentPlayerDisplay();
  };
  settingsContainer.appendChild(playerToggleBtn);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🗑️ Wyczyść';
  clearBtn.onclick = () => {
      clearBoard();
      renderBoard();
  };
  settingsContainer.appendChild(clearBtn);

  editorControls.appendChild(settingsContainer);

  // 3. Wyjście
  const playBtn = document.createElement('button');
  playBtn.textContent = '▶️ Graj (Zatwierdź)';
  playBtn.style.backgroundColor = '#2ecc71';
  playBtn.style.marginTop = '5px';
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
        
        // Odśwież przycisk gracza przy wejściu, by zgadzał się ze stanem
        const playerBtn = document.getElementById('editor-player-toggle');
        if(playerBtn) playerBtn.textContent = `Na ruchu: ${gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne'}`;

    } else {
        gameCtrls.style.display = 'flex';
        editorCtrls.style.display = 'none';
        updateCurrentPlayerDisplay();
        statusDiv.style.color = 'white';
    }
}
