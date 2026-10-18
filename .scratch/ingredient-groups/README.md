# Ingredient groups by stage

Status: ready-for-agent

The owner decided on 2026-10-18 to do this next, as its own OpenSpec change straight after the Journal 2.0 release, not in it: that release stays UI-only, with no database migration in the same deploy.

## The problem

Granny's Beef Lasagne lists the ragù, the béchamel (60 g butter, 60 g plain flour, 750 ml whole milk) and the assembly (12 dried lasagne sheets, the cheeses) as one unbroken column. A cook working down the list can put the béchamel butter in the pan at step 1. A design review of the owner's trial raised it, and the owner agreed.

## The shape (to be decided in the change)

- A nullable `group` (or `section`) on each recipe ingredient. This needs a new migration; never edit an applied one (CLAUDE.md).
- MCP `create_recipe` / `update_recipe` accept it, and the prompt asks the assistant to group the ingredients of multi-stage recipes ("For the ragù", "For the béchamel", "For assembly") and to leave single-stage recipes ungrouped.
- `renderIngredients` draws a small subheading per group (Kalam, like the section header but smaller), keeping one `.ingredient-item` per row and the row pitch from `lighter-book`. Ticks and the "you are here" mark keep their `data-index`.
- Existing recipes: the cook asks the assistant ("group the ingredients"), or a one-off backfill pass on Gemini (about 50 recipes, pennies).
- Scaling (`cook-from-the-page` P1) is unaffected: groups only label rows.

## Not decided

- One level of groups only? (Suggest yes.)
- Should the method's steps link to their group (e.g. "for the béchamel" highlights those rows)? Probably later.
