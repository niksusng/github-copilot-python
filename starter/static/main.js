// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
const DIFFICULTY = {
  easy: 42,
  medium: 34,
  hard: 28,
};

let puzzle = [];
let timerId = null;
let startTime = null;
let hintsUsed = 0;
let currentDifficulty = 'medium';

function formatTime(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

function setMessage(text, type = 'info') {
  const msg = document.getElementById('message');
  msg.innerText = text;
  msg.style.color = type === 'error' ? '#d32f2f' : type === 'success' ? '#388e3c' : '#1f2937';
}

function setStatus() {
  const timerEl = document.getElementById('timer');
  const hintCountEl = document.getElementById('hint-count');
  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  timerEl.innerText = formatTime(elapsed);
  hintCountEl.innerText = hintsUsed;
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  setStatus();
  timerId = setInterval(setStatus, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.setAttribute('aria-label', `Row ${i + 1} column ${j + 1}`);
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }

  boardDiv.removeEventListener('input', onBoardInput);
  boardDiv.removeEventListener('keydown', onBoardKeyDown);
  boardDiv.addEventListener('input', onBoardInput);
  boardDiv.addEventListener('keydown', onBoardKeyDown);
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const inputs = document.querySelectorAll('#sudoku-board input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.classList.add('prefilled');
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
  hintsUsed = 0;
  setStatus();
  setMessage('Puzzle loaded. Good luck!', 'info');
}

function getBoardState() {
  const board = [];
  const inputs = document.querySelectorAll('#sudoku-board input');
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const value = inputs[idx].value.trim();
      board[i][j] = value ? parseInt(value, 10) : 0;
    }
  }
  return board;
}

function validateBoard() {
  const inputs = document.querySelectorAll('#sudoku-board input');
  const board = getBoardState();
  const invalidPositions = new Set();

  const markConflict = (cells) => {
    cells.forEach(([row, col]) => invalidPositions.add(row * SIZE + col));
  };

  for (let i = 0; i < SIZE; i++) {
    const rowMap = new Map();
    const colMap = new Map();
    for (let j = 0; j < SIZE; j++) {
      const rowValue = board[i][j];
      const colValue = board[j][i];
      if (rowValue) {
        if (rowMap.has(rowValue)) {
          markConflict([[i, j], [i, rowMap.get(rowValue)]]);
        } else {
          rowMap.set(rowValue, j);
        }
      }
      if (colValue) {
        if (colMap.has(colValue)) {
          markConflict([[j, i], [colMap.get(colValue), i]]);
        } else {
          colMap.set(colValue, j);
        }
      }
    }
  }

  for (let blockRow = 0; blockRow < 3; blockRow++) {
    for (let blockCol = 0; blockCol < 3; blockCol++) {
      const boxMap = new Map();
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const r = blockRow * 3 + row;
          const c = blockCol * 3 + col;
          const value = board[r][c];
          if (!value) continue;
          if (boxMap.has(value)) {
            markConflict([[r, c], boxMap.get(value)]);
          } else {
            boxMap.set(value, [r, c]);
          }
        }
      }
    }
  }

  inputs.forEach((input, idx) => {
    input.classList.toggle('invalid', invalidPositions.has(idx));
  });

  if (invalidPositions.size > 0) {
    setMessage('There are duplicate numbers in the board.', 'error');
    return false;
  }

  setMessage('Board looks valid so far.', 'success');
  return true;
}

function onBoardInput(event) {
  const target = event.target;
  if (!target.classList.contains('sudoku-cell') || target.disabled) {
    return;
  }
  const value = target.value.replace(/[^1-9]/g, '');
  target.value = value.slice(-1);
  validateBoard();
}

