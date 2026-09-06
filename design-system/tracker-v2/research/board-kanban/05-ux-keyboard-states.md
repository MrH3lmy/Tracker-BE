# UX domain — keyboard access and board states

## KBD-1 keyboard navigation roving focus
### COMMAND
```
search.py keyboard navigation arrow keys --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** keyboard navigation arrow keys
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Accessibility
- **Issue:** Keyboard Navigation
- **Platform:** Web
- **Description:** Web users need complete keyboard navigation with visible focus on every operable control
- **Do:** Keep tab order aligned with visual order and test every action without a pointer
- **Don't:** Keyboard traps or illogical tab order
- **Code Example Good:** tabIndex for custom order
- **Code Example Bad:** Unreachable elements
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Skip Links
- **Platform:** Web
- **Description:** Allow keyboard users to skip navigation
- **Do:** Provide skip to main content link
- **Don't:** No skip link on nav-heavy pages
- **Code Example Good:** Skip to main content link
- **Code Example Bad:** 100 tabs to reach content
- **Severity:** Medium

### Result 3
- **Category:** Navigation
- **Issue:** Sticky Navigation
- **Platform:** Web
- **Description:** Fixed nav should not obscure content
- **Do:** Add padding-top to body equal to nav height
- **Don't:** Let nav overlap first section content
- **Code Example Good:** pt-20 (if nav is h-20)
- **Code Example Bad:** No padding compensation
- **Severity:** Medium

### Result 4
- **Category:** Navigation
- **Issue:** Breadcrumbs
- **Platform:** Web
- **Description:** Show user location in site hierarchy
- **Do:** Use for sites with 3+ levels of depth
- **Don't:** Use for flat single-level sites
- **Code Example Good:** Home > Category > Product
- **Code Example Bad:** Only on deep nested pages
- **Severity:** Low

### Result 5
- **Category:** Forms
- **Issue:** Mobile Keyboards
- **Platform:** Mobile
- **Description:** Show appropriate keyboard for input type
- **Do:** Use inputmode attribute
- **Don't:** Default keyboard for all inputs
- **Code Example Good:** inputmode='numeric'
- **Code Example Bad:** Text keyboard for numbers
- **Severity:** Medium

```

## KBD-2 skip repetitive content bypass block
### COMMAND
```
search.py skip link bypass repeated blocks --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** skip link bypass repeated blocks
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Accessibility
- **Issue:** Skip Links
- **Platform:** Web
- **Description:** Allow keyboard users to skip navigation
- **Do:** Provide skip to main content link
- **Don't:** No skip link on nav-heavy pages
- **Code Example Good:** Skip to main content link
- **Code Example Bad:** 100 tabs to reach content
- **Severity:** Medium

### Result 2
- **Category:** Onboarding
- **Issue:** User Freedom
- **Platform:** All
- **Description:** Users should be able to skip tutorials
- **Do:** Provide Skip and Back buttons
- **Don't:** Force linear unskippable tour
- **Code Example Good:** Skip Tutorial button
- **Code Example Bad:** Locked overlay until finished
- **Severity:** Medium

### Result 3
- **Category:** Accessibility
- **Issue:** Consistent Help
- **Platform:** All
- **Description:** WCAG 2.2 A requires repeated help mechanisms to stay in the same relative order
- **Do:** Keep contact self-help and automated help in consistent locations
- **Don't:** Move help controls to different locations on each page
- **Code Example Good:** shared header help menu
- **Code Example Bad:** page-specific help placement
- **Severity:** Medium

```

## KBD-3 accessible name icon button
### COMMAND
```
search.py icon button accessible label --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** icon button accessible label
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Navigation
- **Issue:** Back Button
- **Platform:** Mobile
- **Description:** Users expect back to work predictably
- **Do:** Preserve navigation history properly
- **Don't:** Break browser/app back button behavior
- **Code Example Good:** history.pushState()
- **Code Example Bad:** location.replace()
- **Severity:** High

### Result 2
- **Category:** Content
- **Issue:** Compact Label Overflow
- **Platform:** All
- **Description:** A badge chip or pill label should stay whole on one line when practical and disclose unavoidable truncation
- **Do:** Bound only unpredictable values; use nowrap with a shrinkable label; expose full text to keyboard pointer and touch users
- **Don't:** Let one compact label wrap to a second line or use a hover-only tooltip
- **Code Example Good:** Flexible label with min-width 0 and an operable full-value disclosure
- **Code Example Bad:** Fixed-width badge wraps to second line or clips with title-only recovery
- **Severity:** High

### Result 3
- **Category:** Accessibility
- **Issue:** ARIA Labels
- **Platform:** All
- **Description:** Interactive elements need accessible names
- **Do:** Add aria-label for icon-only buttons
- **Don't:** Icon buttons without labels
- **Code Example Good:** aria-label='Close menu'
- **Code Example Bad:** <button><Icon/></button>
- **Severity:** High

### Result 4
- **Category:** Forms
- **Issue:** Input Labels
- **Platform:** All
- **Description:** Every input needs a visible label
- **Do:** Always show label above or beside input
- **Don't:** Placeholder as only label
- **Code Example Good:** <label>Email</label><input>
- **Code Example Bad:** placeholder='Email' only
- **Severity:** High

```


