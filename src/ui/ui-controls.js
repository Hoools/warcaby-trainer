// src/ui/ui-controls.js
import { gameState, initGame, clearBoard } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { renderBoard, updateCurrentPlayerDisplay, initUI, applyBoardRotation } from './ui-board.js';
import { runTests } from '../tests/testRunner.js';
import { gameTests } from '../tests/gameTests.js';

export function initControls() {
  const controlsDiv = document.getElementById('controls');
  if (!controlsDiv) return;
  controlsDiv.innerHTML = '';

  // --- MODAL WYBORU KOLORU (Nowość) ---
  createColorSelectionModal();

  // --- Kontener główny dla przycisków (Ukryty do czasu wyboru) ---
  const gameControls = document.createElement('div');
  gameControls.id = 'game-controls';
  gameControls.style.display = 'none'; // Domyślnie ukryte
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

  // 2. Restart (Powrót do wyboru koloru)
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Nowa Gra';
  resetBtn.style.backgroundColor = '#e67e22';
  resetBtn.onclick = () => {
    moveHistory.clear();
    initGame(); // Resetuje stan
    // Pokaż modal ponownie
    document.getElementById('color-modal').style.display = 'flex';
    document.getElementById('game-controls').style.display = 'none';
    document.getElementById('board').innerHTML = ''; // Wyczyść planszę wizualnie
    gameState.gameActive = false;
  };

  // Usuwamy przycisk "Obróć" (bo jest automatyczny), chyba że chcesz go zostawić jako debug.
  // Usunąłem go dla czystości.

  // 3. Tryb Edycji
  const editorToggleBtn = document.createElement('button');
  editorToggleBtn.textContent = '🔧 Edytor';
  editorToggleBtn.style.backgroundColor = '#f39c12';
  editorToggleBtn.onclick = () => toggleEditorMode(true);

  // 4. Testy
  const testBtn = document.createElement('button');
  testBtn.textContent = '🧪 Testy';
  testBtn.style.backgroundColor = '#9b59b6';
  testBtn.onclick = () => {
      console.clear();
      runTests(gameTests);
  };

  gameControls.append(undoBtn, resetBtn, editorToggleBtn, testBtn);
  controlsDiv.appendChild(gameControls);

  // ... (Panel Edytora - bez zmian) ...
  // Skopiuj kod panelu edytora z poprzedniej wersji
  const editorControls = createEditorPanel(); 
  controlsDiv.appendChild(editorControls);
}

// Funkcja tworząca modal
function createColorSelectionModal() {
    // Sprawdź czy już istnieje (żeby nie dublować przy przeładowaniu)
    if(document.getElementById('color-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'color-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    modal.style.color = 'white';

    const title = document.createElement('h2');
    title.textContent = 'Wybierz kolor pionków';
    title.style.marginBottom = '30px';

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '20px';

    // Przycisk Białe
    const whiteBtn = document.createElement('button');
    whiteBtn.textContent = '⚪ Białe (Zaczynasz)';
    whiteBtn.style.padding = '20px 40px';
    whiteBtn.style.fontSize = '1.2rem';
    whiteBtn.style.cursor = 'pointer';
    whiteBtn.onclick = () => startGame('white');

    // Przycisk Czarne
    const blackBtn = document.createElement('button');
    blackBtn.textContent = '⚫ Czarne (Drugi)';
    blackBtn.style.padding = '20px 40px';
    blackBtn.style.fontSize = '1.2rem';
    blackBtn.style.backgroundColor = '#333';
    blackBtn.style.color = 'white';
    blackBtn.style.border = '1px solid #555';
    blackBtn.style.cursor = 'pointer';
    blackBtn.onclick = () => startGame('black');

    btnContainer.append(whiteBtn, blackBtn);
    modal.append(title, btnContainer);
    document.body.appendChild(modal);
}

function startGame(color) {
    gameState.playerColor = color;
    gameState.boardRotation = color === 'black' ? 180 : 0;
    gameState.gameActive = true;
    gameState.currentPlayer = 'white'; // Zawsze zaczynają białe (nawet jak grasz czarnymi)

    // Ukryj modal
    document.getElementById('color-modal').style.display = 'none';
    // Pokaż sterowanie
    document.getElementById('game-controls').style.display = 'flex';

    // Inicjalizuj planszę z nowym obrotem
    initUI(); 
}

// Helper do panelu edytora (żeby kod był czystszy w initControls)
function createEditorPanel() {
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

    // Opcje
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
        renderBoard(); 
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

    return editorControls;
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
        renderBoard();
    }
}
