# Test Suite Conventions

Tests use Node's built-in `node:test` runner and strict assertions from `node:assert/strict`.

- Name files `<subject>.test.js` and keep them directly under `tests/` until a domain has enough suites to justify a subdirectory.
- Prefer `test()` for individual behavior. Use `describe()` only when shared setup or a meaningful behavioral grouping improves readability.
- Keep tests deterministic: inject time, randomness, network responses, and storage rather than relying on live services or ambient state.
- Restore modified globals in cleanup hooks. Never call `process.exit()` from a test.
- Tests must not write tracked artifacts. Put opt-in diagnostic exporters in `scripts/` and direct generated output to a temporary or explicitly supplied path.
- Reuse representative fixtures from `tests/fixtures/` or helpers from `tests/support/` instead of copying large setup objects.
- Assert observable behavior and invariants. Do not loosen a tolerance merely to hide a simulation regression.

Run all suites with `npm test`. Use Node's name filter while iterating, for example:

```sh
npm test -- --test-name-pattern="route cache"
```

The test-only loader in `tests/support/` lets Node consume the same JSON modules that Vite loads in production. Application code must not depend on this loader.
