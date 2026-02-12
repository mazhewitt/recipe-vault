## ADDED Requirements

### Requirement: Share page includes inline styles

The share page SHALL include its own minimal inline CSS rather than referencing the full application stylesheet.

#### Scenario: Share page styling is self-contained
- **WHEN** the share page HTML is rendered at `/share/:token`
- **THEN** styling is included via an inline `<style>` block in the `<head>`
- **AND** no external stylesheet is referenced
- **AND** the page renders correctly without loading any additional CSS files
