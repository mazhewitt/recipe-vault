## 1. Add Navigation Arrow HTML Elements

- [ ] 1.1 Add "<" arrow element to left page header area in `CHAT_PAGE_HTML`
- [ ] 1.2 Add ">" arrow element to right page header area in `CHAT_PAGE_HTML`
- [ ] 1.3 Add CSS for arrow positioning (top corners of pages)
- [ ] 1.4 Add CSS for arrow styling (Kalam font, ink color, hover states, disabled states)

## 2. Implement Navigation State

- [ ] 2.1 Add JavaScript variable to store current recipe ID (null when placeholder shown)
- [ ] 2.2 Update current recipe ID whenever a recipe is displayed (via chat or navigation)
- [ ] 2.3 Add function to fetch recipe list and find position by current ID

## 3. Implement Navigation Logic

- [ ] 3.1 Add click handler for ">" arrow (fetch list, find position, load next recipe)
- [ ] 3.2 Add click handler for "<" arrow (fetch list, find position, load previous recipe)
- [ ] 3.3 Update arrow disabled states after each navigation (requires knowing position in list)
- [ ] 3.4 Handle navigation from placeholder state (load first recipe)
- [ ] 3.5 Handle edge case: current recipe deleted (fall back to first recipe)

## 4. Verification

- [ ] 4.1 Test navigation through entire recipe list
- [ ] 4.2 Verify arrows disable correctly at list boundaries
- [ ] 4.3 Test that chat-displayed recipes sync with navigation position
- [ ] 4.4 Test empty recipe list shows disabled arrows
- [ ] 4.5 Test that new recipe created via chat appears in navigation
