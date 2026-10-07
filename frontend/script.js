let playerLevel = 1;
let playerPoints = 0;

let selectedLevel = null;

let currentGame = {
    length: 0,
    revealed: [],
    hintsUsed: 0,
    maxHints: 0,
    totalAttempts: 0,
    clueAvailable: false,
    forfeitAvailable: false
};


const levelNames = {

    1: "Easy",
    2: "Normal",
    3: "Intermediate",
    4: "Advanced",
    5: "Expert",
    6: "Master",
    7: "Legend"

};


function showScreen(screenId) {

    document.querySelectorAll(".screen").forEach(function (screen) {

        screen.classList.remove("active");

    });

    document.getElementById(screenId).classList.add("active");

}


function showMessage(message) {

    const messageBox = document.getElementById("message-box");
    const messageText = document.getElementById("message-text");

    messageText.textContent = message;

    messageBox.classList.add("show");

    setTimeout(function () {

        messageBox.classList.remove("show");

    }, 2500);

}


function displayProgress() {

    document.getElementById("player-level").textContent = playerLevel;

    document.getElementById("player-points").textContent = playerPoints;

}


function updateLevelCards() {

    const levelCards = document.querySelectorAll(".level-card");

    levelCards.forEach(function (card) {

        const level = Number(card.dataset.level);

        card.classList.remove("locked");

        const oldButton = card.querySelector(".play-button");
        const oldLock = card.querySelector(".lock");

        if (oldButton) {
            oldButton.remove();
        }

        if (oldLock) {
            oldLock.remove();
        }


        if (level <= playerLevel) {

            const playButton = document.createElement("button");

            playButton.classList.add("play-button");

            playButton.textContent = "PLAY";

            playButton.addEventListener("click", function () {

                startGame(level);

            });

            card.appendChild(playButton);

        }

        else {

            card.classList.add("locked");

            const lock = document.createElement("span");

            lock.classList.add("lock");

            lock.textContent = "\u{1F512}";

            card.appendChild(lock);

        }

    });

}


async function startGame(level) {

    selectedLevel = level;

    document.getElementById("guess-input").value = "";
    document.getElementById("guess-input").disabled = false;
    document.getElementById("guess-button").disabled = false;
    document.getElementById("confirmation-area").innerHTML = "";

    try {

        const response = await fetch("/api/start-game", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                level: level
            })

        });


        if (!response.ok) {

            throw new Error("Unable to start the game.");

        }


        const data = await response.json();


        currentGame.length = data.length;

        currentGame.revealed = data.revealed;

        currentGame.hintsUsed = data.hints_used;

        currentGame.maxHints = data.max_hints;

        currentGame.totalAttempts = data.total_attempts;
        document.getElementById("total-attempts").textContent = data.total_attempts;
        
        currentGame.clueAvailable = data.clue_available;
        currentGame.forfeitAvailable = data.forfeit_available;


        document.getElementById("game-level").textContent =
            "LEVEL " + level;

        document.getElementById("word-length").textContent =
            data.length;


        displayWord(data.revealed);

        clearGuessResult();

        updateGameActions();

        showScreen("game-screen");


        document.getElementById("guess-input").focus();

    }

    catch (error) {

        showMessage(error.message);

    }

}


function displayWord(revealed) {

    const wordBoard = document.getElementById("word-board");

    wordBoard.innerHTML = "";


    revealed.forEach(function (letter) {

        const letterBox = document.createElement("div");

        letterBox.classList.add("letter-box");

        if (letter) {

            letterBox.textContent = letter.toUpperCase();

        }
        else {

            letterBox.textContent = "";

        }

        wordBoard.appendChild(letterBox);

    });

}


async function makeGuess() {

    const input = document.getElementById("guess-input");

    const guess = input.value.trim();


    if (guess === "") {

        showMessage("Please enter a word.");

        return;

    }


    try {


        const response = await fetch("/api/guess", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                guess: guess
            })

        });


        if (!response.ok) {

            throw new Error("Unable to submit the guess.");

        }


        const data = await response.json();


        input.value = "";

        currentGame.totalAttempts = data.total_attempts;
        document.getElementById("total-attempts").textContent = data.total_attempts;
        currentGame.clueAvailable = data.clue_available;
        currentGame.forfeitAvailable = data.forfeit_available;
        currentGame.revealed = data.revealed;
        
        if (data.status === "invalid") {

            clearGuessResult();
            updateGameActions();

            showMessage(
                "Invalid word or outside of the game's word list."
            );
            
            return;

        }
        

        if (data.status === "won") {

            displayWord(data.revealed);

            showFinalResult(data);

            return;

        }

        if (data.status === "revealed") {
            displayWord(data.revealed);
            displayGuessResult(data);

            document.getElementById("guess-input").disabled = true;
            document.getElementById("guess-button").disabled = true;

            document.getElementById("clue-area").innerHTML = "";
            document.getElementById("forfeit-area").innerHTML = "";

            setTimeout(function () {
            showFinalResult(data);
            }, 2000);

            return;
        }


        if (data.status === "wrong") {

            displayWord(data.revealed);

            displayGuessResult(data);

            updateGameActions();

        }

    }

    catch (error) {

        showMessage(error.message);

    }

}


function displayGuessResult(data) {

    const message = document.getElementById("result-message");

    const wrong = document.getElementById("wrong-position");

    const notPresent = document.getElementById("not-present");


    message.textContent = "Guess Result";


    wrong.textContent =
        "Wrong Position: " +
        formatLetters(data.wrong_positioned_letters);


    notPresent.textContent =
        "Not Present: " +
        formatLetters(data.not_present_letters);

}


