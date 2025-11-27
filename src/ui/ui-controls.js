import { initGame, gameState, clearBoard } from '../core/gameState.js';
import { renderBoard, updateCurrentPlayerDisplay, applyBoardRotation } from './ui-board.js';
import { moveHistory } from '../core/moveHistory.js';

export function initControls() {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) return;

    controlsDiv.innerHTML = `
        <button id="btn-restart">Nowa Gra</button>
        <button id="btn-undo">Cofnij</button>
        <button id="btn-editor">Edytor: OFF</button>
        <button id="btn-rotate">Obróć</button>
    `;

    // EDITOR TOOLBAR
    if (!document.getElementById('editor-toolbar')) {
        const toolbar = document.createElement('div');
        toolbar.id = 'editor-toolbar';
        toolbar.style.display = 'none';
        toolbar.style.flexWrap = 'wrap'; 
        toolbar.style.gap = '10px';
        toolbar.style.marginTop = '10px';
        toolbar.style.padding = '10px';
        toolbar.style.background = 'rgba(0,0,0,0.5)';
        toolbar.style.borderRadius = '8px';
        
        const pieces = [
            { type: 'white', label: '⚪ Biały' },
            { type: 'black', label: '⚫ Czarny' },
            { type: 'white_king', label: '♕ B.Król' },
            { type: 'black_king', label: '♛ C.Król' },
            { type: 0, label: '❌ Gumka' }
        ];

        pieces.forEach(p => {
            const btn = document.createElement('button');
            btn.textContent = p.label;
            btn.className = 'btn-small editor-tool';
            btn.dataset.type = p.type;
            btn.style.border = '1px solid #555';
            btn.style.minWidth = '60px';
            btn.addEventListener('click', () => {
                gameState.selectedEditorPiece = p.type;
                document.querySelectorAll('.editor-tool').forEach(b => b.style.borderColor = '#555');
                btn.style.borderColor = '#f1c40f';
            });
            toolbar.appendChild(btn);
        });

        const separator = document.createElement('div');
        separator.style.flexBasis = '100%';
        toolbar.appendChild(separator);

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '🗑️ Wyczyść planszę';
        clearBtn.className = 'btn-small';
        clearBtn.style.background = '#c0392b'; 
        clearBtn.style.width = '100%';
        clearBtn.addEventListener('click', () => {
            if (confirm('Czy na pewno chcesz usunąć wszystkie pionki?')) {
                clearBoard(); 
                renderBoard();
            }
        });
        toolbar.appendChild(clearBtn);
        controlsDiv.appendChild(toolbar);
    }

    document.getElementById('btn-restart').addEventListener('click', () => showColorSelectionModal());

    document.getElementById('btn-undo').addEventListener('click', () => {
        const lastMove = moveHistory.undoMove();
        if (lastMove) {
            gameState.grid = JSON.parse(JSON.stringify(lastMove.previousBoard));
            gameState.currentPlayer = lastMove.previousPlayer;
            updateCurrentPlayerDisplay();
            renderBoard();
        } else {
            alert("Brak ruchów do cofnięcia.");
        }
    });

    const btnEditor = document.getElementById('btn-editor');
    const toolbar = document.getElementById('editor-toolbar');
    btnEditor.addEventListener('click', () => {
        gameState.isEditorMode = !gameState.isEditorMode;
        btnEditor.textContent = gameState.isEditorMode ? 'Edytor: ON' : 'Edytor: OFF';
        btnEditor.style.background = gameState.isEditorMode ? '#e74c3c' : '#3498db';
        if (toolbar) toolbar.style.display = gameState.isEditorMode ? 'flex' : 'none';
        if (gameState.isEditorMode) {
            moveHistory.clear();
            gameState.selectedEditorPiece = 'white';
        }
    });

    document.getElementById('btn-rotate').addEventListener('click', () => {
        gameState.boardRotation = gameState.boardRotation === 0 ? 180 : 0;
        applyBoardRotation();
    });

    const toggleAiBtn = document.getElementById('toggle-ai');
    if (toggleAiBtn) {
        toggleAiBtn.addEventListener('click', () => {
            gameState.aiEnabled = !gameState.aiEnabled;
            toggleAiBtn.textContent = gameState.aiEnabled ? 'AI: ON' : 'AI: OFF';
            toggleAiBtn.style.background = gameState.aiEnabled ? '#4a9eff' : '#555';
        });
    }

    document.addEventListener('keydown', (e) => {
        if (!gameState.isEditorMode) return;
        let type = null;
        if (e.key === '1') type = 'white';
        if (e.key === '2') type = 'black';
        if (e.key === '3') type = 'white_king';
        if (e.key === '4') type = 'black_king';
        if (e.key === '0' || e.key === 'Delete') type = 0;
        if (type !== null) {
            gameState.selectedEditorPiece = type;
            document.querySelectorAll('.editor-tool').forEach(b => {
                b.style.borderColor = (b.dataset.type == type) ? '#f1c40f' : '#555';
            });
        }
    });

    if (!gameState.gameActive) showColorSelectionModal();
}

function showColorSelectionModal() {
    let modal = document.getElementById('color-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'color-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        modal.innerHTML = `
            <div style="background: #2c3e50; padding: 30px; border-radius: 10px; text-align: center; border: 2px solid #f1c40f;">
                <h2 style="color: #f1c40f; margin-top: 0;">Wybierz Kolor</h2>
                <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px;">
                    <button id="btn-play-white" style="padding: 15px 30px; font-size: 18px; background: #ecf0f1; color: #2c3e50; border: none; cursor: pointer; border-radius: 5px;">Białe</button>
                    <button id="btn-play-black" style="padding: 15px 30px; font-size: 18px; background: #2c2c2c; color: #ecf0f1; border: none; cursor: pointer; border-radius: 5px;">Czarne</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    const playWhite = document.getElementById('btn-play-white');
    const playBlack = document.getElementById('btn-play-black');
    const newWhite = playWhite.cloneNode(true);
    const newBlack = playBlack.cloneNode(true);
    playWhite.parentNode.replaceChild(newWhite, playWhite);
    playBlack.parentNode.replaceChild(newBlack, playBlack);

    newWhite.addEventListener('click', () => startGame('white'));
    newBlack.addEventListener('click', () => startGame('black'));
}

function startGame(color) {
    const modal = document.getElementById('color-modal');
    if (modal) modal.style.display = 'none';
    initGame();
    gameState.playerColor = color;
    gameState.boardRotation = (color === 'black') ? 180 : 0;
    updateCurrentPlayerDisplay();
    applyBoardRotation();
    renderBoard();
    document.dispatchEvent(new CustomEvent('gameStateChanged'));
}
