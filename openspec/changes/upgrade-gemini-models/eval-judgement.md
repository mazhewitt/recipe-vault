# Blind judgement: cooking-assistant replies (M1-M5)

Judged only from `judge-packet.md`. I did not open `judge-key.json`. The only other file I read was the repo's `openspec/specs/cooking-guidance/spec.md`, to check the app's rules for guided cooking. It requires the assistant to ask for the serving size when a session starts. Timers are to be offered, then started once the user accepts. Starting a new timer replaces the one already running.

Scale: each of the five dimensions is scored 1-5. Each scenario is worth up to 25 points, and the total is out of 325.
Dimensions: **Corr** = correctness, **Grnd** = groundedness, **Useful** = cook-usefulness (brevity plus giving the next action), **Lang** = language, tone and how well the reply fits a small note, **Action** = right tools at the right time.

## Overall

| Rank | Model | Total /325 | Corr /65 | Grnd /65 | Useful /65 | Lang /65 | Action /65 |
|---|---|---|---|---|---|---|---|
| 1 | **M2** | **297** | 62 | 58 | 51 | 64 | 62 |
| 2 | **M5** | **291** | 60 | 58 | 50 | 62 | 61 |
| 3 | **M3** | **290** | 60 | 62 | 47 | 61 | 60 |
| 4 | **M4** | **286** | 58 | 54 | 51 | 62 | 61 |
| 5 | **M1** | **284** | 58 | 59 | 48 | 65 | 54 |

The field is close: only 13 points separate first from last. M5 and M3 are effectively tied, and so are M4 and M1. In each pair, one scenario decides the order. The real separators are single bad outcomes, not steady quality differences:
- M4 missed 5 of the 8 vegetarian recipes.
- M3 lost control of the lasagne session.
- M1 saved both image recipes without showing them first, and fired `create_recipe` twice on one of them.
- M2 is first mostly because it has no such outcome anywhere.

| Scenario | M1 | M2 | M3 | M4 | M5 |
|---|---|---|---|---|---|
| grounded-search | 25 | 23 | 18 | 15 | 23 |
| guided-cooking-2-turns | 19 | 25 | 23 | 23 | 20 |
| halve-current | 22 | 22 | 22 | 22 | 25 |
| hard-constrained-meal | 23 | 23 | 23 | 22 | 23 |
| hard-cups | 25 | 23 | 23 | 24 | 23 |
| hard-followup-reference | 24 | 24 | 25 | 24 | 24 |
| hard-german-card | 18 | 21 | 22 | 22 | 21 |
| hard-guided-5-turns | 21 | 23 | 17 | 24 | 22 |
| hard-missing-recipe | 24 | 24 | 25 | 24 | 23 |
| hard-substitute-and-scale | 20 | 20 | 20 | 20 | 20 |
| image-to-recipe | 21 | 22 | 23 | 20 | 21 |
| meal-plan | 23 | 25 | 25 | 24 | 24 |
| troubleshoot-french | 19 | 22 | 24 | 22 | 22 |
| **Total** | **284** | **297** | **290** | **286** | **291** |

---

## Per-scenario judgement

### 1. grounded-search: "Which of my recipes are vegetarian? Just the names."
Ideal: list all 8 names with no preamble. The book as run contains Mum's Flapjacks and Nana's Cheese Scones, and all models saw them. So the 8 are the four tagged recipes (Flapjacks, Mushroom Risotto, Cheese Scones, Shakshuka) plus the four sweet bakes (Banana Bread, Brownies, Lemon Drizzle, Pancakes).

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 5 | 5 | 5 | 5 | 5 | 25 |
| M2 | 5 | 5 | 4 | 4 | 5 | 23 |
| M3 | 2 | 4 | 2 | 5 | 5 | 18 |
| M4 | 1 | 3 | 2 | 4 | 5 | 15 |
| M5 | 5 | 5 | 4 | 4 | 5 | 23 |

- M1: all 8 as a plain list, exactly what was asked. Best reply.
- M2: all 8, split into "tagged" and "meat-free bakes". The split is informative but goes past "just the names".
- M5: all 8, with a short preamble and the bakes in an italic aside.
- **M3, error:** lists only the 4 tagged recipes. It leaves out Banana Bread, Chocolate Brownies, Lemon Drizzle Cake and Pancakes, all vegetarian.
- **M4, error:** lists only 3 ("explicitly tagged"). It leaves out Mum's Flapjacks as well as all four sweet bakes, so 5 of 8 are missing. The answer is honestly hedged but fails the question.

