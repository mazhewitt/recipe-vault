## ADDED Requirements

### Requirement: Diet questions are answered from what each recipe is

Diet tags (`vegetarian`, `vegan`, `gluten-free`) are optional and often missing, so the chat SHALL answer a question about which recipes suit a diet by judging each recipe from what it is (its title, and its ingredients when known), not from its tags alone.

#### Scenario: Untagged bakes are vegetarian
- **WHEN** the cook asks "Which of my recipes are vegetarian?" and the book holds sweet bakes with no meat or fish that carry no `vegetarian` tag
- **THEN** the reply names those bakes as well as the recipes tagged `vegetarian`, and no meat dish (model eval `grounded-search`: `names_every_vegetarian`)
