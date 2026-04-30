const API = "http://localhost:8000";
const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

const KEYBOARD_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["Enter","z","x","c","v","b","n","m","Backspace"],
];

let sessionId = null;
let guesses = [];
let currentGuess = "";
let gameStatus = "in_progress";
let letterStatuses = {};

// ── DOM helpers ──────────────────────────────────────────────────────────────

function buildBoard() {
  // create 6 rows of 5 empty tiles, each addressable by tile-{row}-{col}
  const board = document.getElementById("board");
  board.innerHTML = "";
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement("div");
    row.className = "board-row";
    row.id = `row-${r}`;
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.id = `tile-${r}-${c}`;
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function buildKeyboard() {
  // render keyboard rows; each button fires handleKey on click
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";
  for (const row of KEYBOARD_ROWS) {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";
    for (const key of row) {
      const btn = document.createElement("button");
      btn.className = "key" + (key.length > 1 ? " wide" : "");
      btn.textContent = key === "Backspace" ? "⌫" : key;
      btn.dataset.key = key;
      btn.addEventListener("click", () => handleKey(key));
      rowEl.appendChild(btn);
    }
    kb.appendChild(rowEl);
  }
}

function renderCurrentGuess() {
  // update the active row as the user types, before submission
  const rowIndex = guesses.length;
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = document.getElementById(`tile-${rowIndex}-${c}`);
    tile.textContent = (currentGuess[c] || "").toUpperCase();
    tile.className = "tile" + (currentGuess[c] ? " active" : "");
  }
}

function renderSubmittedRow(rowIndex, wordObj) {
  // color each tile green/yellow/gray based on feedback from the backend
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = document.getElementById(`tile-${rowIndex}-${c}`);
    tile.textContent = wordObj.word[c].toUpperCase();
    tile.className = `tile ${wordObj.feedback[c]}`;
  }
}

function renderAllGuesses() {
  // re-render all submitted rows; used when restoring a session on page load
  for (let i = 0; i < guesses.length; i++) {
    renderSubmittedRow(i, guesses[i]);
  }
}

function updateKeyboard() {
  // apply current letterStatuses map to each key button
  for (const btn of document.querySelectorAll(".key")) {
    const key = btn.dataset.key.toLowerCase();
    const status = letterStatuses[key];
    btn.className = "key" + (btn.dataset.key.length > 1 ? " wide" : "") + (status ? ` ${status}` : "");
  }
}

function showMessage(text, type = "") {
  // type maps to a CSS class: "win" → message-win, "lose" → message-lose
  const el = document.getElementById("message");
  el.innerHTML = `<span class="message-text ${type ? "message-" + type : ""}">${text}</span>`;
}

function clearMessage() {
  document.getElementById("message").innerHTML = "";
}

function showNewGameButton() {
  // guard against duplicates if called more than once
  const existing = document.querySelector(".new-game-btn");
  if (existing) return;
  const btn = document.createElement("button");
  btn.className = "new-game-btn";
  btn.textContent = "New Game";
  btn.addEventListener("click", startGame);
  document.querySelector(".app").appendChild(btn);
}

function removeNewGameButton() {
  document.querySelector(".new-game-btn")?.remove();
}

// ── Keyboard: Letter status tracking ───────────────────────────────────────────────────

// green > yellow > gray: a letter's color should only ever upgrade
const STATUS_PRIORITY = { green: 3, yellow: 2, gray: 1 };

function updateLetterStatuses(wordObj) {
  // update keyboard colors after each guess - keep the best status seen so far
  wordObj.word.split("").forEach((letter, i) => {
    const next = wordObj.feedback[i];
    const current = letterStatuses[letter];
    if (!current || STATUS_PRIORITY[next] > STATUS_PRIORITY[current]) {
      letterStatuses[letter] = next;
    }
  });
}

// ── Game logic ───────────────────────────────────────────────────────────────

async function startGame() {
  // reset all state for a new game
  removeNewGameButton();
  clearMessage();
  guesses = [];
  currentGuess = "";
  gameStatus = "in_progress";
  letterStatuses = {};

  // build UI immediately so the board shows before the API responds
  buildBoard();
  buildKeyboard();

  // create session on the backend, store id for subsequent requests
  const res = await fetch(`${API}/game/new`, { method: "POST" });
  const state = await res.json();
  sessionId = state.session_id;
  localStorage.setItem("wordle_session", sessionId);
}

async function handleKey(key) {
  if (gameStatus !== "in_progress") return;

  // remove letter from guess
  if (key === "Backspace") {
    currentGuess = currentGuess.slice(0, -1);
    clearMessage();
    renderCurrentGuess();
    return;
  }

  // submit guess
  if (key === "Enter") {
    if (currentGuess.length !== WORD_LENGTH) {
      showMessage("Not enough letters");
      return;
    }
    await submitGuess();
    return;
  }

  // add letter to guess
  if (/^[a-zA-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
    currentGuess += key.toLowerCase();
    clearMessage();
    renderCurrentGuess();
  }
}

async function submitGuess() {
  // send guess to backend; backend validates and returns feedback
  let state;
  try {
    const res = await fetch(`${API}/game/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, guess: currentGuess }),
    });
    state = await res.json();
    if (!res.ok) {
      // 422 = invalid word, 400 = game over, 404 = session missing
      showMessage(state.detail || "Invalid guess");
      return;
    }
  } catch {
    showMessage("Could not reach server");
    return;
  }

  // update state and re-render with feedback from backend
  guesses = state.guesses;
  gameStatus = state.status;
  currentGuess = "";

  const lastGuess = guesses[guesses.length - 1];
  renderSubmittedRow(guesses.length - 1, lastGuess);
  updateLetterStatuses(lastGuess);
  updateKeyboard();

  // show result banner and new game button if game ended
  if (gameStatus === "won") {
    showMessage("You got it!", "win");
    showNewGameButton();
  } else if (gameStatus === "lost") {
    showMessage(`The word was ${state.word.toUpperCase()}`, "lose");
    showNewGameButton();
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const saved = localStorage.getItem("wordle_session");
  if (saved) {
    try {
      const res = await fetch(`${API}/game/state/${saved}`);
      if (!res.ok) throw new Error();
      const state = await res.json();

      // in-memory sessions don't survive server restarts — start fresh if gone
      sessionId = state.session_id;
      guesses = state.guesses;
      gameStatus = state.status;

      buildBoard();
      buildKeyboard();
      renderAllGuesses();
      for (const g of guesses) updateLetterStatuses(g);
      updateKeyboard();

      if (gameStatus === "won") {
        showMessage("You got it!", "win");
        showNewGameButton();
      } else if (gameStatus === "lost") {
        showMessage(`The word was ${state.word.toUpperCase()}`, "lose");
        showNewGameButton();
      }
      return;
    } catch {
      // session gone (server restarted), start fresh
    }
  }
  await startGame();
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  handleKey(e.key);
});

init();