### 2. guided-cooking-2-turns: Lemon Drizzle, "what do I need to do first?" then "creamed. Next?"
Ideal turn 1: "Preheat to 180°C and line the tin." Also ask about servings, because the spec requires it, but put the action first. Ideal turn 2: beat in the 4 eggs one at a time, fold in 225 g SR flour and the zest, into the tin. Offer the 45-minute timer when the cake goes in.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 4 | 4 | 2 | 5 | 4 | 19 |
| M2 | 5 | 5 | 5 | 5 | 5 | 25 |
| M3 | 5 | 5 | 4 | 4 | 5 | 23 |
| M4 | 5 | 4 | 5 | 5 | 4 | 23 |
| M5 | 4 | 5 | 3 | 4 | 4 | 20 |

- M1: turn 1 is only "how many servings?" and does not answer "what first". Turn 2 is correct but gives no quantities.
- M2: action first (oven, tin, softened butter), then the servings question with the 8-serving default. Turn 2 is one step and ends with "Ready for the oven?" Model reply.
- M3: servings question comes before the step, but the step is there. Turn 2 has quantities, adds a useful "save the juice for the drizzle", and offers a 45-minute timer once the cake is in the oven. Good.
- M4: turn 1 is excellent. "180°C (160°C fan)" is the correct UK convention, though the fan figure is not in the recipe. It skips the servings question the spec asks for. Turn 2 is ideal: one step, with quantities.
- M5: turn 1 re-displays a recipe that is already open and only asks about servings, so no first step. Turn 2 is good.

### 3. halve-current: "Can you halve this recipe? Just two of us tonight."
Halved Thai Green Curry: ½ tbsp oil, 1½ tbsp paste, 250 g chicken, 200 ml coconut milk, ½ tbsp fish sauce, ½ tsp palm sugar, 75 g beans, basil, ½ lime. The app allows scaling to be either shown or saved. Because the request is for one night, showing it is the better fit.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 5 | 5 | 3 | 5 | 4 | 22 |
| M2 | 5 | 5 | 3 | 5 | 4 | 22 |
| M3 | 5 | 5 | 3 | 5 | 4 | 22 |
| M4 | 5 | 5 | 3 | 5 | 4 | 22 |
| M5 | 5 | 5 | 5 | 5 | 5 | 25 |

- M1-M4 each called `update_recipe`, which permanently changes the family's 4-serving recipe to 2 servings, and replied in one line. The rules allow this. But no quantities appear on the note, and only M2 and M3 say plainly that the stored recipe was changed. The saved records are not in the packet, so the quantities cannot be checked.
- M5: shown, not saved. **Every halved quantity is correct.** Four compact lines, then "Ready to cook?" Best reply.

### 4. hard-constrained-meal: vegetarian main for 4, quick on a weeknight, plus dessert
The book has two quick vegetarian mains: Shakshuka (35 min) and Mushroom Risotto (45 min, with constant stirring). Shakshuka fits "quick" better. The flow should be: propose, wait for confirmation, then display.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 4 | 5 | 4 | 5 | 5 | 23 |
| M2 | 4 | 5 | 4 | 5 | 5 | 23 |
| M3 | 5 | 5 | 4 | 5 | 4 | 23 |
| M4 | 4 | 4 | 5 | 4 | 5 | 22 |
| M5 | 4 | 5 | 4 | 5 | 5 | 23 |

- M1, M2, M4 and M5 all chose the 45-minute risotto as the "quick" main when the 35-minute shakshuka was available. This is a missed constraint, not a false statement. M1 calls the risotto "quick" with no time given.
- M3 is the only model to offer Shakshuka with both times. But it proposed two options, and the user's "sounds good" did not pick one. M3 then displayed a plan that, judging by its closing remark, used Shakshuka, without saying which dessert it chose.
- M4: the tip to bake the brownies ahead is genuinely useful on a weeknight. Calling them "quick to prep" is a claim the packet does not support.
- All five followed the propose-then-display flow.

### 5. hard-cups: 225 g butter, caster sugar and SR flour in US cups
Reference values:
- Butter: 1 cup (2 sticks, 16 tbsp).
- Caster sugar: about 1 cup + 2 tbsp (1⅛ cups), using about 200 g per US cup.
- SR flour: about 1¾ cups + 1-2 tbsp, using 120-125 g per cup. At King Arthur's 113 g per cup for self-rising flour it is about 2 cups.

