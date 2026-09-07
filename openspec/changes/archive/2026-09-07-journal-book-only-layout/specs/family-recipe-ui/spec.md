## MODIFIED Requirements

### Requirement: Main layout displays notepad and recipe book side by side

The interface SHALL display the recipe book alone, filling the available width, on a dark wood-textured background, with the chat note input attached to the book.

#### Scenario: Default desktop layout

- **WHEN** the user loads the chat page on a viewport wider than 1024px
- **THEN** the recipe book is centred and fills the width (up to its maximum), with no notepad panel
- **AND** the note input sits at the foot of the right page

#### Scenario: Narrow viewport stacks components

- **WHEN** the user loads the chat page on a viewport 1024px wide or narrower but wider than 600px
- **THEN** the book keeps its two-page spread at full width
- **AND** the margin column collapses so notes render beneath the right page content
- **AND** the note input remains at the foot of the right page

#### Scenario: Phone layout

- **WHEN** the user loads the chat page on a viewport 600px wide or narrower
- **THEN** a single cream page inside a thin leather frame fills the width, with the book label top-left and the timer pill top-right
- **AND** the note input is a cream bar beneath the book with a red send button
- **AND** there is no Book/Chat tab bar

### Requirement: Recipe book displays as open two-page spread with leather cover

The recipe book SHALL render as an open book with a red leather cover frame containing two cream-colored pages side by side; while a recipe is open the left page shows the contents and the right page shows the recipe.

#### Scenario: Book structure renders correctly

- **WHEN** a recipe is loaded
- **THEN** the book displays with a red leather cover border, visible spine shadow down the center, and two pages (left and right)

#### Scenario: Left page shows ingredients

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the left page shows the contents in a single column (title, A–Z strip, letter groups) with the current recipe's entry marked `current`
- **AND** ingredients are not on the left page

#### Scenario: Right page shows preparation steps

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** the right page shows the recipe title with a 96×76 polaroid photo (or none), the meta line, an "ingredients:" header and list, a "method:" header and numbered steps where each step number is rendered in Kalam in the leather red and the step text in the serif
- **AND** the margin column sits to the right of the recipe body
- **AND** each ingredient line may pack up to three short items separated by " · " while every item keeps its own `.ingredient-item` span

#### Scenario: Phone shows one page

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** only the right page is visible, showing the title, polaroid, meta line and the active tab's content one item per line at 16px
- **AND** the footer reads "‹ previous recipe", the page number and "next recipe ›"

### Requirement: Recipe book pages scroll independently

Each page of the recipe book SHALL scroll independently when content exceeds the visible area.

#### Scenario: Left page scrolls for long ingredient lists

- **WHEN** the contents on the left page exceed the page's visible height
- **THEN** the left page content becomes scrollable while the right page remains independently scrollable

#### Scenario: Right page scrolls for long preparation steps

- **WHEN** the recipe on the right page exceeds the page's visible height
- **THEN** the right page content becomes scrollable while the left page remains independently scrollable
- **AND** the note input stays at the foot of the page and does not scroll with the content

### Requirement: Alphabet index navigation works across responsive layouts

The recipe book contents alphabet navigation SHALL be usable on the contents page and in the contents column beside an open recipe.

#### Scenario: Wide layout alphabet navigation

- **WHEN** the viewport is wider than 600px
- **THEN** the alphabet navigation is visible beneath the contents title, on the contents page and on the left page while a recipe is open
- **AND** selecting a letter jumps to the matching section within that page

#### Scenario: Narrow layout alphabet navigation

- **WHEN** the viewport is 600px wide or narrower and the contents page is shown
- **THEN** the alphabet navigation remains visible and clickable without overlapping contents entries
- **AND** selecting a letter jumps to the matching section

### Requirement: Typography uses Kalam handwritten font

Text in the recipe book and note input SHALL use two font families with appropriate fallbacks: Kalam (handwritten) for titles, section headers, letter headers, labels, step numbers, metadata, tabs, notes and the note input; Libre Baskerville (serif) for ingredient lines, method step text and contents entries.

#### Scenario: Font loads and applies

- **WHEN** the chat page loads
- **THEN** the page requests Kalam (300/400/700) and Libre Baskerville (400/700, italic 400) from Google Fonts
- **AND** headings, labels, metadata, tabs, notes and the note input render in Kalam (or cursive fallback)
- **AND** the ingredients list, method steps and contents entries render in Libre Baskerville (or Georgia / serif fallback)

