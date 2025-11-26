// src/tests/gameTests.js
import { gameState } from '../core/gameState.js';
import { getPossibleCapturesForPiece } from '../core/rules.js';

export const gameTests = {
    'Pojedyncze bicie zwykłym pionkiem': ({ placePiece, assert }) => {
        placePiece(5, 5, 'white');
        placePiece(4, 4, 'black');
        
        const captures = getPossibleCapturesForPiece(gameState.grid, 5, 5, []);
        assert(captures.some(m => m[0] === 3 && m[1] === 3), "Nie znaleziono bicia na 3,3");
        assert(captures.length === 1, "Powinno być tylko jedno bicie");
    },

    'Wielokrotne bicie zwykłym pionkiem (zygzak)': ({ placePiece, assert }) => {
        placePiece(9, 0, 'white');
        placePiece(8, 1, 'black');
        placePiece(6, 1, 'black');

        // 1. Pierwszy skok
        let captures = getPossibleCapturesForPiece(gameState.grid, 9, 0, []);
        assert(captures.some(m => m[0] === 7 && m[1] === 2), "Brak pierwszego bicia na 7,2");

        // SYMULACJA RUCHU (Fix dla testu)
        // Aby sprawdzić bicie z 7,2, musimy tam postawić pionka!
        placePiece(9, 0, 0);       // Zabierz ze starego
        placePiece(7, 2, 'white'); // Postaw na nowym

        const pending = [{r: 8, c: 1}];
        
        // 2. Drugi skok z nowej pozycji
        captures = getPossibleCapturesForPiece(gameState.grid, 7, 2, pending);
        assert(captures.some(m => m[0] === 5 && m[1] === 0), "Brak drugiego bicia na 5,0");
    },

    'Damka: Latające bicie z dystansu': ({ placePiece, assert }) => {
        placePiece(9, 9, 'white_king');
        placePiece(6, 6, 'black');

        const captures = getPossibleCapturesForPiece(gameState.grid, 9, 9, []);
        assert(captures.some(m => m[0] === 5 && m[1] === 5), "Damka nie widzi lądowania tuż za pionkiem (5,5)");
        assert(captures.some(m => m[0] === 2 && m[1] === 2), "Damka nie widzi dalekiego lądowania (2,2)");
    },

    'Damka: Bicie dwóch pionków w linii (NIEDOZWOLONE)': ({ placePiece, assert }) => {
        placePiece(9, 9, 'white_king');
        placePiece(6, 6, 'black');
        placePiece(5, 5, 'black'); 

        const captures = getPossibleCapturesForPiece(gameState.grid, 9, 9, []);
        assert(captures.length === 0, "Damka nie powinna móc przeskoczyć dwóch pionków naraz!");
    },

    'Damka: Wielokrotne bicie (Kąt 90 stopni)': ({ placePiece, assert }) => {
        gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0)); // manual clear
        placePiece(0, 0, 'white_king');
        placePiece(2, 2, 'black');
        placePiece(4, 2, 'black');

        // Krok 1: Bicie 2,2 lądowanie na 3,3
        const captures1 = getPossibleCapturesForPiece(gameState.grid, 0, 0, []);
        assert(captures1.some(m => m[0] === 3 && m[1] === 3), "Powinna być opcja lądowania na 3,3");

        // SYMULACJA RUCHU (Fix dla testu)
        placePiece(0, 0, 0);
        placePiece(3, 3, 'white_king'); // Przesuwamy damkę

        // Krok 2: Z 3,3 bicie 4,2
        const pending2 = [{r: 2, c: 2}];
        const captures2 = getPossibleCapturesForPiece(gameState.grid, 3, 3, pending2);
        assert(captures2.some(m => m[0] === 5 && m[1] === 1), "Powinna być opcja bicia drugiego pionka i lądowania na 5,1");
    }
};
