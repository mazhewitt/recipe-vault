## Context

The recipe-vault application has a Rust backend with vanilla JavaScript frontend (`static/app.js`). Current testing consists of:
- Rust integration tests (`tests/*.rs`) using `tower::oneshot` for API-level testing
- Manual browser testing via Docker (`./restart_docker.sh` → browser → manual verification)

Pain points discovered:
1. JS syntax errors reached production (caught only in browser console)
2. Manual GUI testing cycle is slow (full Docker rebuild per iteration)
3. No automated verification of browser ↔ backend interactions

The application uses SSE (Server-Sent Events) for chat streaming. We have captured real LLM responses in `test_fixtures/llm_responses/` that document the exact SSE protocol.

## Goals / Non-Goals

**Goals:**
- Catch JS syntax errors before they reach the browser (pre-commit + CI)
- Automate the manual GUI test flows: recipe navigation, recipe display, chat interactions
- Enable testing without LLM token consumption via mock provider
- Fast local development loop (`cargo run` instead of Docker rebuild)

**Non-Goals:**
- TypeScript migration (vanilla JS with linting is sufficient for now)
- Visual regression testing (screenshots, pixel comparisons)
- Full LLM behavior testing (mock provides predictable responses, not AI quality)
- Performance/load testing

## Decisions

### Decision 1: ESLint over alternatives for JS linting

**Choice**: ESLint with minimal syntax-focused config

**Alternatives considered**:
- `node --check`: Only catches parse errors, misses common issues
- Biome: Faster but less mature ecosystem
- TypeScript `checkJs`: Heavier, pulls toward TS migration we don't want now

**Rationale**: ESLint is battle-tested, has excellent CI integration, and can be configured minimally to catch what bit us (syntax errors) without imposing a heavy style guide.

### Decision 2: Playwright over alternatives for browser testing

**Choice**: Playwright

**Alternatives considered**:
- Cypress: Good DX but heavier, slower, more opinionated
- Puppeteer: Chrome-only, lower-level API
- Selenium: Older, more verbose, slower

**Rationale**: Playwright offers excellent cross-browser support, fast execution, native async/await, and handles SSE streams well. Good CI support via `npx playwright install --with-deps`.

### Decision 3: Mock at LlmProvider level via enum variant

**Choice**: Add `LlmProviderType::Mock` variant, controlled by `mock_llm` field in `Config` struct

**Alternatives considered**:
- HTTP-level mocking (wiremock): Complex response shaping for SSE
- Separate mock endpoint (`/api/chat/mock`): Two code paths to maintain
- Full trait abstraction: Over-engineered for this use case
- Check `MOCK_LLM` env var directly in chat handler: Scatters env var logic, harder to test

**Rationale**: Adding a `Mock` variant is minimal code change, keeps the same code path, and can pattern-match on input to return captured responses. Adding `mock_llm: bool` to the `Config` struct centralizes environment variable parsing and makes the code more testable. The chat handler reads from config rather than checking env vars directly.

### Decision 3b: Mock recipe_id via configuration, not database access

**Choice**: Pass `mock_recipe_id` to mock provider via config or test setup, not by querying database

**Alternatives considered**:
- Mock queries database for first recipe: Creates tight coupling, mock depends on db pool
- Hardcode a UUID: Breaks if that recipe doesn't exist

**Rationale**: Keep mock decoupled from database. Tests seed a recipe first, then pass its ID to the mock config (e.g., `MOCK_RECIPE_ID` env var or config field). This makes the mock self-contained and predictable.

### Decision 4: Isolated Node.js tooling in tests/e2e/

**Choice**: Keep `package.json` in `tests/e2e/` directory, not project root

**Rationale**: Keeps the Rust project clean, avoids confusion about project type, makes it clear these are dev-only test tools. CI can `cd tests/e2e && npm ci` explicitly.

### Decision 5: Test data strategy

**Choice**: Tests seed their own data via API calls at test start

**Rationale**: Tests should be self-contained and not depend on existing database state. Each test (or test suite) creates the recipes it needs, runs assertions, and can optionally clean up. The API already supports CRUD operations.

## Risks / Trade-offs

**[Risk] Mock responses drift from real LLM behavior** → Periodically re-capture responses with `capture_llm_responses.sh`. Mock is for UI mechanics, not AI quality testing.

**[Risk] Playwright tests are flaky due to timing** → Use Playwright's built-in auto-waiting. Avoid arbitrary `sleep()` calls. Test against real backend, not mocked APIs.

**[Risk] Node.js adds complexity to CI** → Isolated to test phase. Rust build remains unchanged. Node setup is a standard GitHub Action.

**[Trade-off] Mock LLM limits test coverage** → Acceptable. We test UI mechanics with mock, run occasional real LLM tests manually or on release tags for end-to-end verification.

## Migration Plan

1. Add `tests/e2e/` with package.json, ESLint config, Playwright config
2. Add `LlmProviderType::Mock` to `src/ai/llm.rs`
3. Create initial Playwright tests covering navigation and display
4. Add CI workflow for lint + test
5. Add pre-commit hook for ESLint (optional, can be later)

No breaking changes. No data migration. Rollback is simply not using the new tests.

## Open Questions

1. **Pre-commit hook mechanism**: Use husky (Node.js) or a shell script? Leaning toward shell script to avoid another Node dependency in git hooks.
2. **CI parallelization**: Run Playwright tests in parallel with Rust tests, or sequential? Probably parallel since they're independent.
