# recipe-prefetch Specification

## Purpose
TBD - created by archiving change buttery-navigation. Update Purpose after archive.
## Requirements
### Requirement: Adjacent recipes are prefetched after display

After a recipe is displayed, the system SHALL prefetch the next and previous recipes in the background so that subsequent navigation can render instantly from cache.

#### Scenario: Prefetch after recipe display

- **WHEN** a recipe is displayed (via navigation or chat)
- **THEN** the system identifies the next and previous recipe IDs from the recipe list
- **AND** fetches their full data from `/api/recipes/:id` in the background using `requestIdleCallback`

#### Scenario: Prefetch at list boundaries

- **WHEN** the displayed recipe is the last in the list
- **THEN** only the previous recipe is prefetched (there is no next)
- **AND** when the displayed recipe is the first, only the next recipe is prefetched

#### Scenario: Prefetch does not block rendering

- **WHEN** prefetch requests are in flight
- **THEN** they do not block or delay the current recipe's rendering or any user interaction

### Requirement: Prefetch cache serves navigation requests

When navigating to a recipe, the system SHALL check the prefetch cache first. If the recipe data is cached, it SHALL render immediately without a network request.

#### Scenario: Cache hit on navigation

- **WHEN** the user navigates to a recipe that has been prefetched
- **THEN** the recipe is rendered immediately from the cache
- **AND** no network request is made to `/api/recipes/:id`

#### Scenario: Cache miss falls back to fetch

- **WHEN** the user navigates to a recipe that is not in the cache (e.g., cold start, navigated multiple steps)
- **THEN** the system fetches the recipe from the API as normal
- **AND** a skeleton loader is shown inside the incoming page behind the page-turn overlay

### Requirement: Prefetch cache is invalidated on recipe list changes

The prefetch cache SHALL be cleared whenever the recipe list is force-refreshed (e.g., after a chat operation creates, modifies, or deletes a recipe), ensuring stale data is never served.

#### Scenario: Cache cleared after chat creates a recipe

- **WHEN** a chat operation results in a new recipe being created and the recipe list is force-refreshed
- **THEN** the prefetch cache is emptied
- **AND** new prefetch requests are triggered for the currently displayed recipe's neighbours

#### Scenario: Cache cleared after recipe modification

- **WHEN** a recipe is modified (updated or deleted) and the recipe list is force-refreshed
- **THEN** the prefetch cache is emptied

### Requirement: Prefetch cache has bounded size

The prefetch cache SHALL hold a maximum of 5 entries. When the limit is exceeded, the oldest entry SHALL be evicted.

#### Scenario: Cache eviction at capacity

- **WHEN** the cache contains 5 entries and a new prefetch completes
- **THEN** the oldest cached entry is removed to make room for the new one
- **AND** the cache never exceeds 5 entries

