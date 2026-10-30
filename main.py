from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from uuid import uuid4

from word_manager import WordManager
from word_validator import WordValidator
from game_state import GameState
from game_engine import GameEngine
from offline_scoring import OfflineScoring


app = FastAPI()

word_manager = WordManager()
validator = WordValidator()

sessions = {}


class StartGameRequest(BaseModel):
    level: int


class GuessRequest(BaseModel):
    session_id: str
    guess: str


class SessionRequest(BaseModel):
    session_id: str

def get_session(session_id):

    if session_id not in sessions:
        raise HTTPException(
            status_code=404,
            detail="Game session not found."
        )

    return sessions[session_id]


def get_word_display(game_state):

    display = []

    for i in range(game_state.length):

        if game_state.revealed[i]:
            display.append(game_state.word[i])

        else:
            display.append(None)

    return display


@app.get("/api/progress")
def get_progress():

    return {
        "level": 1,
        "points": 0
    }


@app.post("/api/start-game")
def start_game(request: StartGameRequest):

    if request.level < 1 or request.level > 7:

        raise HTTPException(
            status_code=400,
            detail="Invalid level."
        )

    word_data = word_manager.get_random_word(
        request.level
    )

    game_state = GameState(
        word_data,
        request.level
    )

    game_engine = GameEngine(
        game_state,
        validator
    )

    session_id = str(uuid4())

    sessions[session_id] = {
        "game_engine": game_engine
    }

    return {
        "session_id": session_id,
        "level": request.level,
        "length": game_state.length,
        "revealed": get_word_display(game_state),
        "hints_used": game_state.hints_used,
        "max_hints": game_state.max_hints,
        "total_attempts": game_state.total_attempts,
        "clue_available": game_state.clue_available(),
        "forfeit_available": game_state.can_forfeit()
    }


@app.post("/api/guess")
def make_guess(request: GuessRequest):

    session = get_session(request.session_id)

    game_engine = session["game_engine"]

    result = game_engine.make_guess(
        request.guess
    )

    game_state = game_engine.state

    if result["status"] == "invalid":

        return {
            "status": "invalid",
            "total_attempts": game_state.total_attempts,
            "clue_available": game_state.clue_available(),
            "forfeit_available": game_state.can_forfeit(),
            "hints_used": game_state.hints_used,
            "max_hints": game_state.max_hints
        }

    response = {
        "status": result["status"],
        "wrong_positioned_letters": result.get(
            "wrong_positioned_letters",
            []
        ),
        "not_present_letters": result.get(
            "not_present_letters",
            []
        ),
        "revealed": get_word_display(game_state),
        "total_attempts": game_state.total_attempts,
        "clue_available": game_state.clue_available(),
        "forfeit_available": game_state.can_forfeit(),
        "hints_used": game_state.hints_used,
        "max_hints": game_state.max_hints
    }

    if game_state.won:

        if result["status"] == "revealed":
            points = 50

        else:
            scoring = OfflineScoring(
                game_state.level
            )

            points = scoring.calculate_points(
                game_state
            )

        response["word"] = game_state.word
        response["points"] = points

    if result["status"] == "revealed":
        response["message"] = result["message"]

    return response


@app.post("/api/clue")
def give_clue(request: SessionRequest):

    session = get_session(request.session_id)

    game_engine = session["game_engine"]

    result = game_engine.give_clue()

    if result["status"] == "unavailable":
        return result

    game_state = game_engine.state

    if result["status"] == "won":

        scoring = OfflineScoring(
            game_state.level
        )

        points = scoring.calculate_points(
            game_state
        )

        return {
            "status": "won",
            "word": game_state.word,
            "points": points,
            "revealed": get_word_display(game_state),
            "hints_used": game_state.hints_used,
            "max_hints": game_state.max_hints,
            "total_attempts": game_state.total_attempts,
            "clue_available": game_state.clue_available(),
            "forfeit_available": game_state.can_forfeit()
        }

    return {
        "status": "hint",
        "revealed": get_word_display(game_state),
        "hints_used": game_state.hints_used,
        "max_hints": game_state.max_hints,
        "total_attempts": game_state.total_attempts,
        "clue_available": game_state.clue_available(),
        "forfeit_available": game_state.can_forfeit()
    }


@app.post("/api/forfeit")
def forfeit_game(request: SessionRequest):

    session = get_session(request.session_id)

    game_engine = session["game_engine"]

    result = game_engine.forfeit()

    if result["status"] != "forfeited":
        return result

    game_state = game_engine.state

    scoring = OfflineScoring(
        game_state.level
    )

    points = scoring.calculate_points(
        game_state
    )

    return {
        "status": "forfeited",
        "word": result["word"],
        "points": points,
        "total_attempts": game_state.total_attempts,
        "hints_used": game_state.hints_used
    }


app.mount(
    "/",
    StaticFiles(directory="frontend", html=True),
    name="frontend"
)
