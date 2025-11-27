export const gameState = {
  grid: [],
  currentPlayer: 'white',
  playerColor: 'white', // Kolor gracza (dla AI)
  isEditorMode: false,
  selectedEditorPiece: 'white',
  boardRotation: 0,
  aiEnabled: true,      // NOWE: Czy AI ma grać
  gameActive: true      // NOWE: Czy gra trwa
};

export function initGame() {
  gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0));
  gameState.currentPlayer = 'white';
  gameState.playerColor = 'white';
  gameState.isEditorMode = false;
  gameState.selectedEditorPiece = 'white';
  gameState.boardRotation = 0;
  gameState.aiEnabled = true; 
  gameState.gameActive = true;

  // Ustawienie początkowe (4 rzędy czarnych, 4 rzędy białych)
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

export function clearBoard() {
    gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0));
}
