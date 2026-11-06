"use strict";

/* =========================================================
   Typing Speed Tester – script.js
   1) Data & element references   2) Pure calculations
   3) Passage rendering           4) Timer & test flow
   5) Results                     6) Welcome pop-up
   7) Event listeners & start-up
   ========================================================= */

/* ---------- 1) Data & element references ---------- */

// Practice paragraphs. Add your own here, one string per paragraph.
const PARAGRAPHS = [
  "The old library smelled of paper and coffee, and every shelf held a quiet story. She ran her fingers along the spines until she found a book with a faded blue cover. Outside, the rain tapped softly on the window, and for a moment the whole world felt calm and slow.",
  "Learning to type quickly is not about moving your fingers faster. It is about finding a steady rhythm and trusting it. Keep your wrists relaxed, sit up straight, and look at the screen instead of the keys. Speed will follow once the habit becomes natural.",
  "He packed a map, a flashlight and a sandwich before heading up the mountain trail. The air grew cooler with every step, and the pine trees stood tall on both sides of the path. When he finally reached the top, the valley below looked like a patchwork of green and gold.",
  "The market was full of color and sound. Vendors called out prices for fresh fruit, warm bread and fragrant spices while musicians played near the fountain. Children ran between the stalls, and the smell of grilled corn drifted through the busy afternoon air.",
  "Every great project begins with one simple idea and a willingness to try. At first the plan may look messy, and progress may seem slow. But small steps taken each day add up, and soon the idea becomes something real that other people can see and use.",
  "Waves rolled onto the shore while children built castles out of wet sand. A cool breeze carried the smell of salt across the beach, and gulls circled lazily overhead. By the time the sun touched the horizon, the tide had washed every castle quietly away.",
  "A good night of sleep can change the way you think, work and feel. The brain uses that quiet time to sort memories and repair itself. People who rest well often find it easier to focus, solve problems and stay patient when the day becomes difficult.",
  "The train left the station exactly on time, and the city slowly slipped away behind it. Fields stretched out under a wide pale sky, and small villages appeared and vanished in the window. She opened her notebook, wrote the first line of her story, and smiled.",
  "Cooking a simple meal at home can be surprisingly relaxing. Chop the vegetables, heat the pan and let the kitchen fill with a warm, welcoming smell. Taste as you go, adjust the salt, and remember that even a small mistake can turn into a new favorite recipe.",
  "Clear goals and short breaks help you stay focused for much longer than you expect. Work for twenty five minutes, then stand up, stretch and drink some water. When you return to your desk, your mind will feel fresher and the task will seem easier.",
  "Space travel once belonged only to dreams and stories. Today, engineers build rockets that return safely to Earth and robots that explore distant planets. Each mission teaches us something new about the universe and reminds us how much there still is to discover.",
  "The garden was quiet in the early morning. Dew sparkled on the leaves, bees hummed around the lavender, and a single butterfly rested on the old stone wall. He poured a cup of tea, sat on the bench and listened to the day slowly begin."
];

// "Bag" of paragraph numbers: every paragraph is used once before any repeats
let paragraphBag = [];
let lastParagraph = -1;

const STORAGE_KEY = "typingTesterName";

const $ = (id) => document.getElementById(id);
const els = {
  passage: $("passage"), input: $("typingInput"), restartBtn: $("restartBtn"),
  timeLeft: $("timeLeft"), liveWpm: $("liveWpm"), liveAccuracy: $("liveAccuracy"),
  progress: $("progress"), progressFill: $("progressFill"),
  durationBtns: document.querySelectorAll(".seg-btn"),
  results: $("results"), resWpm: $("resWpm"), resAccuracy: $("resAccuracy"),
  resCorrect: $("resCorrect"), resIncorrect: $("resIncorrect"),
  resTotal: $("resTotal"), resDuration: $("resDuration"),
  ring: $("ring"), verdict: $("verdict"), tryAgainBtn: $("tryAgainBtn"),
  subtitle: $("subtitle"),
  modal: $("welcomeModal"), stepName: $("stepName"), stepWelcome: $("stepWelcome"),
  nameForm: $("nameForm"), nameInput: $("nameInput"), nameError: $("nameError"),
  welcomeTitle: $("welcomeTitle"), startBtn: $("startBtn"), changeNameBtn: $("changeNameBtn")
};

