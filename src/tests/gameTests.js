// src/tests/gameTests.js
import { gameState } from '../core/gameState.js';
import { getValidMoves, getPossibleCapturesForPiece, checkGameState, canPlayerMove } from '../core/rules.js';

export const gameTests = {
    // Test 1: Zwykłe bicie
    // Ustawienie: Biały na 33 (6,5), Czarny na 29 (5,6).
    // Bicie: 33 -> 29 -> lądowanie na 24 (4,7).
    'Pojedyncze bicie zwykłym pionkiem': ({ placePiece, assert }) => {
        placePiece(6, 5, 'white'); // Pole 33
        placePiece(5, 6, 'black'); // Pole 29
        
        const captures = getPossibleCapturesForPiece(gameState.grid, 6, 5, []);
        assert(captures.some(m => m[0] === 4 && m[1] === 7), "Nie znaleziono bicia na pole 24 (4,7)");
        assert(captures.length === 1, "Powinno być tylko jedno bicie");
    },

    // Test 2: Zygzak (już był poprawny)
    // 46 (9,0) -> bije 41 (8,1) -> ląduje 37 (7,2)
    // 37 (7,2) -> bije 31 (6,1) -> ląduje 26 (5,0)
    'Wielokrotne bicie zwykłym pionkiem (zygzak)': ({ placePiece, assert }) => {
        placePiece(9, 0, 'white'); // 46
        placePiece(8, 1, 'black'); // 41
        placePiece(6, 1, 'black'); // 31

        // 1. Pierwszy skok
        let captures = getPossibleCapturesForPiece(gameState.grid, 9, 0, []);
        assert(captures.some(m => m[0] === 7 && m[1] === 2), "Brak pierwszego bicia na 7,2");

        // Symulacja
        placePiece(9, 0, 0);       
        placePiece(7, 2, 'white'); 
        const pending = [{r: 8, c: 1}];
        
        // 2. Drugi skok
        captures = getPossibleCapturesForPiece(gameState.grid, 7, 2, pending);
        assert(captures.some(m => m[0] === 5 && m[1] === 0), "Brak drugiego bicia na 5,0");
    },

    // Test 3: Damka - Dystans
    // Używamy przekątnej głównej (46 -> 5).
    // Damka na 46 (9,0). Czarny na 23 (4,5).
    // Lądowanie możliwe na 19 (3,6), 14 (2,7), 10 (1,8), 5 (0,9).
    'Damka: Latające bicie z dystansu': ({ placePiece, assert }) => {
        placePiece(9, 0, 'white_king'); // 46
        placePiece(4, 5, 'black');      // 23

        const captures = getPossibleCapturesForPiece(gameState.grid, 9, 0, []);
        assert(captures.some(m => m[0] === 3 && m[1] === 6), "Damka nie widzi lądowania tuż za pionkiem (3,6) [pole 19]");
        assert(captures.some(m => m[0] === 0 && m[1] === 9), "Damka nie widzi dalekiego lądowania (0,9) [pole 5]");
    },

    // Test 4: Damka - Dwa pionki (niedozwolone)
    // Damka 46 (9,0). Czarne na 23 (4,5) i 19 (3,6).
    'Damka: Bicie dwóch pionków w linii (NIEDOZWOLONE)': ({ placePiece, assert }) => {
        placePiece(9, 0, 'white_king');
        placePiece(4, 5, 'black');
        placePiece(3, 6, 'black'); 

        const captures = getPossibleCapturesForPiece(gameState.grid, 9, 0, []);
        assert(captures.length === 0, "Damka nie powinna móc przeskoczyć dwóch pionków naraz!");
    },

    // Test 5: Damka - Kąt 90 stopni
    // Start: 46 (9,0).
    // Bicie 1: 23 (4,5). Lądowanie 19 (3,6).
    // Bicie 2: Z 19 (3,6) bije 13 (2,5). Lądowanie 8 (1,4).
    // To jest zygzak damką.
    'Damka: Wielokrotne bicie (Kąt 90 stopni)': ({ placePiece, assert }) => {
        gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0)); 
        placePiece(9, 0, 'white_king'); // 46
        placePiece(4, 5, 'black');      // 23
        placePiece(2, 5, 'black');      // 13 (do drugiego bicia)

        // Krok 1: 46 -> bije 23 -> ląduje 19
        const captures1 = getPossibleCapturesForPiece(gameState.grid, 9, 0, []);
        assert(captures1.some(m => m[0] === 3 && m[1] === 6), "Powinna być opcja lądowania na 3,6 [pole 19]");

        // Symulacja
        placePiece(9, 0, 0);
        placePiece(3, 6, 'white_king'); 
        const pending2 = [{r: 4, c: 5}]; // 23 zbite

        // Krok 2: Z 19 bije 13
        const captures2 = getPossibleCapturesForPiece(gameState.grid, 3, 6, pending2);
        assert(captures2.some(m => m[0] === 1 && m[1] === 4), "Powinna być opcja bicia drugiego pionka i lądowania na 1,4 [pole 8]");
    },

    // Test 6: Wymuszenie lądowania (już był poprawny)
    'Damka: Wymuszenie najlepszego lądowania (37->23->8)': ({ placePiece, assert }) => {
        placePiece(7, 2, 'white_king'); // 37
        placePiece(4, 5, 'black');      // 23
        placePiece(1, 4, 'black');      // 8
        
        const moves = getValidMoves(gameState.grid, 7, 2, 'white', []);
        
        const landsOn19 = moves.some(m => m.toRow === 3 && m.toCol === 6);
        const landsOn14 = moves.some(m => m.toRow === 2 && m.toCol === 7);
        
        assert(landsOn19, "Powinien pozwolić wylądować na polu 19");
        assert(!landsOn14, "Nie powinien pozwolić wylądować na polu 14");
        assert(moves.length === 1, "Powinien być tylko 1 legalny ruch");
    },

    // Test 7: Koniec gry - brak pionków
    'Koniec gry: Brak pionków': ({ placePiece, assert }) => {
        placePiece(5, 6, 'white'); // Pole 28
        // Czarne puste
        const result = checkGameState(gameState.grid, 'black');
        assert(result === 'white', "Białe powinny wygrać (Czarne nie mają pionków)");
    },

    // Test 8: Koniec gry - Zablokowanie
    // Biały na 6 (1,0).
    // Czarny na 1 (0,1) - blokuje przód.
    // Czarny na 11 (2,1) - blokuje tył (potencjalne bicie).
    // Czarny na 17 (3,2) - blokuje lądowanie po biciu 11.
    'Koniec gry: Zablokowanie (Brak ruchów)': ({ placePiece, assert }) => {
        placePiece(1, 0, 'white'); // 6
        placePiece(0, 1, 'black'); // 1
        placePiece(2, 1, 'black'); // 11
        placePiece(3, 2, 'black'); // 17
        
        const canMove = canPlayerMove(gameState.grid, 'white');
        assert(canMove === false, "Biały powinien być zablokowany");
        
        const result = checkGameState(gameState.grid, 'white');
        assert(result === 'black', "Czarne powinny wygrać (Białe zablokowane)");
    },

    // Test 9: Gra trwa
    'Gra trwa: Są ruchy': ({ placePiece, assert }) => {
        placePiece(5, 6, 'white'); // 28
        placePiece(6, 5, 'black'); // 32
        
        const result = checkGameState(gameState.grid, 'white');
        assert(result === null, "Gra powinna trwać");
    }
};
