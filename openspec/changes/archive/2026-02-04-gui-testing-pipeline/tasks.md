## 1. Test Infrastructure Setup

- [x] 1.1 Create `tests/e2e/` directory structure
- [x] 1.2 Create `tests/e2e/package.json` with ESLint and Playwright dependencies
- [x] 1.3 Create ESLint configuration (`eslint.config.js`) targeting `static/*.js`
- [x] 1.4 Create Playwright configuration (`playwright.config.ts`)
- [x] 1.5 Add npm scripts for `lint`, `lint:fix`, and `test`

## 2. Mock LLM Provider

- [x] 2.1 Add `mock_llm: bool` and `mock_recipe_id: Option<String>` fields to `Config` struct in `src/config.rs`
- [x] 2.2 Add `Mock` variant to `LlmProviderType` enum in `src/ai/llm.rs`
- [x] 2.3 Implement mock response logic for "list" pattern (returns list_recipes SSE)
- [x] 2.4 Implement mock response logic for "show/display" pattern (returns display_recipe SSE using `mock_recipe_id`)
- [x] 2.5 Update chat handler to use `Config.mock_llm` to select provider type

## 3. Playwright Test Specs

- [x] 3.1 Create test helper for server connection and authentication
- [x] 3.2 Create test helper for seeding test recipes via API
- [x] 3.3 Write navigation test: next/previous arrow functionality
- [x] 3.4 Write navigation test: button disable at boundaries
- [x] 3.5 Write recipe display test: title, ingredients, steps render
- [x] 3.6 Write recipe display test: long content scrolls
- [x] 3.7 Write chat test: send message and see it in history
- [x] 3.8 Write chat test: assistant response displays
- [x] 3.9 Write chat test: display_recipe triggers recipe panel update

## 4. CI Pipeline

- [x] 4.1 Create GitHub Actions workflow file for tests (`.github/workflows/test.yml`)
- [x] 4.2 Add job for ESLint (Node.js setup, npm ci, npm run lint)
- [x] 4.3 Add job for Playwright (install deps, start server with mock, run tests)
- [x] 4.4 Configure Playwright browser installation in CI
- [x] 4.5 Ensure test job starts Rust server with `MOCK_LLM=true` before tests

## 5. Documentation and Cleanup

- [x] 5.1 Update README or add TESTING.md with instructions for running tests locally
- [x] 5.2 Add `tests/e2e/node_modules/` to `.gitignore`
- [x] 5.3 Remove or archive capture scripts (`capture_llm_responses.sh`, `capture_display.sh`)
- [x] 5.4 Verify all tests pass locally before merging