# States
## STATE-1 empty state designed
### COMMAND
```
search.py empty state guidance action --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** empty state guidance action
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Feedback
- **Issue:** Empty States
- **Platform:** All
- **Description:** Guide users when no content exists
- **Do:** Show helpful message and action
- **Don't:** Blank empty screens
- **Code Example Good:** No items yet. Create one!
- **Code Example Bad:** Empty white space
- **Severity:** Medium

### Result 2
- **Category:** Touch
- **Issue:** Touch Target Size
- **Platform:** Mobile
- **Description:** Touch target guidance depends on platform and web context
- **Do:** Use 44pt on iOS and 48dp on Android; for web use the separate WCAG Target Size rule
- **Don't:** Treat one unit or minimum as universal across platforms
- **Code Example Good:** iOS 44pt; Android 48dp; Web 24 CSS px plus WCAG exceptions
- **Code Example Bad:** w-6 h-6 buttons
- **Severity:** High

### Result 3
- **Category:** Navigation
- **Issue:** Active State
- **Platform:** All
- **Description:** Current page/section should be visually indicated
- **Do:** Highlight active nav item with color/underline
- **Don't:** No visual feedback on current location
- **Code Example Good:** text-primary border-b-2
- **Code Example Bad:** All links same style
- **Severity:** Medium

### Result 4
- **Category:** Navigation
- **Issue:** Deep Linking
- **Platform:** All
- **Description:** URLs should reflect current state for sharing
- **Do:** Update URL on state/view changes
- **Don't:** Static URLs for dynamic content
- **Code Example Good:** Use query params or hash
- **Code Example Bad:** Single URL for all states
- **Severity:** Medium

### Result 5
- **Category:** Animation
- **Issue:** Cancellable State Transitions
- **Platform:** Web
- **Description:** Rapid compact-control changes can interrupt an in-flight transition
- **Do:** Cancel or replace prior motion; set the final semantic state directly and handle cancellation cleanup
- **Don't:** Depend on animationend or transitionend for required state correctness
- **Code Example Good:** previous?.cancel(); setSelected(next)
- **Code Example Bad:** Enable the chip only inside transitionend
- **Severity:** High

```

## STATE-2 loading skeleton layout shift
### COMMAND
```
search.py loading skeleton reserve space --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** loading skeleton reserve space
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Feedback
- **Issue:** Loading Indicators
- **Platform:** All
- **Description:** Loading feedback should match the expected wait and avoid flashing for near-instant work
- **Do:** Follow platform and component guidance; preserve layout focus and accessible busy status
- **Don't:** Apply one timing threshold to every operation or leave long waits unexplained
- **Code Example Good:** Stable skeleton or progress with aria-busy
- **Code Example Bad:** Flickering spinner or frozen UI
- **Severity:** High

### Result 2
- **Category:** Performance
- **Issue:** Lazy Loading
- **Platform:** All
- **Description:** Load content as needed
- **Do:** Lazy load below-fold images and content
- **Don't:** Load everything upfront
- **Code Example Good:** loading='lazy'
- **Code Example Bad:** All images eager load
- **Severity:** Medium

### Result 3
- **Category:** Layout
- **Issue:** Content Jumping
- **Platform:** Web
- **Description:** Images badges validation text and skeleton replacements can shift nearby content when they update
- **Do:** Reserve appropriate space or keep async states in a stable content-driven container
- **Don't:** Insert compact text or media without a layout strategy
- **Code Example Good:** aspect-ratio for media; stable count slot for badges
- **Code Example Bad:** Badge insertion pushes toolbar actions
- **Severity:** High

### Result 4
- **Category:** Layout
- **Issue:** Chip Collection Reflow
- **Platform:** All
- **Description:** Filter chips and editable value collections must preserve labels when space or text size changes
- **Do:** Wrap the collection or use an operable +n disclosure for hidden overflow values
- **Don't:** Force all chips into one clipped row or hide overflow values
- **Code Example Good:** <div class='chip-list'>{chips}</div> with flex-wrap
- **Code Example Bad:** <div class='chip-list' style='height:32px;overflow:hidden'>
- **Severity:** High

### Result 5
- **Category:** Animation
- **Issue:** Loading States
- **Platform:** All
- **Description:** Show feedback during async operations
- **Do:** Use skeleton screens or spinners
- **Don't:** Leave UI frozen with no feedback
- **Code Example Good:** animate-pulse skeleton
- **Code Example Bad:** Blank screen while loading
- **Severity:** High

```

## STATE-3 optimistic update error rollback
### COMMAND
```
search.py optimistic update failure feedback --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** optimistic update failure feedback
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Layout
- **Issue:** Content Jumping
- **Platform:** Web
- **Description:** Images badges validation text and skeleton replacements can shift nearby content when they update
- **Do:** Reserve appropriate space or keep async states in a stable content-driven container
- **Don't:** Insert compact text or media without a layout strategy
- **Code Example Good:** aspect-ratio for media; stable count slot for badges
- **Code Example Bad:** Badge insertion pushes toolbar actions
- **Severity:** High

### Result 2
- **Category:** Touch
- **Issue:** Haptic Feedback
- **Platform:** Mobile
- **Description:** Tactile feedback improves interaction feel
- **Do:** Use for confirmations and important actions
- **Don't:** Overuse vibration feedback
- **Code Example Good:** navigator.vibrate(10)
- **Code Example Bad:** Vibrate on every tap
- **Severity:** Low

### Result 3
- **Category:** AI Interaction
- **Issue:** Feedback Loop
- **Platform:** All
- **Description:** AI needs user feedback to improve
- **Do:** Thumps up/down or 'Regenerate'
- **Don't:** Static output only
- **Code Example Good:** Feedback component
- **Code Example Bad:** Read-only text
- **Severity:** Low

### Result 4
- **Category:** Feedback
- **Issue:** Loading Indicators
- **Platform:** All
- **Description:** Loading feedback should match the expected wait and avoid flashing for near-instant work
- **Do:** Follow platform and component guidance; preserve layout focus and accessible busy status
- **Don't:** Apply one timing threshold to every operation or leave long waits unexplained
- **Code Example Good:** Stable skeleton or progress with aria-busy
- **Code Example Bad:** Flickering spinner or frozen UI
- **Severity:** High

```

