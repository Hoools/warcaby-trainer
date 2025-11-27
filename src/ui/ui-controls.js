import { initGame, gameState, clearBoard } from '../core/gameState.js';
import { renderBoard, updateCurrentPlayerDisplay, applyBoardRotation } from './ui-board.js';
import { moveHistory } from '../core/moveHistory.js';
import { getBestMove } from '../core/ai.js';
import { makeMove } from './ui-board.js';

export function initControls() {
    const controlsDiv = document.getElementById('controls');
    if (!controlsDiv) return;

    // Przywrócony pełny HTML panelu sterowania
    controlsDiv.innerHTML = `
        <button id="btn-restart" title="Rozpocznij nową grę">Nowa Gra</button>
        <button id="btn-undo" title="Cofnij ostatni ruch">Cofnij</button>
        <button id="btn-editor" title="Tryb edycji planszy">Edytor: OFF</button>
        <button id="btn-rotate" title="Obróć planszę">Obróć</button>
    `;

    // --- 1. NOWA GRA / RESTART ---
    document.getElementById('btn-restart').addEventListener('click', () => {
        showColorSelectionModal(); // Pytamy o kolor przy nowej grze
    });

    // --- 2. COFNIJ RUCH (UNDO) ---
    document.getElementById('btn-undo').addEventListener('click', () => {
        // Jeśli gramy z AI, musimy cofnąć 2 ruchy (gracza i AI), chyba że to tryb manualny
        // Lub po prostu cofamy jeden ruch na historii
        const lastMove = moveHistory.undoMove();
        if (lastMove) {
            // Przywracamy stan sprzed ruchu
            gameState.grid = JSON.parse(JSON.stringify(lastMove.previousBoard));
            gameState.currentPlayer = lastMove.previousPlayer;
            
            // Jeśli gramy z AI i AI właśnie wykonało ruch, to cofnięcie jednego ruchu
            // oddaje turę AI. Zazwyczaj chcemy cofnąć DWA ruchy (AI + Gracz), żeby wrócić do swojej tury.
            // Ale w prostym trybie undo wystarczy cofnąć raz i pozwolić graczowi zdecydować.
            
            // Opcjonalnie: Cofnięcie drugiego ruchu, jeśli poprzedni był AI
            /* 
            if (gameState.aiEnabled && gameState.currentPlayer !== gameState.playerColor) {
                const move2 = moveHistory.undoMove();
                if (move2) {
                    gameState.grid = JSON.parse(JSON.stringify(move2.previousBoard));
                    gameState.currentPlayer = move2.previousPlayer;
                }
            }
            */

            updateCurrentPlayerDisplay();
            renderBoard();
        } else {
            alert("Brak ruchów do cofnięcia.");
        }
    });

    // --- 3. EDYTOR PLANSZY ---
    const btnEditor = document.getElementById('btn-editor');
    btnEditor.addEventListener('click', () => {
        gameState.isEditorMode = !gameState.isEditorMode;
        btnEditor.textContent = gameState.isEditorMode ? 'Edytor: ON' : 'Edytor: OFF';
        btnEditor.style.background = gameState.isEditorMode ? '#e74c3c' : '#3498db';

        // Jeśli włączamy edytor, czyścimy historię ruchów
        if (gameState.isEditorMode) {
            moveHistory.clear();
        }
    });
    
    // Dodatkowe sterowanie edytorem (klawisze 1, 2, 3, 0)
    document.addEventListener('keydown', (e) => {
        if (!gameState.isEditorMode) return;
        if (e.key === '1') gameState.selectedEditorPiece = 'white';
        if (e.key === '2') gameState.selectedEditorPiece = 'black';
        if (e.key === '3') gameState.selectedEditorPiece = 'white_king';
        if (e.key === '4') gameState.selectedEditorPiece = 'black_king';
        if (e.key === '0' || e.key === 'Delete') gameState.selectedEditorPiece = 0;
        // Można dodać wizualną informację o wybranym pionku
    });

    // --- 4. OBRÓT PLANSZY ---
    document.getElementById('btn-rotate').addEventListener('click', () => {
        gameState.boardRotation = gameState.boardRotation === 0 ? 180 : 0;
        applyBoardRotation();
    });

    // --- 5. PRZYCISK AI (z poprzednich zmian) ---
    const toggleAiBtn = document.getElementById('toggle-ai');
    if (toggleAiBtn) {
        toggleAiBtn.addEventListener('click', () => {
            gameState.aiEnabled = !gameState.aiEnabled;
            toggleAiBtn.textContent = gameState.aiEnabled ? 'AI: ON' : 'AI: OFF';
            toggleAiBtn.style.background = gameState.aiEnabled ? '#4a9eff' : '#555';
        });
    }

    // Pokaż wybór koloru na starcie (jeśli to pierwsze uruchomienie)
    // Sprawdzamy czy plansza jest pusta (nowa gra)
    if (!gameState.gameActive) {
         showColorSelectionModal();
    }
}

// --- MODAL WYBORU KOLORU ---
function showColorSelectionModal() {
    // Tworzymy prosty modal w HTML dynamicznie (lub można go mieć w index.html ukrytego)
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

    // Obsługa przycisków
    const playWhite = document.getElementById('btn-play-white');
    const playBlack = document.getElementById('btn-play-black');

    // Usuwamy stare event listenery (klonowanie to hack na szybkie czyszczenie eventów)
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
    
    // Jeśli gracz wybrał czarne, obracamy planszę
    gameState.boardRotation = (color === 'black') ? 180 : 0;
    
    updateCurrentPlayerDisplay();
    applyBoardRotation();
    renderBoard();

    // Jeśli gracz wybrał czarne, komputer (białe) musi wykonać pierwszy ruch
    if (color === 'black' && gameState.aiEnabled) {
        setTimeout(() => {
             // Import dynamiczny lub wywołanie funkcji z ui-board.js przez event/global
             // Najprościej: wywołajmy kliknięcie na planszy lub logikę AI
             // Ale ponieważ initControls nie ma dostępu do performAiMove bezpośrednio (cykl zależnosci),
             // musimy to obsłużyć w ui-board lub main.
             
             // Hack: Wymuszenie ruchu w ui-board poprzez reload lub flagę
             // Lepiej: main.js to obsłuży, albo wywołamy event
        }, 500);
    }
}
