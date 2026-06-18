const cursorGlow = document.querySelector(".cursor-glow");
const personaTitle = document.getElementById("personaTitle");
const personaSummary = document.getElementById("personaSummary");
const traitsContainer = document.getElementById("traits");
const rewardWheel = document.getElementById("rewardWheel");
const spinBtn = document.getElementById("spinBtn");
const playBtn = document.getElementById("playBtn");
const rewardText = document.getElementById("rewardText");

const rewards = [
    "Bonus XP",
    "Power Badge",
    "Lucky Token",
    "Mystery Gift",
    "Rare Aura",
    "Double Chance"
];

let currentRotation = 0;
let isSpinning = false;

function readSurveyData() {
    try {
        return JSON.parse(localStorage.getItem("surveyData")) || {};
    } catch {
        return {};
    }
}

function createPersona(data) {
    const name = data.fullName || "Explorer";
    const personality = data.personalityType || "Ambivert";
    const energy = data.energyType || "Night Owl";
    const hobby = data.favoriteHobby || "creative challenges";
    const game = data.favoriteGame || "strategy games";

    const personaMap = {
        Introvert: {
            title: "The Deep Focus Strategist",
            summary: `${name}, you notice details most people rush past. Your strength is patient thinking, calm decisions, and turning quiet focus into clever moves.`
        },
        Extrovert: {
            title: "The Social Spark Leader",
            summary: `${name}, you bring momentum into the room. Your strength is quick connection, bold action, and making every challenge feel more alive.`
        },
        Ambivert: {
            title: "The Adaptive Quest Maker",
            summary: `${name}, you switch modes with style. Your strength is knowing when to listen, when to lead, and when to make the next move.`
        }
    };

    const persona = personaMap[personality] || personaMap.Ambivert;

    return {
        title: persona.title,
        summary: `${persona.summary} Since you enjoy ${hobby} and ${game}, your quest style is built around curiosity, timing, and playful problem solving.`,
        traits: [personality, energy, hobby, game]
    };
}

function renderPersona() {
    const data = readSurveyData();
    const persona = createPersona(data);

    personaTitle.textContent = persona.title;
    personaSummary.textContent = persona.summary;

    traitsContainer.innerHTML = "";

    persona.traits.forEach(trait => {
        const chip = document.createElement("span");
        chip.className = "trait";
        chip.textContent = trait;
        traitsContainer.appendChild(chip);
    });
}

function spinReward() {
    if (isSpinning) {
        return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    rewardText.textContent = "Spinning...";

    const rewardIndex = Math.floor(Math.random() * rewards.length);
    const segmentSize = 360 / rewards.length;
    const targetAngle = 360 - (rewardIndex * segmentSize + segmentSize / 2);
    const extraSpins = 4 * 360;

    currentRotation += extraSpins + targetAngle;
    rewardWheel.style.transform = `rotate(${currentRotation}deg)`;

    window.setTimeout(() => {
        rewardText.textContent = `You unlocked: ${rewards[rewardIndex]}`;
        localStorage.setItem("personaReward", rewards[rewardIndex]);
        window.personaAnalytics?.track("reward_spin", {
            reward:rewards[rewardIndex],
            surveyData:readSurveyData()
        });
        spinBtn.textContent = "Spin Again";
        spinBtn.disabled = false;
        playBtn.disabled = false;
        isSpinning = false;
    }, 3700);
}

document.addEventListener("mousemove", event => {
    if (!cursorGlow) {
        return;
    }

    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
});

spinBtn.addEventListener("click", spinReward);
playBtn.addEventListener("click", () => {
    window.location.href = "game.html";
});
renderPersona();
