import { analyzeStereo, classify, clamp, formatTime } from "./phase-engine.js";

const fileInput = document.querySelector("#audio-file");
const dropZone = document.querySelector("#drop-zone");
const demoButton = document.querySelector("#demo-button");
const status = document.querySelector("#status");
const statusText = document.querySelector("#status-text");
const resultsPanel = document.querySelector("#results");
const chart = document.querySelector("#correlation-chart");

let audioContext;

function setStatus(message, kind = "ready") {
  statusText.textContent = message;
  status.className = `status ${kind === "ready" ? "" : kind}`.trim();
}

function getAudioContext() {
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

async function analyzeFile(file) {
  if (!file) return;
  setStatus(`Decoding ${file.name}…`, "working");
  demoButton.disabled = true;
  try {
    const data = await file.arrayBuffer();
    const buffer = await getAudioContext().decodeAudioData(data.slice(0));
    if (buffer.numberOfChannels < 2) {
      throw new Error("This file is mono. Choose a file with at least two channels.");
    }
    const result = analyzeStereo(
      buffer.getChannelData(0),
      buffer.getChannelData(1),
      buffer.sampleRate,
    );
    renderResult(result, file.name);
    setStatus(`Analyzed locally · ${buffer.sampleRate.toLocaleString()} Hz · ${buffer.numberOfChannels} channels`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "The file could not be analyzed.", "error");
  } finally {
    demoButton.disabled = false;
  }
}

function makeDemoSignal() {
  const sampleRate = 48000;
  const duration = 8;
  const length = sampleRate * duration;
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const time = i / sampleRate;
    const carrier = 0.54 * Math.sin(2 * Math.PI * 220 * time) + 0.18 * Math.sin(2 * Math.PI * 880 * time);
    const width = 0.12 * Math.sin(2 * Math.PI * 331 * time);
    left[i] = carrier + width;
    if (time < 3) right[i] = carrier - width * 0.35;
    else if (time < 5.3) right[i] = -carrier * 0.82 + width;
    else right[i] = carrier * 0.76 - width;
  }
  return { left, right, sampleRate };
}

function renderResult(result, name) {
  const verdict = classify(result);
  resultsPanel.classList.remove("is-empty");
  document.querySelector("#track-name").textContent = name;

  const verdictElement = document.querySelector("#verdict");
  verdictElement.textContent = verdict.label;
  verdictElement.className = `verdict ${verdict.level}`;

  document.querySelector("#correlation-value").textContent = signed(result.overallCorrelation, 2);
  document.querySelector("#meter-needle").style.left = `${clamp((result.overallCorrelation + 1) * 50, 0, 100)}%`;
  document.querySelector("#duration-label").textContent = formatTime(result.duration);
  document.querySelector("#risk-value").textContent = `${Math.round(result.riskyFrameRatio * 100)}%`;
  document.querySelector("#mono-value").textContent = `${Math.round(result.monoRetention * 100)}%`;
  document.querySelector("#side-value").textContent = `${Math.round(result.sideRatio * 100)}%`;
  document.querySelector("#hotspot-value").textContent = formatTime(result.hotspot.time);
  document.querySelector("#hotspot-detail").textContent = `${signed(result.hotspot.value, 2)} correlation`;
  document.querySelector("#interpretation-text").textContent = verdict.text;
  drawChart(result.frames, result.duration);
}

function signed(value, digits) {
  const rounded = value.toFixed(digits);
  return value > 0 ? `+${rounded}` : rounded;
}

function drawChart(frames, duration) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = chart.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width * ratio));
  const height = Math.floor(190 * ratio);
  chart.width = width;
  chart.height = height;
  const ctx = chart.getContext("2d");
  const padding = 12 * ratio;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const yFor = (value) => padding + ((1 - value) / 2) * chartHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = ratio;
  ctx.strokeStyle = "rgba(121, 170, 158, .18)";
  [-1, -0.1, 0, 1].forEach((value) => {
    ctx.beginPath();
    ctx.moveTo(padding, yFor(value));
    ctx.lineTo(width - padding, yFor(value));
    ctx.stroke();
  });

  const gradient = ctx.createLinearGradient(0, yFor(1), 0, yFor(-1));
  gradient.addColorStop(0, "#5ef2c2");
  gradient.addColorStop(0.53, "#ffd369");
  gradient.addColorStop(1, "#ff685f");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.2 * ratio;
  ctx.lineJoin = "round";
  ctx.beginPath();
  frames.forEach((frame, index) => {
    const x = padding + (duration > 0 ? frame.time / duration : index / Math.max(1, frames.length - 1)) * chartWidth;
    const y = yFor(frame.value);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

fileInput.addEventListener("change", () => analyzeFile(fileInput.files?.[0]));

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});
dropZone.addEventListener("drop", (event) => analyzeFile(event.dataTransfer?.files?.[0]));
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

demoButton.addEventListener("click", () => {
  setStatus("Generating and measuring a phase stress test…", "working");
  demoButton.disabled = true;
  window.setTimeout(() => {
    const demo = makeDemoSignal();
    renderResult(analyzeStereo(demo.left, demo.right, demo.sampleRate), "Browser-generated stress test");
    setStatus("Demo analyzed locally · no audio uploaded");
    demoButton.disabled = false;
  }, 120);
});

window.addEventListener("resize", () => {
  if (!resultsPanel.classList.contains("is-empty")) demoButton.focus({ preventScroll: true });
}, { passive: true });
