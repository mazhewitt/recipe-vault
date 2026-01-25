<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Security Rules

**NEVER commit secrets to git.** This includes:
- API keys, tokens, passwords
- `.env` files with real credentials
- `.api_key` files
- Private keys or certificates
- Any file containing `API_KEY=`, `SECRET=`, `PASSWORD=`, or similar

Before committing, verify no secrets are staged:
- Check `git diff --cached` for sensitive values
- Ensure `.gitignore` covers secret file patterns

If you accidentally stage a secret, remove it immediately with `git reset HEAD <file>`.