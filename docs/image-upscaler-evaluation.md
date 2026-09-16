# Image Upscaler beta evaluation — 2026-09-16

## Decision

Ship a conservative 2× beta for small photos. No 4×/8× modes, backend, paid API, or automatic resizing of oversized input. Keep 512px per-edge / 5 MB limits until physical-phone QA establishes a higher safe limit. Enhancement estimates detail; the UI asks users to compare results and explains possible changes to faces/textures/lettering.

## Runtime and transfer budget

- UpscalerJS 1.0.0, with its declared TensorFlow.js peer version 4.11.0.
- ESRGAN Slim 2× 1.0.0: 888,300 bytes of weights + 12,336-byte manifest = 900,636 bytes. Checked the published npm tarball, not just a marketing size.
- TensorFlow minified bundle: 1,464,064 bytes; WASM loader: 149,825 bytes; SIMD binary: 424,594 bytes (non-SIMD alternative 311,123 bytes). Including the small Upscaler bundle, first-use assets total roughly 3 MB before HTTP compression/cache. Packages load only on the export action.
- One single-thread WASM worker per job. Avoids dependence on mobile GPU texture precision. 32px patches plus 4px padding. Worker termination owns cancellation and releases the entire runtime; 180-second watchdog. No plain-JS CPU fallback.
- Pre-decode PNG/JPEG/WebP dimension inspection rejects oversized images before allocating their decoded bitmap. Decoded dimensions are checked again. Source at most 262,144 pixels; output at most 1,048,576 pixels. RGBA output alone is 4 MiB. This is NOT a measurement or guarantee of total browser/engine peak memory.
- PNG exports are opaque. Transparent input is composited onto white; animation is frozen to one frame, with matching original/comparison previews. Both limitations are disclosed.

## Verification

- Syntax checks and compressed-dimension tests, including malformed/truncated files and real PNG, JPEG, lossy/lossless WebP fixtures.
- Live desktop cloud browser: 256×144 JPEG → 512×288 PNG (0.12 MB); decoded result dimensions checked.
- Live maximum accepted input: 512×512 PNG → 1024×1024 PNG (0.40 MB). Result was complete at the check approximately 12 seconds after initiating the action. This is an upper bound including automation overhead, not a precise benchmark or a phone timing prediction.
- 513×100 PNG rejected with clear size message before processing.
- Cancel returned immediately to editable state and removed the previous download. A subsequent export succeeded.
- Model-package flower fixture 128×128 → 256×256: visually inspected side-by-side; edges look slightly cleaner, without promising recovered original detail. This is a sample, not broad perceptual-quality evaluation.
- Switching ES→EN preserved the completed image and download link.
- Desktop layout inspected by screenshot.

## Remaining release limitations

Physical iPhone/Android performance, peak memory, long-session thermal behavior, final download delivery to disk, and broad image-quality evaluation remain unverified. Keep the beta label and current limits. Do not represent this as a general photo-restoration or face-recovery tool.

## Primary references

- https://upscalerjs.com/models/available/upscaling/esrgan-slim/
- https://upscalerjs.com/documentation/guides/browser/performance/patch-sizes/
- https://upscalerjs.com/documentation/guides/browser/performance/webworker/
- https://upscalerjs.com/documentation/api/execute/
- https://www.tensorflow.org/js/guide/platform_environment

The 1.0.0 npm package's UMD model layout differs from the script-tag example in the website docs. The implementation uses the version-pinned model manifest directly with its verified 0–255 input/output range.