All five said "1¾ cups" for the flour. That is slightly light (about 210-219 g) but within normal tolerance. It is a shared imprecision and does not separate the models.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 5 | 5 | 5 | 5 | 5 | 25 |
| M2 | 4 | 5 | 4 | 5 | 5 | 23 |
| M3 | 5 | 5 | 4 | 4 | 5 | 23 |
| M4 | 5 | 5 | 5 | 4 | 5 | 24 |
| M5 | 5 | 4 | 4 | 5 | 5 | 23 |

- M1: all correct, including the sticks and tablespoons. Tight.
- **M2, error:** caster sugar given as **1 cup**, which is about 200 g. That is roughly 25 g (11%) short of 225 g; the answer should be 1 cup + 2 tbsp.
- M3: all correct. It also adds the drizzle sugar (85 g ≈ a scant ½ cup, which is correct), but puts it inside the flour line, which is confusing.
- M4: 1⅛ cups is correct, and "spooned and leveled" is good technique. Its plain-flour substitute (2½ tsp baking powder plus ¼ tsp salt) is a reasonable, useful note for a US baker.
- M5: all correct. The note "US self-rising has salt, omit extra salt" is true but has nothing to apply to, because the recipe has no salt.

### 6. hard-followup-reference: "Show me the curry" then "How long altogether?"
Answer: 10 + 20 = 30 minutes.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 5 | 4 | 5 | 5 | 5 | 24 |
| M2 | 5 | 4 | 5 | 5 | 5 | 24 |
| M3 | 5 | 5 | 5 | 5 | 5 | 25 |
| M4 | 5 | 4 | 5 | 5 | 5 | 24 |
| M5 | 5 | 4 | 5 | 5 | 5 | 24 |

- All five answered correctly. M1 and M5 called `get_recipe` again, which is harmless.
- M1, M2, M4 and M5 open with a tip to fry or "toast" the paste in coconut cream. The technique is sound, but the book fries the paste in oil, so the tip goes beyond the recipe.
- M3 described the dish from the recipe itself.

### 7. hard-german-card: "Kannst du dieses Rezept in mein Buch aufnehmen?" (photo of a recipe card)
The app's flow: show the recipe from the image, wait for confirmation, then save. Every reply should be in German.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 4 | 5 | 3 | 5 | 1 | 18 |
| M2 | 5 | 3 | 3 | 5 | 5 | 21 |
| M3 | 5 | 5 | 3 | 4 | 5 | 22 |
| M4 | 5 | 4 | 3 | 5 | 5 | 22 |
| M5 | 5 | 4 | 3 | 4 | 5 | 21 |

- **M1, action error:** saved without showing the recipe first, and **called `create_recipe` twice**. Both calls completed, so a duplicate entry is likely. The saved text is the closest to the card, but it drops the 26 cm springform.
- **M2, groundedness:** the saved record differs from the preview the user approved. It adds coring the apples, a fan-cut, a cooling step and "Schlagsahne" (whipped cream). It also invents step durations of 5, 5, 10 and 5 minutes. The preview uses heavy markdown.
- M3: the saved record matches the preview exactly, with no invented times. Its confirmation question ends with an English aside, "(Would you like me to edit it or add it to the book?)", in a German conversation.
- **M4:** invented step durations (5, 5, 5, 10 and 2 minutes). It also adds "gefettete" (greased), which is not on the card, though it is sensible.
- **M5:** invented step durations (10, 5 and 10 minutes) and added "goldbraun". "Hier ist das rezeptierte Gericht" is not idiomatic German.
- The previews from M2-M5 are long markdown documents. Some length is unavoidable for a review step, but they are heavy for a handwritten-style note.

### 8. hard-guided-5-turns: Granny's Beef Lasagne, user "at the stove"
Ideal:
- Turn 1: soften the onion, carrot and celery for about 10 minutes, plus a short servings question.
- Then one step per turn: garlic and mince; purée and wine; tomatoes, stock and oregano.
- Offer the 90-minute timer and start it once the pot is simmering. Béchamel comes next.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 5 | 4 | 3 | 5 | 4 | 21 |
| M2 | 5 | 5 | 3 | 5 | 5 | 23 |
| M3 | 4 | 4 | 2 | 4 | 3 | 17 |
| M4 | 5 | 5 | 4 | 5 | 5 | 24 |
| M5 | 5 | 5 | 3 | 5 | 4 | 22 |

