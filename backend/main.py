from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid

from word_service import random_word, is_valid_word, evaluate_guess

# Build backend
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: { session_id: { secret, guesses, status } }
sessions: dict = {}

MAX_GUESSES = 6


class GuessRequest(BaseModel):
    session_id: str
    guess: str


def format_state(session_id: str) -> dict:
    # secret is only revealed once the game ends
    s = sessions[session_id]
    return {
        "session_id": session_id,
        "guesses": s["guesses"],
        "status": s["status"],
        "max_guesses": MAX_GUESSES,
        "word": s["secret"] if s["status"] != "in_progress" else None,
    }


@app.post("/game/new")
def new_game():
    # create a new session with a random secret word
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "secret": random_word(),
        "guesses": [],
        "status": "in_progress",
    }
    return format_state(session_id)


@app.post("/game/guess")
def make_guess(body: GuessRequest):
    # retrieve session
    if body.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    s = sessions[body.session_id]

    if s["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Game is already over")

    # validate guess
    guess = body.guess.lower().strip()

    if len(guess) != 5:
        raise HTTPException(status_code=422, detail="Guess must be exactly 5 letters")
    if not guess.isalpha():
        raise HTTPException(status_code=422, detail="Guess must contain only letters")
    if not is_valid_word(guess):
        raise HTTPException(status_code=422, detail="Not a valid word")

    # evaluate guess and update game state
    feedback = evaluate_guess(s["secret"], guess)
    s["guesses"].append({"word": guess, "feedback": feedback})

    if guess == s["secret"]:
        s["status"] = "won"
    elif len(s["guesses"]) >= MAX_GUESSES:
        s["status"] = "lost"

    return format_state(body.session_id)


@app.get("/game/state/{session_id}")
def get_state(session_id: str):
    # used by the frontend to restore state on page refresh
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return format_state(session_id)
