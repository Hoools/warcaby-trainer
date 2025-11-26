// Rysowanie planszy i obsługa kliknięć

function initUI() {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const square = document.createElement('div');
      square.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      square.dataset.row = r;
      square.dataset.col = c;
      boardDiv.appendChild(square);
    }
  }

  renderBoard();
}

function renderBoard() {
  const squares = document.querySelectorAll('#board .square');
  squares.forEach(sq => {
    sq.innerHTML = '';
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    const piece = board.grid[r][c];
    if (piece === 'w') {
      const pawn = document.createElement('div');
      pawn.className = 'pawn white';
      sq.appendChild(pawn);
    } else if (piece === 'b') {
      const pawn = document.createElement('div');
      pawn.className = 'pawn black';
      sq.appendChild(pawn);
    }
  });
}