- **All five failed turn 1.** Each asked only about servings and gave no first instruction to a cook standing at the stove. The user ignored the question and cooked anyway.
- M1: strictly one step per turn, but bare, with no quantities and no heat cues. It started the 90-minute timer while telling the user to add the tomatoes, before they were in, and without offering first. That is about a minute early and harmless.
- M2: in turn 3 it ran ahead into step 4 (tomatoes, stock, oregano), then repeated it in turn 4. It offered the timer and started it when the user said the ingredients were in, which is the correct moment.
- **M3:** ran ahead every turn. Turn 2 already included the purée and wine; turn 3 already included the tomatoes. It repeated steps the next turn and re-displayed the recipe mid-cook. **It started the 90-minute timer twice**: once before the tomatoes were in and again in turn 5. The second call restarts the countdown. It closed with a long béchamel paragraph.
- M4: after turn 1, this is the ideal pattern. One step per turn, with quantities (2 tbsp purée, 150 ml wine), and the timer was offered, then started when the ingredients were in.
- M5: gives useful quantities. It ran ahead in turn 3, then repeated in turn 4. It started the timer in turn 4 before the tomatoes were added and without offering. Its next step is the first béchamel action with quantities, which is helpful.

### 9. hard-missing-recipe: "Show me my beef wellington recipe"

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 5 | 5 | 4 | 5 | 5 | 24 |
| M2 | 5 | 5 | 4 | 5 | 5 | 24 |
| M3 | 5 | 5 | 5 | 5 | 5 | 25 |
| M4 | 5 | 5 | 4 | 5 | 5 | 24 |
| M5 | 5 | 5 | 4 | 5 | 4 | 23 |

- None of them invented a recipe.
- M3 also names the beef dishes that are in the book (lasagne, bolognese).
- M5 called `display_recipe` on the missing recipe before listing the book, which is the wrong order. It did no harm.

### 10. hard-substitute-and-scale: no coconut milk, use double cream, make for 6
Scaling ×1.5 gives: 1½ tbsp oil, 4½ tbsp paste, 750 g chicken, 600 ml liquid, 1½ tbsp fish sauce, 1½ tsp sugar, 225 g beans, 1½ limes.

On the food science: double cream is about 48% fat against roughly 18-24% for coconut milk. A 1:1 swap makes a very heavy sauce with no coconut flavour. A good reply would suggest about half cream and half stock or water, simmered gently, with the lime added off the heat.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| all five | 4 | 4 | 3 | 5 | 4 | 20 |

- Every model called `update_recipe`. That permanently writes a pantry substitution into the family's curry and changes it to 6 servings. None warned that the book recipe had changed, and none mentioned richness or flavour.
- M3 is the only one that says its quantity: **600 ml double cream, a 1:1 swap**. That is the scaling done right but the food-science issue made explicit. The others' saved records are not in the packet, so they cannot be checked.

### 11. image-to-recipe: Nana's Cheese Scones card, "Please add this recipe card to the book"
The flow is again show, then save after confirmation.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 5 | 5 | 4 | 5 | 2 | 21 |
| M2 | 5 | 4 | 3 | 5 | 5 | 22 |
| M3 | 5 | 5 | 3 | 5 | 5 | 23 |
| M4 | 4 | 3 | 3 | 5 | 5 | 20 |
| M5 | 3 | 4 | 4 | 5 | 5 | 21 |

- **M1, action error:** saved immediately with no preview, again. The record itself is faithful; it uses 13 minutes as the midpoint of "12-15".
- M2: faithful, with small additions ("place on a baking tray", "risen and golden brown").
- M3: faithful, and the record matches the preview.
- **M4, errors:** invented "Prep time: 15 mins" and invented step durations. One of them is "Preheat oven … 5 min", which is unrealistic for 220°C.
- **M5, error:** the oven temperature field in the saved record (used by the app, not shown in the step text) is **200°C**, the fan figure. The step text and the card say 220°C conventional. If the app uses the field, a conventional oven would run 20°C too cool.

### 12. meal-plan: dinner for 6, one main and one dessert

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 4 | 5 | 4 | 5 | 5 | 23 |
| M2 | 5 | 5 | 5 | 5 | 5 | 25 |
| M3 | 5 | 5 | 5 | 5 | 5 | 25 |
| M4 | 5 | 5 | 4 | 5 | 5 | 24 |
| M5 | 5 | 5 | 4 | 5 | 5 | 24 |

