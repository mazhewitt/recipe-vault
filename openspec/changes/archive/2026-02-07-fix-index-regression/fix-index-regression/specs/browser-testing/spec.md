## MODIFIED Requirements

### Requirement: Automated tests cover all major UI features

The recipe book index SHALL have dedicated E2E tests to verify its rendering, navigation, and responsiveness.

#### Scenario: Index loads correctly on desktop

- **WHEN** the page loads on a desktop viewport
- **THEN** the index is visible and split across two pages

#### Scenario: Index loads correctly on mobile

- **WHEN** the page loads on a mobile viewport
- **THEN** the index is visible as a single column on the left page
- **AND** the right page is hidden
