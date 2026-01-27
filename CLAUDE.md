
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