- All five picked the Lasagne, which serves 6.
- **M1, error:** its final message calls the brownies "the side" instead of the dessert.
- M2 offers an alternative dessert.
- M3 suggests baking the cake earlier so the oven is free. That is practical.
- M5 called `list_recipes` again before displaying, which is redundant.

### 13. troubleshoot-french: "Mon gâteau est retombé au milieu, pourquoi ?"
Ideal reply, in French:
- The likely causes for this cake: underbaked centre, oven opened too early, over-beaten batter, or an oven running too hot or too cool.
- A quick check to make next time: a skewer in the centre.
- Ideally, how to save it: the drizzle still soaks in, so the dip can be filled with it.

None of the five offered a way to save the cake.

| Model | Corr | Grnd | Useful | Lang | Action | Total |
|---|---|---|---|---|---|---|
| M1 | 3 | 3 | 3 | 5 | 5 | 19 |
| M2 | 5 | 3 | 5 | 5 | 4 | 22 |
| M3 | 5 | 5 | 4 | 5 | 5 | 24 |
| M4 | 5 | 3 | 5 | 5 | 4 | 22 |
| M5 | 5 | 3 | 4 | 5 | 5 | 22 |

- **M1:** leaves out underbaking, the most common cause. "Farine mal incorporée (trop battue après l'ajout)" contradicts itself (poorly mixed in, yet over-beaten). It suggests too much raising agent for a recipe that uses SR flour with no added baking powder, and gives no next step. It fetched the recipe but answered generically.
- M2 and M4: give generic but sound causes and a useful knife-test tip. Both mention too much raising agent, which barely applies here. Neither looked at the recipe.
- M3: tailored to the recipe. It ties "don't open the door before 35-40 minutes" to the 45-minute bake and names the self-raising flour. Best answer.
- M5: sound causes, including an oven that is too hot. It fetched the recipe but did not use it.

---

## Factual and safety errors by model

**M1**
- Lemon drizzle (scenario 2) and lasagne (scenario 8): asked only about servings and gave no first step. Not a false statement, but it did not answer the question.
- German card: saved without a preview and **called `create_recipe` twice**, so a duplicate is likely. The record drops the 26 cm springform.
- Cheese scones: saved without a preview.
- Meal plan: calls the dessert (brownies) "the side".
- French troubleshooting: leaves out underbaking, and its flour cause contradicts itself.
- Constrained meal: calls the 45-minute risotto "quick" when the 35-minute shakshuka exists.

**M2**
- Cups: caster sugar 225 g given as "1 cup", about 25 g short; it should be 1 cup + 2 tbsp.
- German card: the saved record adds content not on the card and not in the approved preview (coring, fan-cut, cooling, whipped cream), plus invented step durations.
- Lasagne: ran ahead a step and then repeated it.
- French troubleshooting: generic. Too much raising agent hardly applies to an SR-flour cake.
- Constrained meal: chose risotto over the quicker shakshuka.

**M3**
- Vegetarian list: **leaves out 4 of 8 vegetarian recipes** (Banana Bread, Brownies, Lemon Drizzle, Pancakes).
- Lasagne: **started the 90-minute timer twice**, the first time before the tomatoes were in. It gave instructions ahead of the cook in turns 2-3 and re-displayed the recipe mid-cook.
- Substitute and scale: explicitly saved a 1:1 swap of 600 ml double cream with no warning about richness.
- Cups: the drizzle sugar sits in the flour line. The amount is correct but the placement is confusing.
- German card: an English aside in a German conversation.
- Constrained meal: did not say which dessert went into the displayed plan.

**M4**
- Vegetarian list: **leaves out 5 of 8 vegetarian recipes**, including Mum's Flapjacks. This is the worst single error in the set.
- Cheese scones: invented "Prep time: 15 mins" and step durations, including "Preheat 5 min", which is unrealistic at 220°C.
- German card: invented step durations.
- Lemon drizzle: did not ask about servings, which the spec requires. The reply was still helpful.
- Constrained meal: chose risotto over the quicker shakshuka.

**M5**
- Cheese scones: **saved the oven temperature field as 200°C (fan) while the step text says 220°C**, an inconsistent record.
- German card: invented step durations; "rezeptierte Gericht" is not idiomatic German.
- Lasagne: started the timer before the tomatoes were added, and ran ahead a step in turn 3.
- Cups: a salt note with nothing in the recipe to apply to.
- Missing recipe: tried to display it before listing the book.
- Lemon drizzle: no first step.
- Constrained meal: chose risotto over the quicker shakshuka.

