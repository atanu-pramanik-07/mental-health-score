const GAUGE_ARC_LENGTH = 267;
let currentDisplayedScore = 0;

// DOM Elements
const form = document.getElementById("predictionForm");
const submitBtn = document.getElementById("submitBtn");
const btnSpinner = document.getElementById("btnSpinner");
const apiStatus = document.getElementById("apiStatus");
const apiStatusText = document.getElementById("apiStatusText");

const scoreDisplay = document.getElementById("scoreDisplay");
const scoreBadge = document.getElementById("scoreBadge");
const gaugeArc = document.getElementById("gaugeArc");
const insightTitle = document.getElementById("insightTitle");
const insightDesc = document.getElementById("insightDesc");
const historyList = document.getElementById("historyList");
const errorToast = document.getElementById("errorToast");

// Slider bindings
const sliders = [
    { id: "age", label: "ageVal", decimals: 0 },
    { id: "avg_daily_usage_hours", label: "usageVal", decimals: 1 },
    { id: "daily_unlocks", label: "unlocksVal", decimals: 0 },
    { id: "study_hours", label: "studyVal", decimals: 1 },
    { id: "physical_activity_hours", label: "activityVal", decimals: 1 },
    { id: "sleep_hours_per_night", label: "sleepVal", decimals: 1 }
];

// Presets for one-click testing
const PRESETS = {
    balanced: {
        age: 21,
        gender: "Male",
        country: "India",
        academic_level: "Undergraduate",
        most_used_platform: "YouTube",
        purpose_of_use: "Education",
        avg_daily_usage_hours: 3.5,
        daily_unlocks: 45,
        study_hours: 6.0,
        physical_activity_hours: 1.5,
        sleep_hours_per_night: 7.5,
        stress_level: "Low"
    },
    crunch: {
        age: 22,
        gender: "Female",
        country: "India",
        academic_level: "Undergraduate",
        most_used_platform: "WhatsApp",
        purpose_of_use: "Education",
        avg_daily_usage_hours: 5.0,
        daily_unlocks: 95,
        study_hours: 9.5,
        physical_activity_hours: 0.5,
        sleep_hours_per_night: 5.0,
        stress_level: "High"
    },
    heavy: {
        age: 19,
        gender: "Male",
        country: "USA",
        academic_level: "Undergraduate",
        most_used_platform: "Instagram",
        purpose_of_use: "Entertainment",
        avg_daily_usage_hours: 9.5,
        daily_unlocks: 160,
        study_hours: 2.0,
        physical_activity_hours: 0.5,
        sleep_hours_per_night: 5.5,
        stress_level: "Very High"
    }
};

// Check FastAPI /health endpoint on load
async function checkApiHealth() {
    try {
        const res = await fetch("/health");
        if (res.ok) {
            apiStatus.classList.add("online");
            apiStatus.classList.remove("offline");
            apiStatusText.textContent = "API Online";
        } else {
            throw new Error("Non-200 response");
        }
    } catch {
        apiStatus.classList.add("offline");
        apiStatus.classList.remove("online");
        apiStatusText.textContent = "API Offline";
    }
}

// Update 24-hour allocation bar and derived telemetry
function updateTelemetry() {
    const usage = parseFloat(document.getElementById("avg_daily_usage_hours").value);
    const unlocks = parseInt(document.getElementById("daily_unlocks").value, 10);
    const study = parseFloat(document.getElementById("study_hours").value);
    const exercise = parseFloat(document.getElementById("physical_activity_hours").value);
    const sleep = parseFloat(document.getElementById("sleep_hours_per_night").value);

    const total = usage + study + exercise + sleep;
    const scaleBase = Math.max(24, total);

    document.getElementById("barScreen").style.width = `${(usage / scaleBase) * 100}%`;
    document.getElementById("barStudy").style.width = `${(study / scaleBase) * 100}%`;
    document.getElementById("barExercise").style.width = `${(exercise / scaleBase) * 100}%`;
    document.getElementById("barSleep").style.width = `${(sleep / scaleBase) * 100}%`;

    document.getElementById("totalHoursLabel").textContent = `${total.toFixed(1)} / 24.0 hrs tracked`;
    const warningEl = document.getElementById("allocationWarning");
    if (total > 24) {
        warningEl.classList.remove("hidden");
    } else {
        warningEl.classList.add("hidden");
    }

    // Derived ratios
    const ratio = sleep > 0 ? (usage / sleep).toFixed(2) : usage.toFixed(2);
    const wakingHours = Math.max(1, 24 - sleep);
    const unlockRate = (unlocks / wakingHours).toFixed(1);
    const recovery = (sleep + exercise).toFixed(1);

    document.getElementById("ratioReadout").textContent = `${ratio}x`;
    document.getElementById("unlockRateReadout").textContent = `${unlockRate} / waking hr`;
    document.getElementById("recoveryReadout").textContent = `${recovery} hrs (Sleep + Act.)`;
}

// Smooth number counter animation
function animateScore(targetScore) {
    const startScore = currentDisplayedScore;
    const duration = 650;
    const startTime = performance.now();

    function frame(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
        const val = startScore + (targetScore - startScore) * eased;
        scoreDisplay.textContent = val.toFixed(2);

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            currentDisplayedScore = targetScore;
        }
    }

    requestAnimationFrame(frame);

    // Update SVG Gauge stroke-dashoffset (clamped 0 to 10)
    const clamped = Math.max(0, Math.min(10, targetScore));
    const offset = GAUGE_ARC_LENGTH * (1 - clamped / 10);
    gaugeArc.style.strokeDashoffset = offset.toFixed(2);
}

