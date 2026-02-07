.PHONY: test test-unit test-e2e test-all lint e2e-setup

# Run cargo unit/integration tests
test-unit:
	cargo test

# Install e2e dependencies and browsers (first-time setup)
e2e-setup:
	cd tests/e2e && npm ci
	cd tests/e2e && npx playwright install chromium

# Run Playwright e2e tests (builds release binary, starts server automatically)
test-e2e:
	cargo build --release
	cd tests/e2e && \
		MOCK_LLM=true \
		DATABASE_URL='sqlite::memory:' \
		ANTHROPIC_API_KEY=mock-key \
		DEV_USER_EMAIL=test@example.com \
		npm test

# Run ESLint on static JS
lint:
	cd tests/e2e && npm run lint

# Run everything: unit tests, lint, and e2e tests (mirrors CI)
test-all: test-unit lint test-e2e

# Default: run everything
test: test-all
