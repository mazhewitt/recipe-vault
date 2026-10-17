## MODIFIED Requirements

### Requirement: Prefetch cache serves navigation requests

When navigating to a recipe, the system SHALL check the prefetch cache first. If the recipe data is cached, it SHALL render immediately, without a network request and without the loading skeleton, and the page turn SHALL start without waiting on any request.

#### Scenario: Cache hit on navigation

- **WHEN** the user navigates to a recipe that has been prefetched
- **THEN** the recipe is rendered immediately from the cache
- **AND** no network request is made to `/api/recipes/:id` for that recipe
- **AND** no `.skeleton` element is inserted into `#page-right-content` at any point of the turn

#### Scenario: A turn from the cache waits on no request

- **WHEN** the next recipe is in the prefetch cache (with its difficulty assessed)
- **AND** every response from `/api/recipes` and `/api/recipes/:id` is delayed by 300ms
- **AND** the user taps the next control (`#page-next`, `.footer-next`, `#gutter-next`) or swipes left
- **THEN** the next recipe's title is in `#page-right-content .recipe-title` less than 300ms after the tap

#### Scenario: Cache miss falls back to fetch

- **WHEN** the user navigates to a recipe that is not in the cache (e.g., cold start, navigated multiple steps)
- **THEN** the system fetches the recipe from the API as normal
- **AND** a skeleton loader is shown inside the incoming page behind the page-turn overlay

### Requirement: Prefetch cache is invalidated on recipe list changes

When the recipe list is refreshed, the prefetch cache SHALL drop only the entries whose recipe ids are no longer in the list and SHALL keep the rest, so that a refresh never sends the next page turn back to the network. A `recipe_artifact` event SHALL still empty the cache (`web-chat` "Recipe Artifact Event Handling"), because the recipe it names may have just been edited.

#### Scenario: A list refresh keeps the prefetched neighbours

- **WHEN** the open recipe's previous and next recipes are in the prefetch cache
- **AND** the recipe list is refreshed (a `GET /api/recipes` completes)
- **THEN** both are still in the cache
- **AND** the next page turn makes no request to `/api/recipes/:id` for the next recipe

#### Scenario: A deleted recipe leaves the cache

- **WHEN** a recipe held in the prefetch cache is deleted (through chat or elsewhere)
- **AND** the recipe list is refreshed
- **THEN** that recipe's entry is removed from the cache
- **AND** the entries for recipes still in the list are kept

#### Scenario: Cache cleared after chat creates a recipe

- **WHEN** a chat operation creates a recipe and displays it, so a `recipe_artifact` event for it arrives
- **THEN** the prefetch cache is emptied by that event, not by the list refresh that follows it
- **AND** once the new recipe has rendered, new prefetch requests are issued for its neighbours

#### Scenario: Cache cleared after recipe modification

- **WHEN** a recipe is modified through chat and a `recipe_artifact` event for it arrives
- **THEN** the prefetch cache is emptied, so the edited recipe is never served stale
- **AND** a list refresh on its own, with no `recipe_artifact`, empties nothing
