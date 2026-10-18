## MODIFIED Requirements

### Requirement: Course Tag Vocabulary

The system SHALL treat `main` and `dessert` as the fixed tag names behind the contents Mains and Sweets tabs, and SHALL state them wherever tags are described to a user or model.

#### Scenario: Chat prompt names the course tags
- **WHEN** the chat system prompt is built
- **THEN** it lists the course vocabulary and states that `main` and `dessert` drive the Mains and Sweets tabs

#### Scenario: Tag chips on the recipe page
- **WHEN** a recipe with tags is displayed and the cook opens the header's "⋯" popover
- **THEN** up to three tags render as muted chips in `.recipe-more-panel .recipe-tags` (family-recipe-ui "Recipe metadata displays with icons")
- **AND** no tag chip is rendered in `.recipe-meta-line`
- **AND** a recipe without tags shows no chips

#### Scenario: Chat request to change a course
- **WHEN** the user says a displayed recipe is a pudding
- **THEN** the model calls `update_recipe` with the recipe's current tags with the course tag replaced by `dessert`
