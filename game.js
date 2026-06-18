const cursorGlow = document.querySelector(".cursor-glow");
const playerIntro = document.getElementById("playerIntro");
const attemptsText = document.getElementById("attemptsText");
const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");
const resetBtn = document.getElementById("resetBtn");
const claimBtn = document.getElementById("claimBtn");
const message = document.getElementById("message");
const meterFill = document.getElementById("meterFill");

const maxAttempts = 5;
const minNumber = 1;
const maxNumber = 20;

let secretNumber = 0;
let attemptsLeft = maxAttempts;
let gameOver = false;

function getPlayerName() {
    try {
        const data = JSON.parse(localStorage.getItem("surveyData")) || {};
        return data.fullName || "Explorer";
    } catch {
        return "Explorer";
    }
}

function getReward() {
    return localStorage.getItem("personaReward") || "Mystery Gift";
}

function setMessage(text, state = "") {
    message.textContent = text;
    message.className = `message ${state}`.trim();
}

function updateStatus() {
    attemptsText.textContent = `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`;
    meterFill.style.width = `${(attemptsLeft / maxAttempts) * 100}%`;
}

function startGame() {
    secretNumber = Math.floor(Math.random() * maxNumber) + minNumber;
    attemptsLeft = maxAttempts;
    gameOver = false;

    playerIntro.textContent = `${getPlayerName()}, your ${getReward()} is waiting. Guess the secret number before your attempts run out.`;
    guessInput.value = "";
    guessInput.disabled = false;
    guessBtn.disabled = false;
    claimBtn.hidden = true;
    setMessage("Make your first move.");
    updateStatus();
    guessInput.focus();
    window.personaAnalytics?.track("game_start", {
        playerName:getPlayerName(),
        reward:getReward(),
        range:`${minNumber}-${maxNumber}`,
        maxAttempts
    });
}

function checkGuess() {
    if (gameOver) {
        return;
    }

    const guess = Number(guessInput.value);

    if (!Number.isInteger(guess) || guess < minNumber || guess > maxNumber) {
        setMessage("Enter a whole number from 1 to 20.", "lose");
        guessInput.focus();
        return;
    }

    attemptsLeft--;

    window.personaAnalytics?.track("game_guess", {
        playerName:getPlayerName(),
        reward:getReward(),
        guess,
        attemptsLeft,
        result:guess === secretNumber ? "correct" : guess < secretNumber ? "low" : "high"
    });

    if (guess === secretNumber) {
        gameOver = true;
        guessInput.disabled = true;
        guessBtn.disabled = true;
        claimBtn.hidden = false;
        localStorage.setItem("challengeComplete", "true");
        setMessage(`You won! Your ${getReward()} is claimed.`, "win");
        updateStatus();
        window.personaAnalytics?.track("game_win", {
            playerName:getPlayerName(),
            reward:getReward(),
            secretNumber,
            attemptsUsed:maxAttempts - attemptsLeft
        });
        return;
    }

    if (attemptsLeft === 0) {
        gameOver = true;
        guessInput.disabled = true;
        guessBtn.disabled = true;
        setMessage(`Out of attempts. The secret number was ${secretNumber}.`, "lose");
        updateStatus();
        window.personaAnalytics?.track("game_loss", {
            playerName:getPlayerName(),
            reward:getReward(),
            secretNumber
        });
        return;
    }

    setMessage(guess < secretNumber ? "Too low. Aim higher." : "Too high. Bring it down.");
    guessInput.select();
    updateStatus();
}

document.addEventListener("mousemove", event => {
    if (!cursorGlow) {
        return;
    }

    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
});

guessBtn.addEventListener("click", checkGuess);
resetBtn.addEventListener("click", startGame);
claimBtn.addEventListener("click", () => {
    window.personaAnalytics?.track("claim_click", {
        playerName:getPlayerName(),
        reward:getReward()
    });
    window.location.href = "claim.html";
});

guessInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        checkGuess();
    }
});

window.addEventListener("load", startGame);
