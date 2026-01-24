# Recipe Vault

## Project Overview

Recipe Vault is a self-hosted, AI-first recipe database designed to preserve family recipes and guide users through cooking them step-by-step. The project serves dual purposes: building a genuinely useful tool for the developer's family, and evaluating OpenSpec as a development methodology for potential enterprise adoption.

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | Rust | Performance, safety, excellent for long-running server processes |
| Web Framework | Axum | Modern async framework, good ergonomics, strong ecosystem |
| Database | SQLite (via sqlx) | Simple deployment, single-file backup, sufficient for family scale |
| Templates | Askama | Compile-time checked templates, type-safe |
| Frontend | htmx + minimal CSS | Server-rendered, minimal JavaScript complexity |
| AI Integration | Claude API | Step-by-step cooking guidance, recipe parsing |
| Hosting | Mac Studio (home server) | Always-on, local network, no cloud dependencies |

## Development Approach

This project uses OpenSpec for spec-driven development. All features begin as change proposals with clear specifications before implementation. This allows evaluation of OpenSpec's effectiveness for:

- Maintaining alignment between human intent and AI-generated code
- Managing evolving requirements across multiple features
- Supporting brownfield development as the codebase grows

## MVP Scope

The minimum viable product focuses on three core workflows:

1. **Recipe Capture** - Add recipes to the database with structured ingredients and steps
2. **Recipe Selection** - Browse and choose a recipe to cook
3. **Cooking Guidance** - AI-powered step-by-step assistance while cooking

Post-MVP features (import from URLs/photos, meal planning, scaling, family sharing) are explicitly deferred.

## Architecture Principles

### Simplicity First
- Prefer server-rendered HTML over client-side JavaScript
- Use SQLite until there's a proven need for something more complex
- Minimize external dependencies

### AI as Assistant, Not Replacement
- AI enhances the cooking experience but doesn't replace the cook's judgment
- Users remain in control; AI provides suggestions and guidance
- Graceful degradation if AI services are unavailable

### Family-Friendly
- Interface should work well for varying technical skill levels
- Mobile-friendly for use in the kitchen (tablet/phone on counter)
- No complex authentication flows for home use

## Data Model Concepts

### Recipe
- Title, description, source attribution
- Prep time, cook time, total time
- Servings (base amount for scaling)
- Tags/categories for organization

### Ingredient
- Name, quantity, unit
- Optional notes (e.g., "room temperature", "finely diced")
- Linked to recipe with ordering

### Step
- Instruction text
- Optional duration/timer
- Optional temperature
- Linked to recipe with ordering

### Cooking Session
- Active recipe reference
- Current step index
- Started timestamp
- AI conversation context for guidance

## Coding Conventions

### Rust Style
- Follow standard Rust idioms and clippy recommendations
- Use `thiserror` for custom error types
- Prefer `Result` returns over panics
- Use meaningful type aliases for clarity

### API Design
- RESTful routes for CRUD operations
- htmx-friendly partial responses where appropriate
- JSON API endpoints for AI integration

### Testing
- Unit tests for business logic
- Integration tests for API endpoints
- Test database uses in-memory SQLite

## File Structure (Target)

```
recipe-vault/
├── Cargo.toml
├── src/
│   ├── main.rs              # Entry point, server setup
│   ├── config.rs            # Configuration loading
│   ├── db/
│   │   ├── mod.rs
│   │   ├── schema.rs        # SQLite schema migrations
│   │   └── queries.rs       # Database operations
│   ├── models/
│   │   ├── mod.rs
│   │   ├── recipe.rs
│   │   ├── ingredient.rs
│   │   └── step.rs
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── recipes.rs       # Recipe CRUD
│   │   └── cooking.rs       # Cooking session & guidance
│   ├── ai/
│   │   ├── mod.rs
│   │   └── guidance.rs      # Claude API integration
│   └── templates/           # Askama templates
├── static/                  # CSS, minimal JS
├── migrations/              # SQL migration files
└── openspec/                # Specifications
```

## Environment & Configuration

The application reads configuration from environment variables or a `.env` file:

- `DATABASE_URL` - Path to SQLite database file
- `ANTHROPIC_API_KEY` - For Claude API access (cooking guidance)
- `BIND_ADDRESS` - Server bind address (default: 127.0.0.1:3000)

## Success Criteria for MVP

1. **Recipe Capture**: User can add a complete recipe (title, ingredients, steps) through a web form
2. **Recipe Browsing**: User can view all recipes and select one to cook
3. **Cooking Mode**: User can step through a recipe with AI providing contextual guidance, tips, and answers to questions

## Future Considerations (Post-MVP)

These are explicitly out of scope for MVP but inform architectural decisions:

- Recipe import from URLs (parsing external recipe sites)
- Recipe import from photos (OCR for handwritten family recipes)
- Multi-user support with family accounts
- Recipe scaling (adjust servings)
- Meal planning and shopping lists
- Recipe versioning (track modifications over time)
- Offline support (PWA capabilities)
- Voice interface for hands-free cooking
