const API = "";
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
let isAnimating = false;
let messageTimer = null;

// ── DOM helpers ──────────────────────────────────────────────────────────────

const getTile = (r, c) => document.getElementById(`tile-${r}-${c}`);

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

function renderCurrentGuess(popLastTile = false) {
  // update the active row as the user types, before submission
  const rowIndex = guesses.length;
  const lastIdx = currentGuess.length - 1;
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = getTile(rowIndex, c);
    tile.textContent = (currentGuess[c] || "").toUpperCase();
    let cls = "tile";
    if (currentGuess[c]) cls += " active";
    // popLastTile triggers the scale-up pop on the newest tile
    if (popLastTile && c === lastIdx) cls += " tile-pop";
    tile.className = cls;
  }
}

function flipTile(tile, delay, colorClass) {
  // tile flip animation when submit word
  return new Promise(resolve => {
    setTimeout(() => {
      tile.style.animation = "flip-in 0.25s ease-in forwards";  // squish to 0 (letter hidden)
      tile.addEventListener("animationend", () => {
        tile.className = `tile ${colorClass}`;                  // apply color class
        tile.style.animation = "flip-out 0.25s ease-out forwards";  // unsquish to reveal
        tile.addEventListener("animationend", () => {
          tile.style.animation = "";
          resolve();
        }, { once: true });
      }, { once: true });
    }, delay);
  });
}

async function renderSubmittedRow(rowIndex, wordObj, animate = true) {
  // color each tile green/yellow/gray based on feedback from the backend
  const tiles = Array.from({ length: WORD_LENGTH }, (_, c) => getTile(rowIndex, c));
  tiles.forEach((tile, c) => {
    tile.textContent = wordObj.word[c].toUpperCase();
    if (!animate) tile.className = `tile ${wordObj.feedback[c]}`;
  });
  // animate=false skips the flip when restoring a session
  if (!animate) return;
  await Promise.all(tiles.map((tile, c) => flipTile(tile, c * 300, wordObj.feedback[c])));
}

function renderAllGuesses() {
  // re-render all submitted rows; used when restoring a session on page load
  guesses.forEach((g, i) => renderSubmittedRow(i, g, false));
}

function updateKeyboard() {
  // apply current letterStatuses map to each key button
  for (const btn of document.querySelectorAll(".key")) {
    const key = btn.dataset.key.toLowerCase();
    const status = letterStatuses[key];
    btn.className = "key" + (btn.dataset.key.length > 1 ? " wide" : "") + (status ? ` ${status}` : "");
  }
}

function showMessage(text, type = "", autoDismiss = true) {
  // type maps to a CSS class: "win" → message-win, "lose" → message-lose
  clearTimeout(messageTimer);
  const el = document.getElementById("message");
  const span = document.createElement("span");
  span.className = "message-text " + (autoDismiss ? "transient" : "persist") + (type ? ` message-${type}` : "");
  span.textContent = text;
  el.innerHTML = "";
  el.appendChild(span);
  // autoDismiss fades and clears the toast after 1.8s
  if (autoDismiss) {
    messageTimer = setTimeout(() => { el.innerHTML = ""; }, 1800);
  }
}

function clearMessage() {
  clearTimeout(messageTimer);
  document.getElementById("message").innerHTML = "";
}

function showEndState(state) {
  // show result banner and new game button when game is over
  if (state.status === "won") {
    showMessage("You got it!", "win", false);
  } else {
    showMessage(`The word was ${state.word.toUpperCase()}`, "lose", false);
  }
  showNewGameButton();
}

function launchConfetti() {
  // confetti streams from both bottom corners
  const end = Date.now() + 2000;
  const frame = () => {
    confetti({ particleCount: 4, angle: 60,  spread: 55, origin: { x: 0, y: 0.75 } });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.75 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

function playWinDance(rowIndex) {
  // each tile bounces up then settles, staggered 100ms left to right
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = getTile(rowIndex, c);
    setTimeout(() => {
      tile.style.animation = "tile-dance 0.6s ease";
      tile.addEventListener("animationend", () => { tile.style.animation = ""; }, { once: true });
    }, c * 100);
  }
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

// ── Keyboard: Letter status tracking ─────────────────────────────────────────

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
  isAnimating = false;

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
  if (gameStatus !== "in_progress" || isAnimating) return;

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
    renderCurrentGuess(true);
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

  const rowIndex = guesses.length - 1;
  const lastGuess = guesses[rowIndex];

  isAnimating = true; // block input during flip, then unlock
  try {
    await renderSubmittedRow(rowIndex, lastGuess, true);
  } finally {
    isAnimating = false;
  }

  // update keyboard colors
  updateLetterStatuses(lastGuess);
  updateKeyboard();

  // handle wins
  if (gameStatus === "won") {
    playWinDance(rowIndex);
    launchConfetti();
  }
  if (gameStatus !== "in_progress") showEndState(state);
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

      if (gameStatus !== "in_progress") showEndState(state);
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

// ── Dark mode ─────────────────────────────────────────────────────────────────
const darkBtn = document.getElementById("darkModeBtn");

function applyDark(on) {
  document.body.classList.toggle("dark", on);
  darkBtn.textContent = on ? "☀︎" : "⏾";
}

darkBtn.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark ? "1" : "0");
  applyDark(isDark);
  darkBtn.blur();
});

applyDark(localStorage.getItem("darkMode") === "1");

init();