// Everything that changes during a test lives here
const state = {
  duration: 30,      // seconds (30 or 60)
  running: false,    // true after the first keystroke, until time is up
  finished: false,   // true once the timer reaches zero
  endTime: 0,        // performance.now() value when the test ends
  startTime: 0,
  timerId: null,
  passage: "",       // full passage text (grows if the user types fast)
  chars: [],         // one <span> per passage character
  lastValue: "",     // previous textarea value
  userName: ""
};

/* ---------- 2) Pure calculations ---------- */

/**
 * Compares what was typed with the passage, character by character.
 * WPM      = correct characters ÷ 5 ÷ minutes
 * Accuracy = correct characters ÷ total characters typed × 100
 */
function calculateStats(passage, typed, minutes) {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === passage[i]) correct++;
  }
  const total = typed.length;
  return {
    correct,
    total,
    incorrect: total - correct,
    wpm: minutes > 0 ? correct / 5 / minutes : 0,
    accuracy: total > 0 ? (correct / total) * 100 : 0
  };
}

/* ---------- 3) Passage rendering ---------- */

// Returns a different practice paragraph every time (no repeats until all have been used)
function nextParagraph() {
  if (paragraphBag.length === 0) {
    paragraphBag = PARAGRAPHS.map((_, i) => i);
    for (let i = paragraphBag.length - 1; i > 0; i--) {      // Fisher-Yates shuffle
      const j = Math.floor(Math.random() * (i + 1));
      [paragraphBag[i], paragraphBag[j]] = [paragraphBag[j], paragraphBag[i]];
    }
    // Make sure the new round does not start with the paragraph just used
    if (paragraphBag[paragraphBag.length - 1] === lastParagraph) {
      paragraphBag.unshift(paragraphBag.pop());
    }
  }
  lastParagraph = paragraphBag.pop();
  return PARAGRAPHS[lastParagraph];
}

// Adds text to the passage, wrapping every character in its own <span>
function appendPassage(text) {
  state.passage += text;
  for (const ch of text) {
    const span = document.createElement("span");
    span.textContent = ch;
    els.passage.appendChild(span);
    state.chars.push(span);
  }
}

// If the user is close to the end of the passage, add more text
function ensurePassageLength(typedLength) {
  if (typedLength > state.passage.length - 150) appendPassage(" " + nextParagraph());
}

// Colors each character: correct / incorrect / current / not typed yet
function updateDisplay(typed) {
  for (let i = 0; i < state.chars.length; i++) {
    const el = state.chars[i];
    if (i < typed.length) {
      el.className = typed[i] === state.passage[i] ? "correct" : "incorrect";
    } else {
      el.className = i === typed.length ? "current" : "";
    }
  }
  // Scroll the passage so the current line stays visible
  const current = state.chars[typed.length];
  if (current) {
    const lineHeight = parseFloat(getComputedStyle(els.passage).lineHeight) || 30;
    els.passage.scrollTop = Math.max(0, current.offsetTop - 20 - lineHeight);
  }
}

/* ---------- 4) Timer & test flow ---------- */

// Called on the user's first keystroke
function startTest() {
  state.running = true;
  state.startTime = performance.now();
  state.endTime = state.startTime + state.duration * 1000;
  els.durationBtns.forEach((b) => (b.disabled = true));   // lock duration while running
  state.timerId = setInterval(tick, 100);
}

