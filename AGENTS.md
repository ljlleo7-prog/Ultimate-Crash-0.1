# Repository Guidelines

## Project Structure & Module Organization

The Vite/React application lives in `src/`. Place UI in `src/components/`, shared state in `src/contexts/`, reusable behavior in `src/hooks/`, simulation logic in `src/services/`, and helpers in `src/utils/`. Aircraft and configuration data belongs under `src/data/` and `src/config/`; translations are in `src/locales/`. Static assets go in `public/`. Node tests are in `tests/`. Scripts live in `scripts/`, while database functions and migrations live in `supabase/`. Treat `AIP_DATA/` as source aviation data and `dist/` as generated output.

## Build, Test, and Development Commands

- `npm ci` installs the locked dependency set.
- `npm run dev` starts Vite at `http://localhost:3000`.
- `npm run build` creates the production bundle in `dist/`.
- `npm run build:local-aip` stages local AIP assets, builds, then cleans staged files; this is the deployment build.
- `npm run preview` serves the production bundle locally.
- `npm test` runs all `node:test` suites.
- `npm run lint` checks JavaScript and JSX with ESLint and rejects warnings.
- `npm run test:aip-route-search` runs the focused AIP route-search smoke test.

## Coding Style & Naming Conventions

Use ES modules and follow the existing two-space indentation in application code. Keep React components and their files in PascalCase (`FlightInitialization.jsx`), hooks in camelCase prefixed with `use`, and services/utilities in descriptive camelCase or established PascalCase class names. Keep CSS beside its component when styling is component-specific. ESLint configuration is in `.eslintrc.cjs`; run lint before submitting. Avoid broad formatting-only changes in files touched for functional work.

## Testing Guidelines

Tests use Node's built-in `node:test` and strict assertions. Add files as `tests/<feature>.test.js`, mirroring the service or behavior under test. Cover normal operation, boundary states, and failure paths—especially for flight physics, autopilot, routing, and persistence. Run `npm test` and any relevant smoke script before opening a pull request. No numeric coverage threshold is configured; prioritize meaningful regression tests.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative summaries such as `Improve 737 overhead preview authenticity`; release commits use `vX.Y.Z` followed by a short description. Keep each commit focused. Pull requests should explain user-visible behavior, identify affected aircraft or systems, list verification commands, and link related issues. Include screenshots or short recordings for cockpit/UI changes and call out schema migrations, new environment variables, or large AIP-data updates.

## Security & Configuration

Never commit `.env`, API keys, or Supabase secrets. Review generated datasets and migration files before committing, and do not hand-edit `dist/`.
