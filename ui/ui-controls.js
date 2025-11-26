// Wyświetlanie oceny ruchu w panelu statusu

import { evaluateBoard } from '../core/eval.js';

function updateMoveQualityMessage(board, player) {
  const statusDiv = document.getElementById('status');
  const score = evaluateBoard(board.grid, player);

  let message = 'Ocena ruchu: ';
  if (score > 1) message += 'Bardzo dobry ruch';
  else if (score > 0) message += 'Dobry ruch';
  else if (score === 0) message += 'Neutralny ruch';
  else message += 'Zły ruch';

  statusDiv.textContent = `Na ruchu: ${player} | ${message}`;
}

export { updateMoveQualityMessage };
