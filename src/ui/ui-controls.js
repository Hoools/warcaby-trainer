import { initGame, gameState, clearBoard } from '../core/gameState.js';
import { renderBoard, updateCurrentPlayerDisplay, applyBoardRotation } from './ui-board.js';
import { moveHistory } from '../core/moveHistory.js';
import { initModel, saveModelFromArtifacts } from '../core/neuralNet.js';

export function initControls() {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) return;

    controlsDiv.innerHTML = `
        <button id="btn-restart">Nowa Gra</button>
        <button id="btn-undo">Cofnij</button>
        <button id="btn-editor">Edytor: OFF</button>
        <button id="btn-rotate">Obróć</button>
        <div style="margin-top:10px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; width: 100%; box-sizing: border-box;">
            <button id="btn-train-pro" style="background: linear-gradient(45deg, #8e44ad, #c0392b); width: 100%; font-weight: bold; border: none; color: white; cursor: pointer;">🚀 Trenuj PRO (W tle)</button>
            <div style="width: 100%; background: #333; height: 5px; margin-top: 5px; border-radius: 2px; overflow: hidden;">
                <div id="train-progress" style="height: 100%; background: #f1c40f; width: 0%; transition: width 0.2s;"></div>
            </div>
            <div id="train-status" style="font-size: 10px; color: #aaa; text-align: center; margin-top: 2px;">Gotowy</div>
        </div>
    `;

    // Inicjalizacja modelu (Main thread)
    initModel();

    // --- OBSŁUGA TRENINGU (WEB WORKER) ---
    const trainBtn = document.getElementById('btn-train-pro');
    const progressBar = document.getElementById('train-progress');
    const statusText = document.getElementById('train-status');

    trainBtn.addEventListener('click', () => {
        if (typeof Worker === "undefined") {
            alert("Twoja przeglądarka nie obsługuje Web Workers.");
            return;
        }

        trainBtn.disabled = true;
        trainBtn.textContent = "Trenowanie...";
        trainBtn.style.opacity = "0.7";
        progressBar.style.width = '0%';
        statusText.textContent = "Inicjalizacja workera...";

        // Uruchomienie workera (jako zwykły skrypt, bez type:module, bo importScripts)
        const worker = new Worker(new URL('../workers/trainer.js', import.meta.url));

        worker.postMessage({ command: 'START_TRAINING' });

        worker.onmessage = async (e) => {
            const { type, msg, current, total, artifacts } = e.data;
            
            if (type === 'STATUS') {
                statusText.textContent = msg;
            }
            else if (type === 'PROGRESS') {
                const perc = (current / total) * 100;
                progressBar.style.width = `${perc}%`;
                statusText.textContent = `Partia ${current} / ${total}`;
            }
            // NOWE: Odbiór modelu z workera
            else if (type === 'SAVE_MODEL_DATA') {
                statusText.textContent = "Zapisywanie modelu...";
                const success = await saveModelFromArtifacts(artifacts);
                if (success) {
                    console.log("Model odebrany i zapisany w Main Thread.");
                    // DODAJ TO: Aktualizacja statusu w panelu bocznym
                    const nnStatus = document.getElementById('nn-status');
                    if(nnStatus) {
                        nnStatus.textContent = "Aktywna (Zaktualizowana)";
                        nnStatus.style.color = "#2ecc71";
                    }
                } else {
                    alert("Błąd zapisu modelu!");
                }
            }
            else if (type === 'FINISHED') {
                statusText.textContent = "Zakończono!";
                progressBar.style.background = '#2ecc71';
                worker.terminate();
                
                trainBtn.textContent = "Trening Zakończony";
                setTimeout(() => {
                    alert("Trening zakończony pomyślnie! Nowa wiedza została załadowana.");
                    location.reload(); // Odświeżamy, żeby mieć pewność czystego stanu
                }, 500);
            }
        };

        worker.onerror = (err) => {
            console.error("Błąd workera:", err);
            statusText.textContent = "Błąd krytyczny workera";
            trainBtn.disabled = false;
            trainBtn.textContent = "Błąd (Spróbuj ponownie)";
        };
    });

    // --- (Reszta funkcji controls: Editor, Restart, etc.) ---
    
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
        /* ...style... */
        modal.style.position = 'fixed'; modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%'; modal.style.backgroundColor = 'rgba(0,0,0,0.85)'; modal.style.display = 'flex'; modal.style.justifyContent = 'center'; modal.style.alignItems = 'center'; modal.style.zIndex = '1000';
        
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
