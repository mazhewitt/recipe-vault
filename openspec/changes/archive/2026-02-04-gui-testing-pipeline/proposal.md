## Why

JS syntax errors are slipping through to production (discovered only via browser console during manual testing). Additionally, GUI functional testing is entirely manual—navigating recipes, testing chat interactions, verifying scroll behavior—which is time-consuming and error-prone. We need automated checks that catch issues early and run in CI.

## What Changes

- **Add ESLint for JavaScript static analysis**: Catch syntax errors and common issues in `static/app.js` before they reach the browser. Runs as pre-commit hook and in CI.
- **Add Playwright browser testing**: Automated E2E tests covering recipe navigation, recipe display (including scroll), and chat UI interactions.
- **Add mock LLM provider**: Enable browser tests to run without consuming API tokens by adding a `Mock` variant to `LlmProviderType` that returns canned responses based on input patterns.
- **Update CI pipeline**: Add test jobs for ESLint and Playwright alongside existing Docker build.

## Capabilities

### New Capabilities

- `js-linting`: ESLint configuration for static analysis of frontend JavaScript. Catches syntax errors and common issues before runtime.
- `browser-testing`: Playwright test infrastructure for automated E2E browser tests. Covers recipe navigation, display rendering, scroll behavior, and chat UI mechanics.
- `llm-mocking`: Mock LLM provider that returns predictable SSE responses for testing. Pattern-matches on input to return appropriate canned responses (list recipes, display recipe).

### Modified Capabilities

None. This change adds new testing infrastructure without modifying requirements for existing capabilities.

## Impact

- **New dependencies**: Node.js dev tooling (`eslint`, `playwright`) isolated to `tests/e2e/package.json`
- **New files**:
  - `tests/e2e/` directory with Playwright config and test specs
  - ESLint configuration
- **Code changes**:
  - `src/ai/llm.rs`: Add `Mock` variant to `LlmProviderType` with canned response logic
  - `src/handlers/chat.rs`: Respect mock mode via environment variable
- **CI changes**: New GitHub Actions workflow or jobs for lint + browser tests
- **Test fixtures**: `test_fixtures/llm_responses/` contains captured real LLM responses as basis for mocks
