# TPX Phase Problem Detector

A privacy-first, browser-based stereo phase and mono-compatibility analyzer for musicians, mix engineers and audio-tool developers.

The tool decodes audio locally with the Web Audio API. It does not upload, store or transmit the selected audio file.

## What it measures

- Overall left/right correlation from `-1` to `+1`
- Short-window correlation over time
- Percentage of frames below `-0.10` correlation
- Mono fold-down energy retention
- Mid/side energy balance
- Timestamp and value of the lowest-correlation frame

These measurements are diagnostic evidence, not an automatic artistic verdict. A wide or negative reading can be intentional; always confirm with monitoring and a mono audition.

## Run locally

```bash
npm run serve
```

Then open `http://localhost:4173`.

## Test

```bash
npm test
```

The analyzer has no runtime dependencies. Its pure measurement functions live in `dist/phase-engine.js` and are covered by Node's built-in test runner.

## Privacy

All decoding and analysis happen in the browser process. The application has no upload endpoint and no analytics dependency.

## Project status

This is an early public release. The current scope is time-domain stereo correlation and mono fold-down diagnostics. Frequency-band analysis and reproducible fixture files are candidates for future releases and should not be treated as implemented yet.

## Contributing

Bug reports, reproducible audio fixtures that can be redistributed, accessibility improvements and measurement-validation contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © 2026 Emre Kaygusuz / TwinphaseX
