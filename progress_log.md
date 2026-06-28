# Project Progress Log - "Jus Breathe" (Monorepo)

## Current Active Chunk/Task
* **Active Chunk**: All Chunks Completed & Verified
* **Status**: Complete production-ready implementation, including PWA configurations, local dev server tests, and unit verification. Ready for deploy.

---

## Progress Checklist

### Chunk 1: Monorepo Setup & Core Domain Contracts (`@jus-breathe/core`)
* [x] Create root `package.json` with npm workspaces (`packages/core`, `packages/web`)
* [x] Create `packages/core/package.json` and compiler settings
* [x] Create `packages/core/src/domain/entities.ts` (Types for Preset, Stage, SessionLog, StreakState)
* [x] Create `packages/core/src/domain/presets.ts` (Default Presets config: Box, 4-7-8, Wim Hof, TM)
* [x] Create `packages/core/src/domain/repositories.ts` (Interfaces for UserRepository, PresetRepository, SessionRepository)
* [x] Add unit verification test suite for domain defaults
* *Verification Status*: Passed (Vitest: 3 tests passed)

### Chunk 2: Business Use Cases & Engine (`@jus-breathe/core`)
* [x] Create `packages/core/src/usecases/timerStateMachine.ts` (Handles countdowns, counts up, repetitions, and states)
* [x] Create `packages/core/src/usecases/streakCalculator.ts` (Calculates streaks per preset and combined, average breathing times)
* [x] Add Vitest tests for use-cases
* *Verification Status*: Passed (Vitest: 13 tests passed, Total 16 core tests passed)

### Chunk 3: Web Audio Synthesizer & Speech Adapters (`@jus-breathe/web`)
* [x] Create `packages/web/src/infrastructure/audio/WebAudioService.ts` (Woodblock/Click/Heartbeat ticks, bowl/chime/gong, ambient waves/rain/drone with DynamicsCompressorNode)
* [x] Create `packages/web/src/infrastructure/audio/SpeechService.ts` (TTS transition announcer)
* *Verification Status*: Passed (Manual sound synthesis and compilation checks complete)

### Chunk 4: UI Shell & Central Pulsating Visualizer (`@jus-breathe/web`)
* [x] Create `packages/web/public/timerWorker.js` (Web Worker for non-throttled background ticking)
* [x] Create `packages/web/src/presentation/components/Visualizer.tsx` (Breathing circle, timer overlays, color-coded themes)
* [x] Create `packages/web/src/presentation/App.css` (Glassmorphism layout, light/dark styling, animations)
* *Verification Status*: Passed (React component boots cleanly, local dev server running)

### Chunk 5: Preset Editor & Calendar Stats Dashboard (`@jus-breathe/web`)
* [x] Create `packages/web/src/presentation/components/PresetEditor.tsx` (Visual horizontal timeline modifier)
* [x] Create `packages/web/src/presentation/components/Dashboard.tsx` (Streak rings, calendar grid with glowing dots, statistics display)
* *Verification Status*: Passed (Preset editor reordering, calendar dot filters, and statistics components tested)

### Chunk 6: Repository Adapter Integrations (`@jus-breathe/web`)
* [x] Create `packages/web/src/infrastructure/db/LocalStorageRepo.ts` (Local fallback storage)
* [x] Create `packages/web/src/infrastructure/db/SupabaseRepo.ts` (Bundled PostgreSQL client database adapter)
* [x] Implement API key verification guard to avoid crash if environment keys are placeholders
* [x] Implement schema validation guard to reject corrupt data on cloud sync loads
* *Verification Status*: Passed (Dynamic key verification verified. Fallback to LocalStorage validated)

### Chunk 7: PWA Config & Final Verification
* [x] Create PWA configuration (`packages/web/public/manifest.json`, `packages/web/public/sw.js` with update detector banner, and bundler assets)
* [x] Run final production builds and validation
* *Verification Status*: Passed (Local PWA configuration registers correctly)

---

## Local State & Context Notes
* **Project Type**: Monorepo with npm workspaces.
  * `@jus-breathe/core` (Domain model & business logic engine)
  * `@jus-breathe/web` (React UI presentation and web-specific infrastructure)
* **Styling Choice**: Vanilla CSS for smooth graphic rendering.
* **Local Server**: Running on `http://localhost:3000`.
* **Git Repository Target**: `https://github.com/TaVlala/Just-Breathe.git`
* **Key Risks Mitigated**:
  1. Timer throttling: Web Worker in `@jus-breathe/web/public/timerWorker.js`.
  2. PWA Caching: Bundled npm packages instead of CDN scripts.
  3. API Config guard: API key check fallback inside web database adapter.
  4. iOS Compatibility: Deferred iOS-specific background audio/Bluetooth support. Standard safety checks are left in place (e.g. vibration wrappers) to prevent crash behavior.
  5. Audio Distortion: Mitigated via `DynamicsCompressorNode` limiter.
  6. iOS Vibrate crash: Mitigated via existence check guard.
  7. SW stale cache: Mitigated via service worker update listener and alert banner.
  8. Schema sync corruption: Mitigated via JSON structure guards on DB fetches.
* **Next Steps**:
  1. Present the completed codebase and dev server to the user.
  2. Perform initial Git commit and push to the remote repository.
