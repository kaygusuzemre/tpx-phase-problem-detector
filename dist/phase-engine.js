export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function correlation(left, right, start = 0, end = Math.min(left.length, right.length)) {
  const stop = Math.min(end, left.length, right.length);
  const count = stop - start;
  if (count <= 1) return 0;

  let sumL = 0;
  let sumR = 0;
  for (let i = start; i < stop; i += 1) {
    sumL += left[i];
    sumR += right[i];
  }
  const meanL = sumL / count;
  const meanR = sumR / count;

  let numerator = 0;
  let energyL = 0;
  let energyR = 0;
  for (let i = start; i < stop; i += 1) {
    const l = left[i] - meanL;
    const r = right[i] - meanR;
    numerator += l * r;
    energyL += l * l;
    energyR += r * r;
  }

  const denominator = Math.sqrt(energyL * energyR);
  return denominator > 1e-12 ? clamp(numerator / denominator, -1, 1) : 0;
}

export function formatTime(seconds) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function analyzeStereo(left, right, sampleRate, options = {}) {
  if (!left || !right || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error("Two audio channels and a valid sample rate are required.");
  }
  const length = Math.min(left.length, right.length);
  if (length < 32) throw new Error("The audio is too short to analyze.");

  const targetWindows = options.targetWindows ?? 260;
  const minWindowSeconds = options.minWindowSeconds ?? 0.05;
  const windowSize = Math.max(
    256,
    Math.floor(sampleRate * minWindowSeconds),
    Math.floor(length / targetWindows),
  );

  const frames = [];
  let totalLL = 0;
  let totalRR = 0;
  let totalLR = 0;
  let monoEnergy = 0;
  let midEnergy = 0;
  let sideEnergy = 0;

  for (let start = 0; start < length; start += windowSize) {
    const end = Math.min(start + windowSize, length);
    frames.push({
      time: (start + (end - start) / 2) / sampleRate,
      value: correlation(left, right, start, end),
    });
    for (let i = start; i < end; i += 1) {
      const l = left[i];
      const r = right[i];
      const mono = (l + r) * 0.5;
      const mid = (l + r) / Math.SQRT2;
      const side = (l - r) / Math.SQRT2;
      totalLL += l * l;
      totalRR += r * r;
      totalLR += l * r;
      monoEnergy += mono * mono;
      midEnergy += mid * mid;
      sideEnergy += side * side;
    }
  }

  const denominator = Math.sqrt(totalLL * totalRR);
  const overallCorrelation = denominator > 1e-12 ? clamp(totalLR / denominator, -1, 1) : 0;
  const stereoMeanEnergy = (totalLL + totalRR) * 0.5;
  const monoRetention = stereoMeanEnergy > 1e-12 ? clamp(Math.sqrt(monoEnergy / stereoMeanEnergy), 0, 2) : 0;
  const totalMsEnergy = midEnergy + sideEnergy;
  const sideRatio = totalMsEnergy > 1e-12 ? sideEnergy / totalMsEnergy : 0;
  const riskyFrames = frames.filter((frame) => frame.value < -0.1);
  const hotspot = frames.reduce((lowest, frame) => frame.value < lowest.value ? frame : lowest, frames[0]);

  return {
    duration: length / sampleRate,
    frames,
    overallCorrelation,
    riskyFrameRatio: riskyFrames.length / frames.length,
    monoRetention,
    sideRatio,
    hotspot,
  };
}

export function classify(result) {
  if (result.overallCorrelation < 0 || result.riskyFrameRatio >= 0.2 || result.monoRetention < 0.65) {
    return {
      level: "danger",
      label: "High cancellation risk",
      text: "The mix contains sustained anti-phase energy or a large mono level loss. Inspect the highlighted low-correlation section before changing the whole stereo image.",
    };
  }
  if (result.overallCorrelation < 0.25 || result.riskyFrameRatio >= 0.05 || result.monoRetention < 0.82) {
    return {
      level: "caution",
      label: "Check in mono",
      text: "The mix is mostly coherent, but some sections may thin out in mono. Audition the lowest point and check wide effects or polarity-sensitive layers there.",
    };
  }
  return {
    level: "good",
    label: "Mostly coherent",
    text: "No strong cancellation pattern was measured. The stereo image still deserves a musical mono check, especially after encoding or playback-system processing.",
  };
}
