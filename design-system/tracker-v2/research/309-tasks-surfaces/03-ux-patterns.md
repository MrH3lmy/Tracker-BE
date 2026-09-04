## UX-A progressive disclosure editing
### COMMAND
```
search.py progressive disclosure form sections --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** progressive disclosure form sections
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Forms
- **Issue:** Submit Feedback
- **Platform:** All
- **Description:** Confirm form submission status
- **Do:** Show loading then success/error state
- **Don't:** No feedback after submit
- **Code Example Good:** Loading -> Success message
- **Code Example Bad:** Button click with no response
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Form Labels
- **Platform:** All
- **Description:** Inputs must have associated labels
- **Do:** Use label with for attribute or wrap input
- **Don't:** Placeholder-only inputs
- **Code Example Good:** <label for='email'>
- **Code Example Bad:** placeholder='Email' only
- **Severity:** High

### Result 3
- **Category:** Typography
- **Issue:** Heading Line Balance
- **Platform:** Web
- **Description:** Short multi-line headings may use balanced wrapping as a progressive visual heuristic
- **Do:** Bound the measure and test natural-wrap fallback across widths fonts and locales
- **Don't:** Promise an exact final line or insert blanket nonbreaking spaces or hardcoded br tags
- **Code Example Good:** .hero-title { max-inline-size: 20ch; text-wrap: balance; }
- **Code Example Bad:** Heading copy rewritten with forced last-line breaks
- **Severity:** Medium

```

## UX-B status severity not color alone
### COMMAND
```
search.py status severity indicator icon text --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** status severity indicator icon text
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Forms
- **Issue:** Submit Feedback
- **Platform:** All
- **Description:** Confirm form submission status
- **Do:** Show loading then success/error state
- **Don't:** No feedback after submit
- **Code Example Good:** Loading -> Success message
- **Code Example Bad:** Button click with no response
- **Severity:** High

### Result 2
- **Category:** Interaction
- **Issue:** Focus States
- **Platform:** All
- **Description:** Keyboard focus, including controls inside a modal, needs a visible indicator
- **Do:** Use a visible focus ring on every interactive control, including modal controls
- **Don't:** Remove focus outline without replacement
- **Code Example Good:** focus:ring-2 focus:ring-blue-500
- **Code Example Bad:** outline-none without alternative
- **Severity:** High

### Result 3
- **Category:** Accessibility
- **Issue:** Alt Text
- **Platform:** All
- **Description:** Images need text alternatives
- **Do:** Descriptive alt text for meaningful images
- **Don't:** Empty or missing alt attributes
- **Code Example Good:** alt='Dog playing in park'
- **Code Example Bad:** alt='' for content images
- **Severity:** High

### Result 4
- **Category:** Accessibility
- **Issue:** Text Reflow and Spacing
- **Platform:** Web
- **Description:** Text must remain available at narrow widths zoom and user spacing overrides
- **Do:** Use fluid sizes content-driven height and unitless line height
- **Don't:** Clip text in fixed-width or fixed-height boxes
- **Code Example Good:** .copy { inline-size: min(100%, 65ch); height: auto; line-height: 1.5; }
- **Code Example Bad:** .copy { width: 900px; height: 40px; overflow: hidden; }
- **Severity:** Critical

### Result 5
- **Category:** Content
- **Issue:** Essential Text Truncation
- **Platform:** All
- **Description:** Headings actions errors safety text and distinguishing names need complete access
- **Do:** Wrap stack resize or provide a visible full-detail path
- **Don't:** Clamp essential meaning only to make cards uniform
- **Code Example Good:** Action label wraps or opens full details
- **Code Example Bad:** Primary action shown only as an unexplained ellipsis
- **Severity:** Critical

```

## UX-C horizontal scroll region mobile
### COMMAND
```
search.py horizontal scroll region content fits --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** horizontal scroll region content fits
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Responsive
- **Issue:** Horizontal Scroll
- **Platform:** Web
- **Description:** Avoid horizontal scrolling
- **Do:** Ensure content fits viewport width
- **Don't:** Content wider than viewport
- **Code Example Good:** max-w-full overflow-x-hidden
- **Code Example Bad:** Horizontal scrollbar on mobile
- **Severity:** High

### Result 2
- **Category:** Layout
- **Issue:** Long Token Wrapping
- **Platform:** Web
- **Description:** URLs identifiers and user content must not force horizontal overflow
- **Do:** Use overflow-wrap anywhere and let flex or grid text children shrink
- **Don't:** Apply word-break break-all to all prose
- **Code Example Good:** .token { min-inline-size: 0; overflow-wrap: anywhere; }
- **Code Example Bad:** .token { white-space: nowrap; }
- **Severity:** High

### Result 3
- **Category:** Navigation
- **Issue:** Smooth Scroll
- **Platform:** Web
- **Description:** Anchor links should scroll smoothly to target section
- **Do:** Use scroll-behavior: smooth on html element
- **Don't:** Jump directly without transition
- **Code Example Good:** html { scroll-behavior: smooth; }
- **Code Example Bad:** <a href='#section'> without CSS
- **Severity:** High

### Result 4
- **Category:** Accessibility
- **Issue:** Motion Sensitivity
- **Platform:** All
- **Description:** Parallax/Scroll-jacking causes nausea
- **Do:** Honor prefers-reduced-motion and present the final readable state without parallax or scroll-jacking
- **Don't:** Force scroll effects
- **Code Example Good:** @media (prefers-reduced-motion)
- **Code Example Bad:** ScrollTrigger.create()
- **Severity:** High

```

## UX-D optimistic update undo
### COMMAND
```
search.py undo destructive action confirmation --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** undo destructive action confirmation
**Source:** ux-guidelines.csv | **Found:** 2 results

### Result 1
- **Category:** Interaction
- **Issue:** Confirmation Dialogs
- **Platform:** All
- **Description:** Prevent accidental destructive actions
- **Do:** Confirm before delete/irreversible actions
- **Don't:** Delete without confirmation
- **Code Example Good:** Are you sure modal
- **Code Example Bad:** Direct delete on click
- **Severity:** High

### Result 2
- **Category:** Feedback
- **Issue:** Confirmation Messages
- **Platform:** All
- **Description:** Confirm successful actions
- **Do:** Brief success message
- **Don't:** Silent success
- **Code Example Good:** Saved successfully toast
- **Code Example Bad:** No confirmation
- **Severity:** Medium

```

