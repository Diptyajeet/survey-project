const cursorGlow = document.querySelector(".cursor-glow");
const claimTitle = document.getElementById("claimTitle");
const claimSummary = document.getElementById("claimSummary");
const rewardName = document.getElementById("rewardName");
const claimStatus = document.getElementById("claimStatus");

function readSurveyData() {
    try {
        return JSON.parse(localStorage.getItem("surveyData")) || {};
    } catch {
        return {};
    }
}

function renderClaim() {
    const data = readSurveyData();
    const name = data.fullName || "Explorer";
    const personality = data.personalityType || "your persona";
    const reward = localStorage.getItem("personaReward") || "Mystery Gift";
    const completed = localStorage.getItem("challengeComplete") === "true";

    claimTitle.textContent = `${name}, your prize is claimed`;
    claimSummary.textContent = `Your ${personality} journey is complete. The survey, reward spin, and final challenge are all wrapped into your PersonaQuest result.`;
    rewardName.textContent = reward;
    claimStatus.textContent = completed ? "Challenge verified. Reward unlocked." : "Reward reserved. Complete the challenge to verify it.";

    window.personaAnalytics?.track("claim_view", {
        name,
        personality,
        reward,
        completed
    });
}

document.addEventListener("mousemove", event => {
    if (!cursorGlow) {
        return;
    }

    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
});

renderClaim();