// Runs every 100 ms while the test is running
function tick() {
  const now = performance.now();
  const remainingMs = Math.max(0, state.endTime - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  els.timeLeft.textContent = remainingSec;
  setProgress(1 - remainingMs / (state.duration * 1000));
  els.progressFill.classList.toggle("low", remainingSec <= 5);
  updateLiveStats(now);

  if (remainingMs <= 0) finishTest();
}

function setProgress(fraction) {
  const pct = Math.min(100, Math.max(0, fraction * 100));
  els.progressFill.style.width = pct + "%";
  els.progress.setAttribute("aria-valuenow", Math.round(pct));
}

// Live WPM / accuracy shown while typing
function updateLiveStats(now) {
  if (!state.running) return;
  const elapsedMs = Math.max(now - state.startTime, 1000);   // avoid huge numbers in the first second
  const s = calculateStats(state.passage, els.input.value, elapsedMs / 60000);
  els.liveWpm.textContent = Math.round(s.wpm);
  els.liveAccuracy.textContent = s.total ? Math.round(s.accuracy) + "%" : "–";
}

// Runs when the timer reaches zero
function finishTest() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.running = false;
  state.finished = true;
  els.input.disabled = true;
  els.timeLeft.textContent = "0";
  setProgress(1);

  // Final stats use the full test length as the time
  const stats = calculateStats(state.passage, els.input.value, state.duration / 60);
  els.liveWpm.textContent = Math.round(stats.wpm);
  els.liveAccuracy.textContent = stats.total ? Math.round(stats.accuracy) + "%" : "–";
  showResults(stats);
}

// Resets everything: timer, passage, input, live stats and results
function resetTest(focusInput = true) {
  clearInterval(state.timerId);
  state.timerId = null;
  state.running = false;
  state.finished = false;
  state.lastValue = "";

  els.input.value = "";
  els.input.disabled = false;
  els.results.hidden = true;

  els.timeLeft.textContent = state.duration;
  els.liveWpm.textContent = "0";
  els.liveAccuracy.textContent = "–";
  els.progressFill.classList.remove("low");
  setProgress(0);
  els.durationBtns.forEach((b) => (b.disabled = false));

  // New paragraph for every test
  state.passage = "";
  state.chars = [];
  els.passage.innerHTML = "";
  appendPassage(nextParagraph());
  els.passage.scrollTop = 0;
  updateDisplay("");

  if (focusInput) els.input.focus();
}

// Choose 30 or 60 seconds (only allowed while the test is not running)
function setDuration(seconds) {
  if (state.running) return;
  state.duration = seconds;
  els.durationBtns.forEach((b) =>
    b.setAttribute("aria-pressed", String(Number(b.dataset.duration) === seconds)));
  resetTest();
}

// Handles every change in the typing box
function handleInput() {
  if (state.finished) return;

  // Enter is not part of the passage – remove line breaks
  const value = els.input.value.replace(/\n/g, "");
  if (value !== els.input.value) els.input.value = value;

  if (!state.running) {
    if (value.length === 0) return;
    startTest();                                          // timer starts on first keystroke
  } else if (performance.now() >= state.endTime) {
    els.input.value = state.lastValue;                    // ignore keystrokes after time is up
    finishTest();
    return;
  }

  state.lastValue = value;
  ensurePassageLength(value.length);
  updateDisplay(value);
  updateLiveStats(performance.now());
}

/* ---------- 5) Results ---------- */

// Smoothly counts a number from 0 up to a target value
function countUp(target, decimals, render) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { render(target); return; }
  const startedAt = performance.now();
  const length = 800;
  (function frame(now) {
    const t = Math.min(1, (now - startedAt) / length);
    const eased = 1 - Math.pow(1 - t, 3);
    render(Number((target * eased).toFixed(decimals)));
    if (t < 1) requestAnimationFrame(frame);
  })(startedAt);
}