function formatLetters(letters) {

    if (!letters || letters.length === 0) {

        return "None";

    }

    return letters.join(", ");

}


function clearGuessResult() {

    document.getElementById("result-message").textContent = "";

    document.getElementById("wrong-position").textContent = "";

    document.getElementById("not-present").textContent = "";

}


function updateGameActions() {

    const clueArea = document.getElementById("clue-area");

    const forfeitArea = document.getElementById("forfeit-area");


    clueArea.innerHTML = "";

    forfeitArea.innerHTML = "";


    if (currentGame.clueAvailable) {
    

        const clueButton = document.createElement("button");

        clueButton.id = "clue-button";

        clueButton.textContent = "USE CLUE";

        clueButton.addEventListener("click", useClue);

        clueArea.appendChild(clueButton);

    }


    if (currentGame.forfeitAvailable) {

        const forfeitButton = document.createElement("button");

        forfeitButton.id = "forfeit-button";

        forfeitButton.textContent = "FORFEIT";

        forfeitButton.addEventListener("click", forfeitGame);

        forfeitArea.appendChild(forfeitButton);

    }

}


function showConfirmation(message, confirmText) {

    const confirmationArea =
        document.getElementById("confirmation-area");

    confirmationArea.innerHTML = "";

    const confirmationMessage =
        document.createElement("p");

    confirmationMessage.textContent = message;

    const confirmButton =
        document.createElement("button");

    confirmButton.textContent = confirmText;

    const cancelButton =
        document.createElement("button");

    cancelButton.textContent = "NO";

    confirmationArea.appendChild(confirmationMessage);
    confirmationArea.appendChild(confirmButton);
    confirmationArea.appendChild(cancelButton);

    return new Promise(function (resolve) {

        confirmButton.addEventListener("click", function () {

            confirmationArea.innerHTML = "";

            resolve(true);
        });

        cancelButton.addEventListener("click", function () {

            confirmationArea.innerHTML = "";

            resolve(false);
        });

    });
}

async function useClue() {

    const confirmed = await showConfirmation(
        "Do you want to use a clue?",
        "YES"
    );

    if (!confirmed) return;

    try {

        const response = await fetch("/api/clue", {
            method: "POST"
        });

        if (!response.ok) {

            throw new Error("A clue is not available.");
        }

        const data = await response.json();

        if (data.status === "won") {

            currentGame.hintsUsed = data.hints_used;
            currentGame.maxHints = data.max_hints;
            currentGame.totalAttempts = data.total_attempts;
            currentGame.clueAvailable = data.clue_available;
            currentGame.forfeitAvailable = data.forfeit_available;
            currentGame.revealed = data.revealed;

            displayWord(data.revealed);
            showFinalResult(data);

            return;
        }

        if (data.status === "hint") {

            currentGame.hintsUsed = data.hints_used;
            currentGame.maxHints = data.max_hints;
            currentGame.totalAttempts = data.total_attempts;
            currentGame.clueAvailable = data.clue_available;
            currentGame.forfeitAvailable = data.forfeit_available;
            currentGame.revealed = data.revealed;

            displayWord(data.revealed);
            updateGameActions();

            showMessage("A clue has been given.");

            return;
        }

        showMessage(
            data.message || "A clue is not available."
        );

    } catch (error) {

        showMessage(error.message);
    }
}


async function forfeitGame() {

    const confirmed = await showConfirmation(
        "Do you want to forfeit this game?",
        "YES"
    );

    if (!confirmed) return;

    try {

        const response = await fetch("/api/forfeit", {
            method: "POST"
        });

        if (!response.ok) {

            throw new Error("Forfeit is not available yet.");
        }

        const data = await response.json();

        if (data.status !== "forfeited") {

            showMessage(data.message);
            return;
        }

        showFinalResult(data);

    } catch (error) {

        showMessage(error.message);
    }
}


function showFinalResult(data) {

    document.getElementById("final-word").textContent =
        data.word || "";

    document.getElementById("final-attempts").textContent =
        data.total_attempts || currentGame.totalAttempts;

    document.getElementById("final-hints").textContent =
        data.hints_used || currentGame.hintsUsed;

    document.getElementById("final-points").textContent =
        data.points !== undefined ? data.points : 0;


    if (data.status === "forfeited") {
        document.getElementById("final-title").textContent =
        "GAME OVER";
    }
    else if (data.status === "revealed") {
        document.getElementById("final-title").textContent =
        data.message;
    }
    else {
        document.getElementById("final-title").textContent =
        "CONGRATULATIONS!";
    }

    showScreen("result-screen");

}


document.getElementById("play-again-button")
    .addEventListener("click", function () {

        if (selectedLevel !== null) {

            startGame(selectedLevel);

        }

    });


document.getElementById("home-button")
    .addEventListener("click", function () {

        showScreen("home-screen");

        loadProgress();

    });


document.getElementById("guess-button")
    .addEventListener("click", makeGuess);



document.getElementById("guess-input")
    .addEventListener("keydown", function (event) {

        if (event.key === "Enter") {

            makeGuess();

        }

    });


async function loadProgress() {

    try {

        const response = await fetch("/api/progress");


        if (!response.ok) {

            throw new Error("Unable to load player progress.");

        }


        const data = await response.json();


        playerLevel = data.level;

        playerPoints = data.points;


        displayProgress();

        updateLevelCards();

    }

    catch (error) {

        displayProgress();

        updateLevelCards();

    }

}

loadProgress();