function onBoardKeyDown(event) {
  const target = event.target;
  if (!target.classList.contains('sudoku-cell') || target.disabled) {
    return;
  }
  const directions = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  const move = directions[event.key];
  if (!move) {
    return;
  }
  event.preventDefault();
  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);
  const nextRow = Math.min(SIZE - 1, Math.max(0, row + move[0]));
  const nextCol = Math.min(SIZE - 1, Math.max(0, col + move[1]));
  const nextIndex = nextRow * SIZE + nextCol;
  document.querySelectorAll('#sudoku-board input')[nextIndex]?.focus();
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function newGame() {
  currentDifficulty = document.getElementById('difficulty').value;
  const clues = DIFFICULTY[currentDifficulty] || DIFFICULTY.medium;
  try {
    const data = await fetchJson(`/new?clues=${clues}`);
    renderPuzzle(data.puzzle);
    startTimer();
    document.getElementById('hint-button').disabled = false;
    renderScores();
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

async function checkSolution() {
  if (!validateBoard()) {
    return;
  }
  const board = getBoardState();
  try {
    const data = await fetchJson('/check', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board}),
    });
    const incorrect = new Set(data.incorrect.map(([row, col]) => row * SIZE + col));
    const inputs = document.querySelectorAll('#sudoku-board input');
    inputs.forEach((input, idx) => {
      input.classList.toggle('incorrect', incorrect.has(idx));
    });
    if (incorrect.size === 0) {
      if (board.some(row => row.includes(0))) {
        setMessage('All filled entries are correct so far.', 'success');
      } else {
        await completeGame();
      }
    } else {
      setMessage('Some entries are incorrect. Fix them and try again.', 'error');
    }
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

async function completeGame() {
  stopTimer();
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  setMessage(`Well done! You finished in ${formatTime(elapsedSeconds)}.`, 'success');
  const name = window.prompt('Enter your name for the Top 10 leaderboard:', 'Player')?.trim();
  if (name) {
    saveScore(name, elapsedSeconds, hintsUsed, currentDifficulty);
    renderScores();
  }
  document.getElementById('hint-button').disabled = true;
}

function saveScore(name, time, hints, difficulty) {
  const scores = JSON.parse(localStorage.getItem('sudokuTopScores') || '[]');
  scores.push({name, time, hints, difficulty, created: Date.now()});
  scores.sort((a, b) => a.time - b.time || a.hints - b.hints);
  localStorage.setItem('sudokuTopScores', JSON.stringify(scores.slice(0, 10)));
}

function renderScores() {
  const rows = document.querySelector('#score-table tbody');
  const scores = JSON.parse(localStorage.getItem('sudokuTopScores') || '[]');
  rows.innerHTML = '';
  if (scores.length === 0) {
    rows.innerHTML = '<tr><td colspan="4">No scores yet.</td></tr>';
    return;
  }
  scores.forEach(score => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${score.name}</td>
      <td>${formatTime(score.time)}</td>
      <td>${score.hints}</td>
      <td>${score.difficulty}</td>
    `;
    rows.appendChild(row);
  });
}

function resetLeaderboard() {
  if (confirm('Are you sure you want to clear all scores? This cannot be undone.')) {
    localStorage.removeItem('sudokuTopScores');
    renderScores();
    setMessage('Leaderboard reset.', 'info');
  }
}

function resetLeaderboard() {
  if (!window.confirm('Clear the Top 10 leaderboard? This cannot be undone.')) {
    return;
  }
  localStorage.removeItem('sudokuTopScores');
  renderScores();
  setMessage('Leaderboard has been reset.', 'info');
}

async function requestHint() {
  const board = getBoardState();
  try {
    const data = await fetchJson('/hint', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board}),
    });
    const index = data.row * SIZE + data.col;
    const inputs = document.querySelectorAll('#sudoku-board input');
    const input = inputs[index];
    input.value = data.value;
    input.disabled = true;
    input.classList.add('hinted');
    hintsUsed += 1;
    setStatus();
    setMessage('Hint added to the board.', 'info');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint-button').addEventListener('click', requestHint);
  document.getElementById('reset-leaderboard').addEventListener('click', resetLeaderboard);
  document.getElementById('difficulty').addEventListener('change', (event) => {
    currentDifficulty = event.target.value;
  });
  renderScores();
  newGame();
});
