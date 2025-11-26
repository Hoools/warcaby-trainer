// src/core/gameState.js
export const gameState = {
  grid: [],
  currentPlayer: 'white',
  isEditorMode: false,       // NOWE: Czy jesteśmy w trybie edycji?
  selectedEditorPiece: null  // NOWE: Co stawiamy? (np. 'white', 'black_king', null=gumka)
};

export function initGame() {
  gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0));
  gameState.currentPlayer = 'white';
  gameState.isEditorMode = false;
  gameState.selectedEditorPiece = 'white'; // Domyślny pionek w edytorze

  // Ustawienie początkowe
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 !== 0) gameState.grid[r][c] = 'black';
    }
  }
  for (let r = 6; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 !== 0) gameState.grid[r][c] = 'white';
    }
  }
}

// NOWE: Funkcja czyszcząca planszę dla edytora
export function clearBoard() {
    gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0));
}
