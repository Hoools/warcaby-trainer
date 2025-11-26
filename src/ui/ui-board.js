// src/ui/ui-board.js
import { gameState } from '../core/gameState.js';
import { moveHistory } from '../core/moveHistory.js';
import { isValidMove, getPossibleCapturesForPiece, hasAnyCapture } from '../core/rules.js';

let selectedSquare = null;
let validMovesForSelected = [];
let pieceLockedForCapture = false; // Czy gracz jest zmuszony kontynuować bicie tym samym pionkiem?
let pendingCaptures = []; // Lista pionków zbitych w trakcie sekwencji (tzw. "duchy")

export function initUI() {
  const boardDiv = document.getElementById('board');
  if (!boardDiv) return;
  boardDiv.innerHTML = '';

  let squareNumber = 1; // Licznik dla notacji warcabowej

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const isDark = (r + c) % 2 !== 0;
      const square = document.createElement('div');
      square.className = 'square ' + (isDark ? 'dark' : 'light');
      square.dataset.row = r;
      square.dataset.col = c;
      square.addEventListener('click', () => onSquareClick(r, c));

      // Dodajemy numer tylko na czarnych polach
      if (isDark) {
          const numberSpan = document.createElement('span');
          numberSpan.className = 'square-number';
          numberSpan.textContent = squareNumber++;
          square.appendChild(numberSpan);
      }

      boardDiv.appendChild(square);
    }
  }
  updateCurrentPlayerDisplay();
  renderBoard();
}

export function updateCurrentPlayerDisplay() {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
      const plName = gameState.currentPlayer === 'white' ? 'Białe' : 'Czarne';
      statusDiv.textContent = `Na ruchu: ${plName}`;
  }
}

export function renderBoard() {
  // Musimy zresetować licznik, żeby wiedzieć jaki numer wstawić (jeśli czyścimy innerHTML)
  let squareNumber = 1;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const square = document.querySelector(`#board .square[data-row='${r}'][data-col='${c}']`);
      if (!square) continue;
      
      const isDark = (r + c) % 2 !== 0;
      let currentNum = isDark ? squareNumber++ : null;

      // Czyścimy stare zawartości (pionki)
      square.innerHTML = '';
      square.classList.remove('highlight');
      
      // Odtwórz numer pola
      if (currentNum !== null) {
          const numberSpan = document.createElement('span');
          numberSpan.className = 'square-number';
          numberSpan.textContent = currentNum;
          square.appendChild(numberSpan);
      }
      
      // Renderuj pionek
      const pieceCode = gameState.grid[r][c]; 
      if (pieceCode !== 0) {
        const pieceDiv = document.createElement('div');
        pieceDiv.classList.add('piece');
        
        if (typeof pieceCode === 'string') {
             if (pieceCode.includes('white')) pieceDiv.classList.add('white');
             if (pieceCode.includes('black')) pieceDiv.classList.add('black');
             if (pieceCode.includes('king')) pieceDiv.classList.add('king');
        }
        
        if (pendingCaptures.some(cap => cap.r === r && cap.c === c)) {
            pieceDiv.style.opacity = '0.4'; 
        }

        square.appendChild(pieceDiv);
      }
    }
  }
  highlightValidMoves(validMovesForSelected);
}

function onSquareClick(row, col) {
  // --- LOGIKA EDYTORA ---
  if (gameState.isEditorMode) {
      // Tylko na czarnych polach (tam gdzie gramy)
      if ((row + col) % 2 !== 0) {
          gameState.grid[row][col] = gameState.selectedEditorPiece;
          renderBoard();
      }
      return; // Kończymy, nie wykonujemy logiki gry
  }

  // --- LOGIKA GRY (stara) ---
  if (pieceLockedForCapture) {
      if (selectedSquare.row === row && selectedSquare.col === col) return;
      const move = validMovesForSelected.find(m => m.toRow === row && m.toCol === col);
      if (move) {
          makeMove(selectedSquare.row, selectedSquare.col, row, col, true);
      } else {
          console.log("Musisz dokończyć bicie tym pionkiem!");
      }
      return;
  }

  const piece = gameState.grid[row][col];
  // Nie można wybrać pionka, który już został "przeskoczony" w tej turze
  if (pendingCaptures.some(cap => cap.r === row && cap.c === col)) return;

  if (piece && typeof piece === 'string' && piece.startsWith(gameState.currentPlayer)) {
    selectedSquare = { row, col };
    validMovesForSelected = getValidMovesForPiece(row, col);
    renderBoard(); 
  } 
  else if (selectedSquare) {
    const move = validMovesForSelected.find((m) => m.toRow === row && m.toCol === col);
    if (move) {
      makeMove(selectedSquare.row, selectedSquare.col, row, col, move.isCapture);
    } else {
      selectedSquare = null;
      validMovesForSelected = [];
      renderBoard();
    }
  }
}

