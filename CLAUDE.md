# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For any testing, you MUST add an auto-terminate command at the end of each test file and each test bash after each test is finished to avoid the test bash to run on forever even if test is already finished within a few seconds.

Entering plan mode REQUIRES PERMISSION.

## Commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`
- Preview production build: `npm run preview`
- Lint source: `npm run lint`
- Run all tests: `npm test`
- Run one test file: `node --test tests/autopilot.test.js`
- Run one named test: `node --test --test-name-pattern="pattern" tests/autopilot.test.js`

## Content / data pipeline commands

These scripts support the failure-graph, narrative, and ATC content pipeline outside the main React app:

- Generate failure descriptions: `npm run generate:failure-descriptions`
- Update failure graph proposals: `npm run update:failure-graph`
- Apply approved failure graph updates: `npm run apply:failure-graph`
- Fetch authoritative source data: `npm run fetch:authoritative-sources`
- Process the failure graph: `npm run process:failure-graph`
- Build the full failure pipeline: `npm run build:failure-pipeline`
- Generate narratives: `npm run generate:narratives`
- Build ATC phraseology data: `npm run build:atc-phraseology`

## Environment and deployment

- Dev server runs on port `3000` (`vite.config.js`).
- Supabase integration uses `.env` values such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Some generation scripts expect local Ollama and/or Supabase access.
- GitHub Pages deployment is defined in `.github/workflows/deploy.yml`; pushes to `main` run `npm ci` and `npm run build`, then publish `dist/`.

## High-level architecture

This is a Vite + React single-page app, but the important architecture is not component routing. The app is organized around a React setup flow that hands control to an imperative simulation engine.

### Runtime mental model

- `src/main.js` mounts `src/App.jsx`.
- `src/App.jsx` is the top-level orchestrator for app mode and flight setup. It owns high-level state such as route, aircraft, payload/fuel, weather, difficulty, failure type, and tutorial/dev-mode entry.
- `src/components/FlightInProgress.jsx` is the main integration hub once a flight starts. It converts setup state into an `aircraftConfig`, computes spawn position from runway geometry, wires ATC/NPC/weather/tutorial systems together, and controls when simulation motion is frozen or released.
- `src/hooks/useAircraftPhysics.js` is the React-to-engine adapter. It loads aircraft data, creates `RealisticFlightPhysicsService`, applies initial conditions/runway context, runs the update loop, and exposes the imperative control API back to React.
- `src/services/RealisticFlightPhysicsService.js` is the simulation core and should be treated as the authoritative live aircraft state once the flight is running.

When debugging behavior, start with this chain:

`App.jsx` -> `FlightInProgress.jsx` -> `useAircraftPhysics.js` -> `RealisticFlightPhysicsService.js`

## Major subsystems

### Physics and simulation

- The core simulation is a custom 6-DOF physics engine using quaternion-based attitude handling.
- `RealisticFlightPhysicsService` owns aircraft motion, systems state, engines, environment, warnings, autopilot interactions, and failure effects.
- `EnginePhysicsService.js`, `Engine.js`, and `PropulsionManager.js` support propulsion/engine behavior.
- Ground handling and runway-aware spawning depend on airport geometry from `airportService`.

### Failure system

- The active modular failure implementation lives under `src/services/failures/`.
- `src/services/failures/FailureHandler.js` coordinates failure lifecycle/effects, and `src/services/failures/types/` contains failure definitions by subsystem.
- There is also an older `src/services/FailureSystem.js`; check whether a bug/feature belongs to the newer modular path before editing both.

### Weather, ATC, NPC, and phase control

- `src/services/weatherService.js` handles simulation weather updates.
- `src/services/RealWeatherService.js` is the real-weather integration entry point.
- `src/services/ATCLogic.js`, `src/services/NPCService.js`, `src/services/RegionControlService.js`, and `src/services/NPCCrewService.js` support the surrounding world and communications.
- `src/services/sceneManager.js` controls narrative/phase progression.
- Motion is intentionally frozen during some pre-takeoff phases until clearance/state conditions are met in `FlightInProgress.jsx`; if the aircraft is “stuck”, inspect scene/clearance state before changing physics.
- `src/services/eventBus.js` is used for cross-system communication such as alerts and narrative events.

### SkylineTragedy pipeline

- `src/services/skylinetragedy/` is a parallel subsystem for failure graph orchestration, cascades, and narrative generation.
- This area is closely tied to the offline scripts in `scripts/` that generate or refine failure/narrative data.
- Treat the interactive simulation loop and the SkylineTragedy data pipeline as related but distinct layers.

## Data layout

- `src/data/` contains the runtime databases: aircraft, airports, failure relationships/scenarios, and ATC/narrative support data.
- `src/config/weatherConfig.json` holds weather presets/config.
- `src/locales/` plus `src/contexts/LanguageContext.jsx` implement the English/Chinese i18n layer.
- `scripts/` contains engineering/data-generation tooling, not just tests. Many `test_*.js` files there are harnesses or analysis scripts rather than the main automated test suite.

## Tests

- The repository uses Node’s built-in test runner via `node --test`.
- Primary automated tests live in `tests/`, including `tests/autopilot.test.js` and `tests/failures.test.js`.
- There are also some colocated/component tests in `src/`, but `tests/` is the first place to check when validating behavior.

## Practical guidance for edits

- For flight-runtime issues, inspect `FlightInProgress.jsx` and `useAircraftPhysics.js` before changing low-level physics.
- For airport/runway spawn bugs, check both `FlightInProgress.jsx` and `src/services/airportService.js`.
- For failure behavior, verify whether the code path goes through `src/services/failures/FailureHandler.js`, the older `FailureSystem.js`, or the SkylineTragedy pipeline.
- For narrative or generated content changes, inspect both `src/services/skylinetragedy/` and the corresponding `scripts/` pipeline command before editing runtime code.
- The repository includes a hidden dev shortcut documented in project docs: `Ctrl+Shift+D` enters a fast-start dev mode from the main screen.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->