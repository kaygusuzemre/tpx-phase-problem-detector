import assert from "node:assert/strict";
import test from "node:test";
import { analyzeStereo, classify, correlation, formatTime } from "../dist/phase-engine.js";

function sine(length = 48000, frequency = 220, sampleRate = 48000) {
  return Float32Array.from({ length }, (_, i) => Math.sin(2 * Math.PI * frequency * i / sampleRate));
}

test("correlation distinguishes aligned and inverted channels", () => {
  const left = sine();
  const aligned = Float32Array.from(left);
  const inverted = Float32Array.from(left, (sample) => -sample);
  assert.ok(correlation(left, aligned) > 0.999);
  assert.ok(correlation(left, inverted) < -0.999);
});

test("aligned stereo retains mono energy", () => {
  const left = sine();
  const result = analyzeStereo(left, Float32Array.from(left), 48000);
  assert.ok(result.overallCorrelation > 0.999);
  assert.ok(result.monoRetention > 0.99);
  assert.equal(classify(result).level, "good");
});

test("inverted stereo is classified as high risk", () => {
  const left = sine();
  const right = Float32Array.from(left, (sample) => -sample);
  const result = analyzeStereo(left, right, 48000);
  assert.ok(result.overallCorrelation < -0.999);
  assert.ok(result.monoRetention < 0.001);
  assert.equal(classify(result).level, "danger");
});

test("time labels are stable", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(65.9), "1:05");
});
