## DRAG-1 accessible drag and reorder
### COMMAND
```
search.py dragging movements single pointer alternative --domain ux -n 6
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

## DRAG-2 drag threshold affordance
### COMMAND
```
search.py drag threshold affordance reorder --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** drag threshold affordance reorder
**Source:** ux-guidelines.csv | **Found:** 2 results

### Result 1
- **Category:** Forms
- **Issue:** Input Affordance
- **Platform:** All
- **Description:** Inputs should look interactive
- **Do:** Use distinct input styling
- **Don't:** Inputs that look like plain text
- **Code Example Good:** Border/background on inputs
- **Code Example Bad:** Borderless inputs
- **Severity:** Medium

### Result 2
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

