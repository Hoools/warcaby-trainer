// tests/gameTests.js
import { gameState } from '../src/core/gameState.js';
import { getPossibleCapturesForPiece } from '../src/core/rules.js';

export const gameTests = {
    'Pojedyncze bicie zwykłym pionkiem': ({ placePiece, assert }) => {
        placePiece(5, 5, 'white');
        placePiece(4, 4, 'black');
        
        const captures = getPossibleCapturesForPiece(gameState.grid, 5, 5, []);
        // Powinien móc zbić na 3,3
        assert(captures.some(m => m[0] === 3 && m[1] === 3), "Nie znaleziono bicia na 3,3");
        assert(captures.length === 1, "Powinno być tylko jedno bicie");
    },

    'Wielokrotne bicie zwykłym pionkiem (zygzak)': ({ placePiece, assert }) => {
        // Ustawienie: Biały na 9,0. Czarne na 8,1 i 6,1.
        // Biały powinien skoczyć 9,0 -> 7,2 -> 5,0
        placePiece(9, 0, 'white');
        placePiece(8, 1, 'black');
        placePiece(6, 1, 'black');

        // 1. Pierwszy skok
        let captures = getPossibleCapturesForPiece(gameState.grid, 9, 0, []);
        assert(captures.some(m => m[0] === 7 && m[1] === 2), "Brak pierwszego bicia na 7,2");

        // Symulujemy wykonanie pierwszego ruchu (dodajemy zbity do pending)
        const pending = [{r: 8, c: 1}];
        
        // 2. Drugi skok z nowej pozycji (7,2)
        captures = getPossibleCapturesForPiece(gameState.grid, 7, 2, pending);
        assert(captures.some(m => m[0] === 5 && m[1] === 0), "Brak drugiego bicia na 5,0");
    },

    'Damka: Latające bicie z dystansu': ({ placePiece, assert }) => {
        // Biała damka na 9,9. Czarny pionek na 6,6.
        // Damka powinna móc wylądować na 5,5, 4,4, 3,3 itd.
        placePiece(9, 9, 'white_king');
        placePiece(6, 6, 'black');

        const captures = getPossibleCapturesForPiece(gameState.grid, 9, 9, []);
        
        // Sprawdź czy widzi lądowania za czarnym
        assert(captures.some(m => m[0] === 5 && m[1] === 5), "Damka nie widzi lądowania tuż za pionkiem (5,5)");
        assert(captures.some(m => m[0] === 2 && m[1] === 2), "Damka nie widzi dalekiego lądowania (2,2)");
    },

    'Damka: Bicie dwóch pionków w linii (NIEDOZWOLONE w jednym skoku)': ({ placePiece, assert }) => {
        // W warcabach nie można przeskoczyć dwóch pionków stojących obok siebie
        placePiece(9, 9, 'white_king');
        placePiece(6, 6, 'black');
        placePiece(5, 5, 'black'); // Drugi tuż za pierwszym

        const captures = getPossibleCapturesForPiece(gameState.grid, 9, 9, []);
        assert(captures.length === 0, "Damka nie powinna móc przeskoczyć dwóch pionków naraz!");
    },

    'Damka: Wielokrotne bicie (Kąt 90 stopni)': ({ placePiece, assert }) => {
        /*
          Sytuacja:
            W_King na 9,9
            B na 6,6
            B na 4,2  <-- Do zbicia po skręcie
        */
        placePiece(9, 9, 'white_king');
        placePiece(6, 6, 'black');
        placePiece(4, 2, 'black');

        // 1. Pierwsze bicie: Lądujemy np. na 5,5 (pomiędzy biciami)
        // (W realnej grze gracz wybiera gdzie ląduje, tutaj sprawdzamy czy widzi taką opcję)
        let captures = getPossibleCapturesForPiece(gameState.grid, 9, 9, []);
        assert(captures.some(m => m[0] === 5 && m[1] === 5), "Damka powinna móc wylądować na 5,5 po pierwszym biciu");

        // 2. Sprawdzamy czy z 5,5 widzi bicie czarnego na 4,2
        // Zbity pionek na 6,6 jest w pending
        const pending = [{r: 6, c: 6}];
        captures = getPossibleCapturesForPiece(gameState.grid, 5, 5, pending);
        
        // Z 5,5 czarny na 4,2 jest na przekątnej? Tak: 5,5 -> 4,4(pusto) -> 4,2?? NIE.
        // Czekaj, 5,5 -> 4,2 to nie jest przekątna! 
        // 5,5 -> 4,4 -> 3,3. 
        // 4,2 jest na innej linii.
        // Poprawmy test: Ustawmy czarnego na 3,3.
        // Z 9,9 bijemy 6,6 lądujemy na 5,5.
        // Z 5,5 bijemy 3,3? Tak, to ta sama linia. To Turkish checkers? Nie.
        
        // Zróbmy typowy 'rzykoszet' damką (Turecki cios):
        // WK: 8,8. B: 6,6. B: 5,3.
        // 8,8 -> (bije 6,6) -> ląduje na 4,4 -> (bije 5,3)? Nie, 4,4 i 5,3 nie są na przekątnej.
        // 4,4 i 6,2 SĄ na przekątnej.
        
        // Setup poprawiony:
        // WK: 9,9. 
        // B1: 7,7.
        // Lądowanie na 6,6.
        // B2: 4,4 (na tej samej linii) - to proste.
        // Zróbmy kątowe.
        // B2: 5,5. (To wymagałoby lądowania na 6,6 i skrętu... ale 5,5 jest na tej samej linii co 7,7)
        
        // OK, zróbmy prosty test:
        // WK na 0,0. B na 2,2. Lądujemy na 3,3. B na 4,2.
        // 3,3 i 4,2 -> delta r=1, c=-1. Są na przekątnej!
        
        gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0)); // manual clear
        placePiece(0, 0, 'white_king');
        placePiece(2, 2, 'black');
        placePiece(4, 2, 'black');

        // Krok 1: Bicie 2,2 lądowanie na 3,3
        const captures1 = getPossibleCapturesForPiece(gameState.grid, 0, 0, []);
        assert(captures1.some(m => m[0] === 3 && m[1] === 3), "Powinna być opcja lądowania na 3,3");

        // Krok 2: Z 3,3 bicie 4,2
        const pending2 = [{r: 2, c: 2}];
        const captures2 = getPossibleCapturesForPiece(gameState.grid, 3, 3, pending2);
        assert(captures2.some(m => m[0] === 5 && m[1] === 1), "Powinna być opcja bicia drugiego pionka i lądowania na 5,1");
    }
};
