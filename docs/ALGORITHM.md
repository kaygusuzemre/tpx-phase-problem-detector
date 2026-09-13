# Measurement method

## Correlation

The detector calculates normalized covariance between the left and right channels. The overall value uses the full decoded signal. The timeline repeats the calculation in short windows, targeting approximately 260 measurements per file with a minimum window length of 50 ms.

- `+1`: channels move together
- `0`: no consistent linear relationship
- `-1`: channels move in opposite directions

The UI labels a frame as risky below `-0.10`. That threshold is a practical review cue, not a standard or a guarantee of audible cancellation.

## Mono retention

For each stereo sample pair, the detector creates a mono sample:

```text
mono = (left + right) / 2
```

It compares the root energy of that mono signal with the mean stereo-channel energy. Lower values indicate more destructive summing. The result is intentionally shown as a relative diagnostic percentage rather than loudness in LUFS or dB.

## Mid/side energy

The detector derives energy-preserving mid and side components:

```text
mid  = (left + right) / sqrt(2)
side = (left - right) / sqrt(2)
```

Side energy is reported as a percentage of total mid-plus-side energy. It describes width energy; it does not determine whether the mix is good or bad.

## Known limits

- Time-domain correlation can miss frequency-localized problems.
- Lossy decoding behavior varies by browser.
- Silence and near-silence can make correlation less meaningful.
- The tool does not replace listening on mono and representative playback systems.
