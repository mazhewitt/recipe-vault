# Testing Guide

This document describes how to run tests for the recipe-vault application.

## Prerequisites

- Rust (stable toolchain)
- Node.js 20+ and npm
- SQLite

## Test Types

### 1. Rust Integration Tests

Located in `tests/`, these test the backend API endpoints.

**Run Rust tests:**
```bash
cargo test
```

### 2. JavaScript Linting

ESLint checks the vanilla JavaScript frontend (`static/*.js`) for syntax errors and common issues.

**Run linting:**
```bash
cd tests/e2e
npm install  # First time only
npm run lint
```

**Auto-fix issues:**
```bash
npm run lint:fix
```

### 3. Browser E2E Tests

Playwright tests verify GUI functionality including navigation, recipe display, and chat interactions.

**Setup:**
```bash
cd tests/e2e
npm install
npx playwright install chromium
```

**Run tests:**
```bash


# Or from project root
cd tests/e2e && npm test
```

**Run tests with UI:**
```bash
npx playwright test --ui
```

**Run specific test file:**
```bash
npx playwright test navigation.spec.ts
```

## Mock LLM Mode

The E2E tests use a mock LLM provider to avoid consuming API tokens. The mock provider:
- Responds to "list" queries with a sample recipe list
- Responds to "show"/"display" queries with a recipe display action
- Uses the `MOCK_RECIPE_ID` environment variable if set

**Testing with mock locally:**
```bash
# Terminal 1: Start server with mock LLM and dev identity
MOCK_LLM=true DEV_USER_EMAIL=test@example.com DATABASE_URL=sqlite::memory: cargo run

# Terminal 2: Run Playwright tests
cd tests/e2e
npm test
```

The Playwright config (`playwright.config.ts`) automatically starts the server with `MOCK_LLM=true`.

## CI Pipeline

GitHub Actions runs both linting and E2E tests on every push and PR:
- **ESLint job**: Checks JavaScript syntax
- **Playwright job**: Runs browser tests with mock LLM

See [`.github/workflows/test.yml`](.github/workflows/test.yml) for details.

## Troubleshooting

**Playwright tests fail with "server not available":**
- Ensure no other instance is running on port 3000
- Check that `DATABASE_URL` and `ANTHROPIC_API_KEY` environment variables are set (can use dummy values with MOCK_LLM=true)

**ESLint errors:**
- Run `npm run lint:fix` to auto-fix formatting issues
- Check that you're in the `tests/e2e` directory

**Mock LLM not working:**
- Verify `MOCK_LLM=true` is set when starting the server
- Check server logs for "Mock" provider initialization