function verdictFor(wpm) {
  if (wpm < 20) return "A good start. Keep practising.";
  if (wpm < 40) return "A steady pace. You're getting there.";
  if (wpm < 60) return "Solid speed, above the average typist.";
  if (wpm < 80) return "Fast typing. Impressive work.";
  return "Elite speed. Outstanding.";
}

function showResults(stats) {
  const wpm = Math.round(stats.wpm);
  const accuracy = Math.round(stats.accuracy * 10) / 10;

  els.resCorrect.textContent = stats.correct;
  els.resIncorrect.textContent = stats.incorrect;
  els.resTotal.textContent = stats.total;
  els.resDuration.textContent = state.duration + "s";
  els.verdict.textContent = (state.userName ? state.userName + ", " : "") +
    verdictFor(wpm).charAt(0).toLowerCase() + verdictFor(wpm).slice(1);

  els.results.hidden = false;
  countUp(wpm, 0, (v) => (els.resWpm.textContent = v));
  countUp(accuracy, 1, (v) => {
    els.resAccuracy.textContent = v + "%";
    els.ring.style.setProperty("--pct", v);
  });
  els.results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  els.tryAgainBtn.focus({ preventScroll: true });
}

/* ---------- 6) Welcome pop-up ---------- */

// Browser storage can be blocked, so every access is wrapped in try/catch
function loadName() {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch (e) { return ""; }
}
function saveName(name) {
  try { localStorage.setItem(STORAGE_KEY, name); } catch (e) { /* ignore */ }
}

function showNameStep() {
  els.stepName.hidden = false;
  els.stepWelcome.hidden = true;
  els.nameInput.value = state.userName;
  els.nameInput.focus();
}

function showWelcomeStep() {
  els.stepName.hidden = true;
  els.stepWelcome.hidden = false;
  els.welcomeTitle.textContent = "Welcome, " + state.userName + "!";   // textContent keeps it safe
  els.startBtn.focus();
}

function closeModal() {
  els.modal.hidden = true;
  document.body.classList.remove("modal-open");
  els.subtitle.textContent = state.userName + ", start typing the passage below. The timer begins with your first keystroke.";
  els.input.focus();
}

function handleNameSubmit(event) {
  event.preventDefault();
  const name = els.nameInput.value.trim().replace(/\s+/g, " ");
  if (!name) {                                    // empty name: show an error
    els.nameError.hidden = false;
    els.nameInput.classList.add("invalid");
    els.nameInput.focus();
    return;
  }
  els.nameError.hidden = true;
  els.nameInput.classList.remove("invalid");
  state.userName = name;
  saveName(name);
  showWelcomeStep();
}

/* ---------- 7) Event listeners & start-up ---------- */

els.input.addEventListener("input", handleInput);
els.input.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });
// Pasting or dropping text would be cheating
["paste", "drop"].forEach((type) => els.input.addEventListener(type, (e) => e.preventDefault()));

els.passage.addEventListener("click", () => els.input.focus());   // clicking the passage focuses the typing box
els.restartBtn.addEventListener("click", () => resetTest());
els.tryAgainBtn.addEventListener("click", () => { resetTest(); window.scrollTo({ top: 0, behavior: "smooth" }); });
els.durationBtns.forEach((b) => b.addEventListener("click", () => setDuration(Number(b.dataset.duration))));

els.nameForm.addEventListener("submit", handleNameSubmit);
els.nameInput.addEventListener("input", () => {
  els.nameError.hidden = true;
  els.nameInput.classList.remove("invalid");
});
els.startBtn.addEventListener("click", closeModal);
els.changeNameBtn.addEventListener("click", showNameStep);

// Esc restarts the test (ignored while the welcome pop-up is open)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && els.modal.hidden) resetTest();
});

// Start-up: prepare the test, then open the welcome pop-up
resetTest(false);
state.userName = loadName();
document.body.classList.add("modal-open");
if (state.userName) showWelcomeStep(); else showNameStep();