**Shared by all five**
- No first instruction in the lasagne turn 1.
- The curry was overwritten with double cream and 6 servings, with no notice and no food-science caveat.
- "1¾ cups" self-raising flour is slightly light for 225 g.
- No way to save the sunk lemon drizzle was offered.

---

## Model characterisations

**M2 (1st, 297).** The most reliable at following the app's flows.
- In guided cooking it gives the next action first and asks about servings after it.
- It offers timers and starts them at the right moment, as the spec intends.
- It proposes meal plans with an alternative and says plainly when it has changed a saved recipe.
- Failures are small but real: caster sugar under-converted to 1 cup, one step run ahead and repeated in the lasagne, and generic troubleshooting.
- Its German save quietly embellished the recipe the user had approved and invented step times. Its previews are markdown-heavy for a note.

**M5 (2nd, 291).** Wrote the best scaling reply of the set: correct halved quantities shown as a compact list without overwriting the book.
- Gives concrete quantities while guiding and a complete vegetarian list.
- Opened the lemon-drizzle session with a servings-only question.
- Started the ragù timer before the tomatoes were in and ran ahead a step.
- Saved the scones with a 200°C/220°C mismatch in the record.
- Makes more redundant tool calls than the others (re-displaying an open recipe, display before list, re-listing the book) and has small German slips.

**M3 (3rd, 290).** The most grounded and context-aware model, and the weakest at multi-turn pacing.
- Only model to offer the 35-minute shakshuka for "quick".
- Tailored its French troubleshooting to the 45-minute SR-flour cake, listed alternative beef dishes, and saved records exactly as previewed.
- Offered the 45-minute timer cleanly.
- In the long lasagne session it ran ahead of the cook every turn, repeated steps, re-displayed the recipe and fired the timer twice.
- Its vegetarian answer left out every sweet bake.
- It also mixes in English asides and adds clutter.

**M4 (4th, 286).** The best step-by-step guide once a session is under way.
- One step per turn with quantities, and timers offered and then started exactly when the ingredients were in.
- Strongest cups answer: correct 1⅛ cups, spoon-and-level, and a plain-flour substitute.
- The "make the brownies ahead" tip is the kind of help a busy cook wants.
- Its search is its weak point: it restricted "vegetarian" to "explicitly tagged" and missed 5 of 8 recipes.
- Its saved records invent prep times and step durations. It also skipped the spec's servings question in one session.

**M1 (5th, 284).** The tersest model, and it does well whenever a task is a lookup.
- Perfect vegetarian list and perfect cup conversions, in the fewest words.
- That terseness carries over into skipping steps the app's flow requires: both image recipes were saved without a preview, one of them twice.
- Guided sessions open with a bare "how many servings?" and no instruction.
- Its French troubleshooting is one sentence that leaves out the main cause.
- Its one-line confirmations never show the quantities or say what was changed.

---

## Does the cheapest behaviour (short replies) ever hurt the cook?

**Yes, when the brevity comes from leaving something out, not from tight wording.**

Where short replies hurt:
- **The guided-cooking openers.** M1 and M5 in the lemon drizzle, and every model in the lasagne, sent a one-line servings question and no step. A cook with busy hands waits a turn for nothing.
- **The one-line "I've scaled it" confirmations** in the halving and swap-and-scale scenarios. They hide the new quantities. They hide that the family's master recipe has been overwritten. They hide a needed warning that 600 ml of double cream will be very rich.
- **M1's skipped previews.** The cheapest path on the image recipes broke the confirm-before-save flow and produced a probable duplicate.
- **M1's one-sentence troubleshooting,** which leaves out underbaking and gives no next step.

Where short replies did not hurt:
- M1's 8-name vegetarian list and M5's four-line halved quantities were the best answers precisely because they were short.

Where long replies also cost the cook:
- M3's run-ahead lasagne paragraphs and the long markdown recipe previews. Those are expensive on a small handwritten-style note.

The sweet spot is the next action first with its quantity, then one question or offer. M4's lasagne turns 2-5 and M2's lemon drizzle show it.


---

## Key (added after judging)

M1 = `gemini-3.5-flash-lite` · M2 = `gemini-3.8-flash` (default thinking) · M3 = `gemini-4-argon` · M4 = `gemini-3.8-flash` with `GEMINI_THINKING_LEVEL=low` · M5 = `gemini-3.6-flash`. Transcripts are from rounds r2 and h1.
