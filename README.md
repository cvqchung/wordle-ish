# Wordle-ish

> 🧩 **Play it here: https://wordle-ish.fly.dev/** 🧩

> <img width="303" height="333" alt="wordlescreen" src="https://github.com/user-attachments/assets/49a1f48e-788b-45ef-96f4-401a30cce5c8" />

### Features
- 6 attempts to guess a random 5-letter word (Word list taken from [Wordle's](https://github.com/tabatkins/wordle-list) list of valid guesses)
- Color-coded tile and keyboard feedback ( 🟩 / 🟨 / ⬛️ )
- Game state persists on page refresh
- Dark mode with preference saved across sessions
- Win animation with confetti :)
- Mobile-friendly

#### Tech Stack
- **Frontend**: Vanilla JS, HTML, CSS
- **Backend**: Python, FastAPI, Uvicorn
- **Testing**: pytest

#### Session schema (in-memory)
 ```
{
  session_id: uuid,
  secret: str,          # never exposed until game over
  status: "in_progress" | "won" | "lost",
  guesses: [
    {
      word: str,
      feedback: ["green" | "yellow" | "gray", ...]  # one per letter
    },
  ]
}
```
Each game session is stored **server**-side only. The secret word is never sent to the client while the game is in progress. The **client** only gets the `guesses` array.

----

### Running locally

```bash
cd backend && pip install -r requirements.txt
cd ..
./start.sh
```

Opens `http://localhost:8000` automatically.

#### Run Unit Tests (for game logic)

```bash
pip install pytest
cd backend
pytest test_evaluate_guess.py -v
```

The feedback function (`evaluate_guess`) determines whether each letter is green, yellow, or gray, so it's a critical chunk of the game's logic and where the unit tests focus.

Cases covered:
- Basic feedback: all green, all gray, all yellow, mixed
- Duplicate letters: in guess not secret, in secret not guess, in both
