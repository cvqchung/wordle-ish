# Wordle-ish

> 🧩 **Play it here: https://wordle-ish.fly.dev/** 🧩

> <img width="303" height="333" alt="wordlescreen" src="https://github.com/user-attachments/assets/49a1f48e-788b-45ef-96f4-401a30cce5c8" />

### Features
- 6 attempts to guess a random 5-letter word ([Word list source](https://github.com/tabatkins/wordle-list))
- Color-coded tile and keyboard feedback ( 🟩 / 🟨 / ⬛️ )
- Game state persists on page refresh
- Dark mode with preference saved across sessions
- Win animation with confetti :)
- Mobile-friendly

#### Tech Stack
- **Frontend**: Vanilla JS, HTML, CSS
- **Backend**: Python, FastAPI, Uvicorn
- **Testing**: pytest

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
