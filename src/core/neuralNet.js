let model = null;
let isModelReady = false;
const MODEL_PATH = 'indexeddb://checkers-pro-v1';

export async function initModel() {
    if (isModelReady && model) return model;

    try {
        const models = await tf.io.listModels();
        if (models[MODEL_PATH]) {
            model = await tf.loadLayersModel(MODEL_PATH);
            // WERYFIKACJA: Sprawdźmy, czy model nie jest uszkodzony (czy nie zwraca NaN)
            const testPred = predictBoard(Array(10).fill(Array(10).fill(0)));
            if (isNaN(testPred)) {
                console.warn("Wykryto uszkodzony model (NaN). Resetowanie...");
                throw new Error("Model Corrupted");
            }
            console.log("Załadowano sprawny model PRO z IndexedDB.");
        } else {
            console.log("Tworzenie nowego modelu PRO...");
            model = createProModel();
        }
    } catch (e) {
        console.warn("Błąd modelu lub uszkodzone wagi. Tworzenie nowego...", e);
        model = createProModel();
        // Nadpisz uszkodzony model nowym
        await model.save(MODEL_PATH);
    }

    model.compile({
        optimizer: tf.train.adam(0.0005), 
        loss: 'meanSquaredError'
    });

    isModelReady = true;
    updateStatusUI("Aktywna (v.PRO)");
    return model;
}

function updateStatusUI(text) {
    const el = document.getElementById('nn-status');
    if (el) {
        el.textContent = text;
        el.style.color = '#2ecc71';
        el.style.fontWeight = 'bold';
    }
}

function createProModel() {
    const model = tf.sequential();
    model.add(tf.layers.conv2d({inputShape: [10, 10, 4], filters: 64, kernelSize: 3, activation: 'relu', padding: 'same'}));
    model.add(tf.layers.conv2d({filters: 64, kernelSize: 3, activation: 'relu', padding: 'same'}));
    model.add(tf.layers.conv2d({filters: 64, kernelSize: 3, activation: 'relu', padding: 'same'}));
    model.add(tf.layers.conv2d({filters: 32, kernelSize: 1, activation: 'relu', padding: 'same'}));
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
    try {
        return tf.tidy(() => {
            const tensor = boardToTensor(board);
            const prediction = model.predict(tensor);
            const val = prediction.dataSync()[0];
            // KLUCZOWA POPRAWKA: Zabezpieczenie przed NaN
            if (isNaN(val)) return 0;
            return val * 2000; 
        });
    } catch (e) {
        console.error("Błąd predykcji sieci:", e);
        return 0;
    }
}

export async function saveModel() {
    if(model) {
        try { await model.save(MODEL_PATH); } catch (e) { console.error(e); }
    }
}

export async function saveModelFromArtifacts(artifacts) {
    try {
        const ioHandler = tf.io.fromMemory({
            modelTopology: artifacts.modelTopology,
            weightSpecs: artifacts.weightSpecs,
            weightData: artifacts.weightData
        });
        const tempModel = await tf.loadLayersModel(ioHandler);
        
        // Weryfikacja przed zapisem
        const dummy = tf.zeros([1, 10, 10, 4]);
        const pred = tempModel.predict(dummy).dataSync()[0];
        dummy.dispose();
        
        if (isNaN(pred)) {
            alert("Błąd: Wytrenowany model jest uszkodzony (NaN). Trening odrzucony.");
            return false;
        }

        await tempModel.save(MODEL_PATH);
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
