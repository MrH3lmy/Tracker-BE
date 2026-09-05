# UX domain — drag and drop interaction design

## DND-1 dragging movements single pointer alternative
### COMMAND
```
search.py dragging movements single pointer alternative --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** dragging movements single pointer alternative
**Source:** ux-guidelines.csv | **Found:** 2 results

### Result 1
- **Category:** Accessibility
- **Issue:** Dragging Movements
- **Platform:** All
- **Description:** WCAG 2.2 AA requires a single-pointer alternative for author-controlled drag operations
- **Do:** Add buttons menus or tap-to-move controls and retain keyboard operation
- **Don't:** Make dragging the only way to reorder resize or select
- **Code Example Good:** Move up and Move down buttons beside drag handle
- **Code Example Bad:** drag handle only
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Target Size (Minimum)
- **Platform:** Web
- **Description:** WCAG 2.2 AA requires 24 CSS px pointer targets or an applicable exception
- **Do:** Use at least 24 by 24 CSS px or verify spacing equivalent inline user-agent or essential exceptions
- **Don't:** Assume native 44pt or 48dp guidance defines web conformance
- **Code Example Good:** min-width: 24px; min-height: 24px
- **Code Example Bad:** tiny adjacent icon buttons
- **Severity:** High

```

## DND-2 drag drop drop target feedback
### COMMAND
```
search.py drag drop target visual feedback --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** drag drop target visual feedback
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Interaction
- **Issue:** Hover States
- **Platform:** Web
- **Description:** Visual feedback on interactive elements
- **Do:** Change cursor and add subtle visual change
- **Don't:** No hover feedback on clickable elements
- **Code Example Good:** hover:bg-gray-100 cursor-pointer
- **Code Example Bad:** No hover style
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
- **Category:** Accessibility
- **Issue:** Dragging Movements
- **Platform:** All
- **Description:** WCAG 2.2 AA requires a single-pointer alternative for author-controlled drag operations
- **Do:** Add buttons menus or tap-to-move controls and retain keyboard operation
- **Don't:** Make dragging the only way to reorder resize or select
- **Code Example Good:** Move up and Move down buttons beside drag handle
- **Code Example Bad:** drag handle only
- **Severity:** High

### Result 4
- **Category:** Navigation
- **Issue:** Smooth Scroll
- **Platform:** Web
- **Description:** Anchor links should scroll smoothly to target section
- **Do:** Use scroll-behavior: smooth on html element
- **Don't:** Jump directly without transition
- **Code Example Good:** html { scroll-behavior: smooth; }
- **Code Example Bad:** <a href='#section'> without CSS
- **Severity:** High

### Result 5
- **Category:** Touch
- **Issue:** Haptic Feedback
- **Platform:** Mobile
- **Description:** Tactile feedback improves interaction feel
- **Do:** Use for confirmations and important actions
- **Don't:** Overuse vibration feedback
- **Code Example Good:** navigator.vibrate(10)
- **Code Example Bad:** Vibrate on every tap
- **Severity:** Low

```

## DND-3 drag handle affordance grab cursor
### COMMAND
```
search.py drag handle affordance grab cursor --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** drag handle affordance grab cursor
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Content
- **Issue:** Truncation
- **Platform:** All
- **Description:** Handle long content gracefully
- **Do:** Truncate with ellipsis and expand option
- **Don't:** Overflow or broken layout
- **Code Example Good:** line-clamp-2 with expand
- **Code Example Bad:** Overflow or cut off
- **Severity:** Medium

### Result 2
- **Category:** Forms
- **Issue:** Input Affordance
- **Platform:** All
- **Description:** Inputs should look interactive
- **Do:** Use distinct input styling
- **Don't:** Inputs that look like plain text
- **Code Example Good:** Border/background on inputs
- **Code Example Bad:** Borderless inputs
- **Severity:** Medium

### Result 3
- **Category:** Accessibility
- **Issue:** Dragging Movements
- **Platform:** All
- **Description:** WCAG 2.2 AA requires a single-pointer alternative for author-controlled drag operations
- **Do:** Add buttons menus or tap-to-move controls and retain keyboard operation
- **Don't:** Make dragging the only way to reorder resize or select
- **Code Example Good:** Move up and Move down buttons beside drag handle
- **Code Example Bad:** drag handle only
- **Severity:** High

```

## DND-4 reorder announce screen reader
### COMMAND
```
search.py reorder live region announcement --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** reorder live region announcement
**Source:** ux-guidelines.csv | **Found:** 1 results

### Result 1
- **Category:** Accessibility
- **Issue:** Contextual Live Badge Updates
- **Platform:** Web
- **Description:** Async badge and count changes should announce a meaningful contextual status without moving focus
- **Do:** Use one appropriate atomic status message such as 3 items in cart
- **Don't:** Announce a bare number or make every badge a competing live region
- **Code Example Good:** <span role='status' aria-atomic='true'>3 items in cart</span>
- **Code Example Bad:** <span aria-live='polite'>3</span>
- **Severity:** High

```

