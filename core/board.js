// Reprezentacja planszy i stanu gry
const BOARD_SIZE = 10;

class Board {
  constructor() {
    this.grid = this.createEmptyBoard();
    this.currentPlayer = 'white';
    this.moveHistory = [];
  }

  createEmptyBoard() {
    // 0 = puste, 'w' = biały pion, 'b' = czarny pion
    const board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      board[r] = new Array(BOARD_SIZE).fill(0);
    }
    // Można ustawić figury startowe tutaj lub w innej metodzie
    return board;
  }

  // Dodaj inne metody do zarządzania planszą
}

const board = new Board();
