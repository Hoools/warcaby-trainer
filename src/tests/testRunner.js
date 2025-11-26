// Jest (poprawnie wewnątrz src):
import { gameState } from '../core/gameState.js';
import { getValidMovesForPiece, makeMove } from '../ui/ui-board.js';
import { getPossibleCapturesForPiece, hasAnyCapture } from '../core/rules.js';


// Pomocnicza funkcja do czyszczenia planszy
function clearBoard() {
    gameState.grid = Array(10).fill(null).map(() => Array(10).fill(0));
    gameState.currentPlayer = 'white';
}

// Pomocnicza funkcja do ustawiania pionka
function placePiece(r, c, piece) {
    gameState.grid[r][c] = piece;
}

// Assertions
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Test failed");
    }
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message || "Assertion failed"}. Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
    }
}

export async function runTests(testSuite) {
    console.log("=== ROZPOCZYNAM TESTY ===");
    let passed = 0;
    let failed = 0;

    for (const testName in testSuite) {
        try {
            clearBoard(); // Reset przed każdym testem
            console.log(`Uruchamiam: ${testName}...`);
            await testSuite[testName]({ placePiece, assert, assertEqual });
            console.log(`✅ ${testName} PASSED`);
            passed++;
        } catch (e) {
            console.error(`❌ ${testName} FAILED: ${e.message}`);
            failed++;
        }
    }

    console.log(`=== WYNIKI: ${passed} OK, ${failed} FAIL ===`);
}
