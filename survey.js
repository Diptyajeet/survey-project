const form = document.getElementById("surveyForm");
const steps = Array.from(document.querySelectorAll(".step"));
const progressBar = document.querySelector(".progress-bar");
const cursorGlow = document.querySelector(".cursor-glow");
const fullNameInput = form.querySelector('input[name="fullName"]');
const guideText = document.getElementById("guideText");
const photoInput = document.getElementById("photoInput");
const photoLabel = document.getElementById("photoLabel");
const photoPreview = document.getElementById("photoPreview");
const matchPanel = document.getElementById("matchPanel");
const matchMessage = document.getElementById("matchMessage");
const knownPoints = document.getElementById("knownPoints");

let currentStep = 0;
let matchedProfile = null;
let basicInfoChecked = false;
let uploadedPhotoDataUrl = "";

function getStepFields(step) {
    return Array.from(step.querySelectorAll("input, select"));
}

function updateProgress() {
    const progress = ((currentStep + 1) / steps.length) * 100;
    progressBar.style.width = `${progress}%`;
}

function showStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));

    steps.forEach((step, stepIndex) => {
        step.classList.toggle("active", stepIndex === currentStep);
    });

    updateProgress();
}

function markField(field, isValid) {
    field.classList.toggle("error", !isValid);
}

function validateCurrentStep() {
    const fields = getStepFields(steps[currentStep]);
    let firstInvalidField = null;

    fields.forEach(field => {
        const isValid = field.checkValidity();
        markField(field, isValid);

        if (!isValid && !firstInvalidField) {
            firstInvalidField = field;
        }
    });

    if (firstInvalidField) {
        firstInvalidField.reportValidity();
        firstInvalidField.focus();
        return false;
    }

    return true;
}

function collectSurveyData() {
    const fields = Array.from(form.querySelectorAll("input, select"));

    return fields.reduce((data, field, index) => {
        const key = field.name || field.placeholder || `answer${index + 1}`;
        data[key] = field.type === "file" ? field.files[0]?.name || "" : field.value.trim();
        return data;
    }, { photoDataUrl:uploadedPhotoDataUrl });
}

function readUploadedPhoto(file) {
    if (!file) {
        uploadedPhotoDataUrl = "";
        photoPreview.hidden = true;
        photoPreview.removeAttribute("src");
        return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
        const dataUrl = String(reader.result || "");

        if (dataUrl.length <= 750000) {
            uploadedPhotoDataUrl = dataUrl;
            photoPreview.src = dataUrl;
            photoPreview.hidden = false;
            return;
        }

        uploadedPhotoDataUrl = "";
        photoPreview.hidden = true;
        guideText.textContent = "Photo selected, but it is too large to save in the local database preview.";
    });

    reader.readAsDataURL(file);
}

function collectBasicData() {
    return {
        fullName:form.fullName.value.trim(),
        email:form.email.value.trim(),
        age:form.age.value.trim(),
        sex:form.sex.value,
        photoFileName:photoInput.files[0]?.name || ""
    };
}

function setFieldValue(name, value) {
    const field = form.elements[name];

    if (field && value) {
        field.value = value;
        markField(field, field.checkValidity());
    }
}

function applyKnownProfile(profile) {
    matchedProfile = profile;
    localStorage.setItem("matchedProfile", JSON.stringify(profile));

    Object.entries(profile.prefill || {}).forEach(([name, value]) => {
        setFieldValue(name, value);
    });

    matchMessage.textContent = profile.guideMessage || "Congrats, I know you. I filled some answers from what the admin already knows.";
    knownPoints.innerHTML = "";

    (profile.knownPoints || []).forEach(point => {
        const item = document.createElement("li");
        item.textContent = point;
        knownPoints.appendChild(item);
    });

    matchPanel.hidden = false;
    guideText.textContent = "Congrats, I know this user. I already filled some survey answers on behalf of the admin.";
}

async function checkKnownUser() {
    const basicData = collectBasicData();

    if (location.protocol === "file:") {
        guideText.textContent = "Run this with node server.js to check the private known-user database.";
        basicInfoChecked = true;
        return;
    }

    try {
        const response = await fetch("/api/match-user", {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify(basicData)
        });
        const payload = await response.json();

        basicInfoChecked = true;
        window.personaAnalytics?.track("known_user_check", {
            ...basicData,
            matched:payload.matched
        });

        if (payload.matched && payload.profile) {
            applyKnownProfile(payload.profile);
            return;
        }

        matchedProfile = null;
        localStorage.removeItem("matchedProfile");
        matchPanel.hidden = true;
        guideText.textContent = "I do not know this user yet. Please continue and fill the survey yourself.";
    } catch {
        basicInfoChecked = true;
        guideText.textContent = "I could not reach the known-user database. You can still continue manually.";
    }
}

document.addEventListener("mousemove", event => {
    if (!cursorGlow) {
        return;
    }

    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
});

form.addEventListener("click", event => {
    const nextButton = event.target.closest(".next");
    const prevButton = event.target.closest(".prev");

    if (nextButton) {
        if (validateCurrentStep()) {
            if (currentStep === 0 && !basicInfoChecked) {
                checkKnownUser().then(() => showStep(currentStep + 1));
                return;
            }

            showStep(currentStep + 1);
        }
    }

    if (prevButton) {
        showStep(currentStep - 1);
    }
});

form.addEventListener("input", event => {
    if (event.target.matches("input, select")) {
        markField(event.target, event.target.checkValidity());
    }
});

form.addEventListener("change", event => {
    if (event.target.matches("select")) {
        markField(event.target, event.target.checkValidity());
    }

    if (event.target.name === "sex") {
        basicInfoChecked = false;
    }

    if (event.target === photoInput) {
        photoLabel.textContent = photoInput.files[0]?.name || "Upload Your Photo";
        readUploadedPhoto(photoInput.files[0]);
        basicInfoChecked = false;
    }
});

form.addEventListener("input", event => {
    if (event.target.matches('[name="fullName"], [name="email"], [name="age"]')) {
        basicInfoChecked = false;
    }
});

form.addEventListener("submit", event => {
    event.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    const surveyData = collectSurveyData();

    if (matchedProfile) {
        surveyData.knownProfileId = matchedProfile.id;
        surveyData.adminPrefilled = true;
        surveyData.knownPoints = matchedProfile.knownPoints || [];
    }

    localStorage.setItem("surveyData", JSON.stringify(surveyData));
    window.personaAnalytics?.track("survey_submit", surveyData);
    window.location.href = "result.html";
});

window.addEventListener("load", () => {
    showStep(currentStep);

    if (fullNameInput) {
        fullNameInput.focus();
    }
});
