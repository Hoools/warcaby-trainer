let model = null;
let isModelReady = false;

// Stała nazwa ścieżki do modelu (używamy IndexedDB zamiast LocalStorage dla większej pojemności)
const MODEL_PATH = 'indexeddb://checkers-pro-v1';

export async function initModel() {
    if (isModelReady && model) {
        updateStatusUI("Aktywna (Gotowa)"); // <--- DODANO
        return model;
    }

    try {
        const models = await tf.io.listModels();
        
        if (models[MODEL_PATH]) {
            model = await tf.loadLayersModel(MODEL_PATH);
            console.log("Załadowano model PRO z IndexedDB.");
        } else {
            console.log("Model nie istnieje (pierwszy start). Tworzenie nowego modelu PRO...");
            model = createProModel();
        }
    } catch (e) {
        console.warn("Błąd inicjalizacji modelu. Tworzenie nowego...", e);
        model = createProModel();
    }

    model.compile({
        optimizer: tf.train.adam(0.0005), 
        loss: 'meanSquaredError'
    });

    isModelReady = true;
    updateStatusUI("Aktywna (v.PRO)"); // <--- DODANO: Aktualizacja napisu w UI
    return model;
}

// Dodaj tę funkcję pomocniczą na końcu pliku neuralNet.js
function updateStatusUI(text) {
    const el = document.getElementById('nn-status');
    if (el) {
        el.textContent = text;
        el.style.color = '#2ecc71'; // Zielony kolor
        el.style.fontWeight = 'bold';
    }
}

function createProModel() {
    const model = tf.sequential();

    // Wejście: 10x10, 4 kanały
    model.add(tf.layers.conv2d({
        inputShape: [10, 10, 4],
        filters: 64,
        kernelSize: 3,
        activation: 'relu',
        padding: 'same'
    }));

    model.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu', padding: 'same' }));
    model.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu', padding: 'same' }));
    model.add(tf.layers.conv2d({ filters: 32, kernelSize: 1, activation: 'relu', padding: 'same' }));
    
    model.add(tf.layers.flatten());

    model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'tanh' }));

    return model;
}

export function boardToTensor(board) {
    const tensorData = [];
    for (let r = 0; r < 10; r++) {
        const row = [];
        for (let c = 0; c < 10; c++) {
            const p = board[r][c];
            let channels = [0, 0, 0, 0];
            if (typeof p === 'string') {
                if (p === 'white') channels[0] = 1;
                if (p === 'white_king') channels[1] = 1;
                if (p === 'black') channels[2] = 1;
                if (p === 'black_king') channels[3] = 1;
            }
            row.push(channels);
        }
        tensorData.push(row);
    }
    return tf.tensor4d([tensorData]);
}

export function predictBoard(board) {
    if (!isModelReady || !model) return 0;
    return tf.tidy(() => {
        const tensor = boardToTensor(board);
        const prediction = model.predict(tensor);
        const val = prediction.dataSync()[0];
        return val * 2000; 
    });
}

export async function saveModel() {
    if(model) {
        try {
            await model.save(MODEL_PATH);
            console.log("Model zapisany ręcznie w IndexedDB.");
        } catch (e) {
            console.error("Błąd zapisu modelu:", e);
        }
    }
}

// Funkcja zapisu modelu z workera (POPRAWIONA SKŁADNIA)
export async function saveModelFromArtifacts(artifacts) {
    try {
        // POPRAWKA: Przekazujemy jeden obiekt konfiguracyjny zamiast 3 argumentów
        const ioHandler = tf.io.fromMemory({
            modelTopology: artifacts.modelTopology,
            weightSpecs: artifacts.weightSpecs,
            weightData: artifacts.weightData
        });
        
        const tempModel = await tf.loadLayersModel(ioHandler);
        
        // Zapisujemy w IndexedDB (dużo miejsca!)
        await tempModel.save(MODEL_PATH);
        console.log("Model z Workera zapisany w IndexedDB!");
        
        // Aktualizujemy model w pamięci
        model = tempModel;
        model.compile({optimizer: tf.train.adam(0.0005), loss: 'meanSquaredError'});
        isModelReady = true;
        return true;
    } catch (e) {
        console.error("Błąd zapisu modelu z artefaktów:", e);
        return false;
    }
}

export function getModel() { return model; }
