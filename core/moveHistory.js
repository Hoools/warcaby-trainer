// Moduł historii ruchów do zapisywania i cofania ruchów

class MoveHistory {
  constructor() {
    this.moves = [];
  }

  addMove(move) {
    this.moves.push(move);
  }

  undoMove() {
    if (this.moves.length === 0) return null;
    return this.moves.pop();
  }

  clear() {
    this.moves = [];
  }
}

const moveHistory = new MoveHistory();

export { moveHistory };