// Update interpretation card & status badge
function updateInterpretation(score, payload) {
    scoreBadge.classList.remove("status-high", "status-mid", "status-low");

    if (score >= 7.0) {
        scoreBadge.textContent = "Optimal Resilience";
        scoreBadge.classList.add("status-high");
        insightTitle.textContent = "Strong Wellbeing Equilibrium";
        insightDesc.textContent = `A predicted score of ${score.toFixed(2)} indicates healthy recovery habits (${payload.sleep_hours_per_night}h sleep, ${payload.physical_activity_hours}h activity) balancing screen exposure.`;
    } else if (score >= 4.5) {
        scoreBadge.textContent = "Moderate Strain";
        scoreBadge.classList.add("status-mid");
        insightTitle.textContent = "Moderate Cognitive & Digital Load";
        insightDesc.textContent = `At ${score.toFixed(2)}, lifestyle metrics show moderate strain. Reducing daily unlocks (${payload.daily_unlocks}x) or increasing sleep can shift the trajectory upward.`;
    } else {
        scoreBadge.textContent = "Elevated Risk";
        scoreBadge.classList.add("status-low");
        insightTitle.textContent = "High Fatigue & Stress Signature";
        insightDesc.textContent = `A score of ${score.toFixed(2)} reflects compounding stress (${payload.stress_level}) and screen usage (${payload.avg_daily_usage_hours}h/day). Prioritize sleep recovery and screen boundaries.`;
    }
}

function appendHistory(score, payload) {
    const emptyEl = historyList.querySelector(".history-empty");
    if (emptyEl) emptyEl.remove();

    const item = document.createElement("div");
    item.className = "history-item";
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    item.innerHTML = `
        <span class="history-meta">${timeStr} · ${payload.most_used_platform} (${payload.avg_daily_usage_hours}h) · Stress: ${payload.stress_level}</span>
        <span class="history-score">${score.toFixed(2)}</span>
    `;
    historyList.prepend(item);
}

function showError(message) {
    errorToast.textContent = message;
    errorToast.classList.remove("hidden");
    setTimeout(() => errorToast.classList.add("hidden"), 4500);
}

// Bind range sliders
sliders.forEach(({ id, label, decimals }) => {
    const input = document.getElementById(id);
    const output = document.getElementById(label);
    input.addEventListener("input", () => {
        output.textContent = parseFloat(input.value).toFixed(decimals);
        updateTelemetry();
    });
});

// Bind segmented controls
document.querySelectorAll(".segmented-control").forEach((control) => {
    const targetName = control.dataset.target;
    const hiddenInput = document.getElementById(targetName);
    const buttons = control.querySelectorAll(".seg-btn");

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            hiddenInput.value = btn.dataset.value;
        });
    });
});

// Apply preset values
function applyPreset(presetKey) {
    const data = PRESETS[presetKey];
    if (!data) return;

    sliders.forEach(({ id, label, decimals }) => {
        const input = document.getElementById(id);
        const output = document.getElementById(label);
        input.value = data[id];
        output.textContent = Number(data[id]).toFixed(decimals);
    });

    document.getElementById("country").value = data.country;
    document.getElementById("most_used_platform").value = data.most_used_platform;

    ["gender", "academic_level", "purpose_of_use", "stress_level"].forEach((field) => {
        const hiddenInput = document.getElementById(field);
        hiddenInput.value = data[field];
        const control = document.querySelector(`.segmented-control[data-target="${field}"]`);
        control.querySelectorAll(".seg-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.value === data[field]);
        });
    });

    updateTelemetry();
}

document.querySelectorAll(".chip-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
});

document.getElementById("resetBtn").addEventListener("click", () => applyPreset("balanced"));

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    historyList.innerHTML = `<div class="history-empty">No predictions recorded in this session.</div>`;
});

// Handle form submission -> POST /predict
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
        age: parseInt(document.getElementById("age").value, 10),
        gender: document.getElementById("gender").value,
        country: document.getElementById("country").value,
        academic_level: document.getElementById("academic_level").value,
        most_used_platform: document.getElementById("most_used_platform").value,
        purpose_of_use: document.getElementById("purpose_of_use").value,
        avg_daily_usage_hours: parseFloat(document.getElementById("avg_daily_usage_hours").value),
        daily_unlocks: parseInt(document.getElementById("daily_unlocks").value, 10),
        study_hours: parseFloat(document.getElementById("study_hours").value),
        physical_activity_hours: parseFloat(document.getElementById("physical_activity_hours").value),
        sleep_hours_per_night: parseFloat(document.getElementById("sleep_hours_per_night").value),
        stress_level: document.getElementById("stress_level").value
    };

    submitBtn.disabled = true;
    btnSpinner.classList.remove("hidden");

    try {
        const response = await fetch("/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server responded with HTTP ${response.status}`);
        }

        const result = await response.json();
        const score = Number(result.predicted_mental_health_score);

        animateScore(score);
        updateInterpretation(score, payload);
        appendHistory(score, payload);
    } catch (err) {
        showError(`Inference Error: ${err.message}`);
    } finally {
        submitBtn.disabled = false;
        btnSpinner.classList.add("hidden");
    }
});

// Initialize on page load
checkApiHealth();
updateTelemetry();