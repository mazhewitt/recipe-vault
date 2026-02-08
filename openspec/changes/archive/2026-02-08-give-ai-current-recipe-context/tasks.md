## 1. Frontend context wiring

- [x] 1.1 Add `current_recipe` state to the chat UI data model (id + title)
- [x] 1.2 Update recipe navigation/display flows to keep `current_recipe` in sync (recipe view vs index)
- [x] 1.3 Include `current_recipe` in chat request payload when sending a message

## 2. Backend + prompt integration

- [x] 2.1 Extend chat request model to accept optional `current_recipe`
- [x] 2.2 Inject current recipe context into the LLM prompt/reminders
- [x] 2.3 Update `get_recipe` tool description to prefer current context when present

## 3. Validation

- [x] 3.1 Manual test: browse recipe, ask scaling question, verify `get_recipe` is used
- [x] 3.2 Manual test: index view, ask question, verify no current recipe context is sent