export function getValidMovesForPiece(row, col) {
  const player = gameState.currentPlayer;
  const mandatoryCapture = hasAnyCapture(gameState.grid, player);
  
  // Pobieramy możliwe bicia, uwzględniając pionki już "przeskoczone" (pendingCaptures)
  const captureMoves = getPossibleCapturesForPiece(gameState.grid, row, col, pendingCaptures);
  
  if (mandatoryCapture) {
    // Jeśli jest przymus bicia, zwracamy tylko bicia
    return captureMoves.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
  } else {
    // Jeśli nie ma przymusu, sprawdzamy też ruchy zwykłe
    // (tylko jeśli captureMoves jest puste - bo jak pionek może bić, to MUSI bić, nawet jeśli inny też może)
    if (captureMoves.length > 0) {
         return captureMoves.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
    }

    const simpleMoves = [];
    const piece = gameState.grid[row][col];
    const isKing = piece.includes('king');
    
    // Skanowanie ruchów prostych
    const directions = isKing 
        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] 
        : (player === 'white' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

    directions.forEach(([dr, dc]) => {
        if (isKing) {
            // Damka: idzie tak daleko jak może
            let r = row + dr;
            let c = col + dc;
            while (isValidMove(gameState.grid, row, col, r, c, player)) {
                simpleMoves.push({ toRow: r, toCol: c, isCapture: false });
                r += dr;
                c += dc;
                // Zabezpieczenie przed pętlą (isValidMove sprawdza granice, ale warto mieć break)
                if (r < 0 || r > 9 || c < 0 || c > 9) break;
            }
        } else {
            // Zwykły: tylko o 1 pole
            const r = row + dr;
            const c = col + dc;
            if (isValidMove(gameState.grid, row, col, r, c, player)) {
                simpleMoves.push({ toRow: r, toCol: c, isCapture: false });
            }
        }
    });
    return simpleMoves;
  }
}

// Funkcja pomocnicza: Znajdź pionka pomiędzy A i B (dla damki i zwykłego)
function findCapturedPieceBetween(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    let r = r1 + dr;
    let c = c1 + dc;
    
    while (r !== r2 && c !== c2) {
        if (r < 0 || r > 9 || c < 0 || c > 9) break; // Safety
        if (gameState.grid[r][c] !== 0) {
            return { r, c };
        }
        r += dr;
        c += dc;
    }
    return null;
}

export function makeMove(fromRow, fromCol, toRow, toCol, isCapture) {
  const previousBoard = JSON.parse(JSON.stringify(gameState.grid));
  const previousPlayer = gameState.currentPlayer;

  // 1. Przesunięcie pionka na planszy
  // Zachowujemy typ pionka (np. jeśli damka to damka)
  gameState.grid[toRow][toCol] = gameState.grid[fromRow][fromCol];
  gameState.grid[fromRow][fromCol] = 0;

  let moreCapturesAvailable = false;

  if (isCapture) {
    // 2. Znajdź i oznacz zbitego pionka
    const captured = findCapturedPieceBetween(fromRow, fromCol, toRow, toCol);
    if (captured) {
        pendingCaptures.push(captured);
    }

    // 3. Sprawdź czy są DALSZE bicia z nowej pozycji
    const nextCaptures = getPossibleCapturesForPiece(gameState.grid, toRow, toCol, pendingCaptures);
    
    if (nextCaptures.length > 0) {
      moreCapturesAvailable = true;
      pieceLockedForCapture = true;
      
      // Zaktualizuj zaznaczenie na nową pozycję pionka
      selectedSquare = { row: toRow, col: toCol };
      validMovesForSelected = nextCaptures.map(m => ({ toRow: m[0], toCol: m[1], isCapture: true }));
      
      renderBoard(); 
      return; // PRZERWIJ funkcję - tura się nie kończy!
    }
  }

  // --- KONIEC TURY (jeśli dotarliśmy tutaj, to znaczy że ruch zakończony) ---
  
  // 4. Usuń fizycznie wszystkie zbite pionki
  if (pendingCaptures.length > 0) {
      pendingCaptures.forEach(cap => {
          gameState.grid[cap.r][cap.c] = 0;
      });
      pendingCaptures = [];
  }

  // 5. Promocja na damkę
  const piece = gameState.grid[toRow][toCol];
  if (piece && !piece.includes('king')) {
      if (gameState.currentPlayer === 'white' && toRow === 0) {
          gameState.grid[toRow][toCol] = 'white_king';
      }
      if (gameState.currentPlayer === 'black' && toRow === 9) {
          gameState.grid[toRow][toCol] = 'black_king';
      }
  }

  // 6. Zmiana gracza i czyszczenie stanu UI
  gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
  pieceLockedForCapture = false;
  selectedSquare = null;
  validMovesForSelected = [];
  
  // 7. Historia i odświeżenie
  moveHistory.addMove({ fromRow, fromCol, toRow, toCol, previousBoard, previousPlayer });
  updateCurrentPlayerDisplay();
  renderBoard();
}

function highlightValidMoves(moves) {
  moves.forEach(({ toRow, toCol }) => {
    const square = document.querySelector(`#board .square[data-row='${toRow}'][data-col='${toCol}']`);
    if (square) square.classList.add('highlight');
  });
}