#### Scenario: Body text stays readable on paper

- **WHEN** serif body text is rendered on the page background
- **THEN** it is at least 14px and no lighter than the `--color-ink-light` token

## REMOVED Requirements

### Requirement: Notepad component displays chat messages on aged paper

**Reason**: The AI now writes into the book as margin notes and the full thread lives in the Notes tab, so a separate transcript panel duplicates content and takes space from the book.

**Migration**: Anything that read `#messages` or `.message` elements reads `#page-margin .margin-note` for the latest replies or `.notes-thread` (Notes tab) for the full thread. The "User:" / "AI:" prefixes are gone; entries are distinguished by `data-kind`.

### Requirement: Notepad content scrolls independently

**Reason**: The notepad no longer exists; the Notes tab renders inside the right page, which already scrolls independently.

**Migration**: Long threads scroll within the right page (`#page-right`) when the Notes tab is active.

## ADDED Requirements

### Requirement: Note input lives in the book

The chat input SHALL be a single "note to the cook" control attached to the book, replacing the notepad input.

#### Scenario: Desktop note input

- **WHEN** the viewport is wider than 600px
- **THEN** a `.note-input` with a pencil icon, a textarea with placeholder "Write a note to the cook…", a paperclip attach button and the current page number sits at the foot of the right page

#### Scenario: Phone note input

- **WHEN** the viewport is 600px wide or narrower
- **THEN** the `.note-input` is a cream bar beneath the book with a red send button, and every control has at least a 44px touch target

#### Scenario: Existing input ids are preserved

- **WHEN** the chat page loads
- **THEN** the elements `#message-input`, `#clipboard-button`, `#image-upload`, `#image-attachment` and `#loading` exist inside `.note-input`
- **AND** image paste, image upload and the loading indicator work as before

#### Scenario: Page number follows the open page

- **WHEN** a recipe at position i in the alphabetical list is open
- **THEN** the note input shows "p. N" where N = 2 * i + 3
- **AND** on the contents page it shows "p. 1"

#### Scenario: Sending a note

- **WHEN** the user presses Enter (without Shift) or taps the send button
- **THEN** the note is sent and the textarea is cleared
- **AND** error toasts for oversized images appear inside `.note-input`

### Requirement: Phone page tabs

On phones the recipe page SHALL offer three paper tabs on its top edge — Ingredients, Method, Notes — switched by tap only.

#### Scenario: Tabs render on a recipe

- **WHEN** a recipe is displayed on a viewport 600px wide or narrower
- **THEN** `.page-tabs` shows three tabs; the active tab is cream and joined to the page, inactive tabs are tan and brown
- **AND** the Ingredients tab is active when a recipe is opened

#### Scenario: Tapping a tab switches content

- **WHEN** the user taps Method
- **THEN** the page crossfades over 200ms to show the method steps and hides the ingredients
- **AND** the last three margin notes render beneath the visible content

#### Scenario: Notes tab shows the full thread

- **WHEN** the user taps Notes
- **THEN** the page shows `.notes-thread` with every entry of the session's chat thread in order (user notes and replies)

#### Scenario: Tabs are tap only

- **WHEN** the user swipes horizontally on the recipe page
- **THEN** the swipe navigates between recipes as before
- **AND** the active tab does not change

#### Scenario: Tabs hidden off the recipe page

- **WHEN** the contents page or a meal plan is displayed
- **THEN** `.page-tabs` is not shown

### Requirement: Right page edge tabs

On viewports wider than 600px the right page SHALL carry edge tabs Ingredients, Method and Notes on its outer edge.

#### Scenario: Edge tabs render on a recipe

- **WHEN** a recipe is displayed on a viewport wider than 600px
- **THEN** `.edge-tabs` shows three coloured tabs on the right outer edge of the right page

#### Scenario: Ingredients and Method scroll the page

- **WHEN** the user clicks Ingredients or Method
- **THEN** the right page scrolls so that section's header is at the top of the visible area
- **AND** the clicked tab is marked active

#### Scenario: Notes shows the thread

- **WHEN** the user clicks Notes
- **THEN** the right page shows `.notes-thread` in place of the recipe body until Ingredients or Method is clicked
- **AND** the margin column and note input remain in place

#### Scenario: Edge tabs hidden off the recipe page

- **WHEN** the contents page or a meal plan is displayed
- **THEN** `.edge-tabs` is not shown
