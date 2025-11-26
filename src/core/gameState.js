export const gameState = {
  grid: [],
  currentPlayer: 'white'
};

export function initGame() {
  // 10x10 grid filled with 0
  gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0));
  gameState.currentPlayer = 'white';

  // Place pieces
  // Rows 0-3: Black
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 !== 0) gameState.grid[r][c] = 'black'; 
    }
  }
  // Rows 6-9: White
  for (let r = 6; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 !== 0) gameState.grid[r][c] = 'white'; 
    }
  }
}
