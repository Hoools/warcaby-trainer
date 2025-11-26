// Panel sterowania, przyciski i wyświetlanie statusu

function updateStatus(message) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
}

function initControls() {
  const controlsDiv = document.getElementById('controls');
  controlsDiv.innerHTML = '';

  // Przykładowy przycisk cofania ruchu
  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Cofnij ruch';
  undoBtn.onclick = () => {
    // obsługa cofania - do zaimplementowania
  };
  controlsDiv.appendChild(undoBtn);
}

initControls();
