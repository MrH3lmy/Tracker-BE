# UX domain — information density and scanning

## DENS-1 information density scanning
### COMMAND
```
search.py information density scannable list --domain ux -n 6
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** information density scannable list
**Source:** ux-guidelines.csv | **Found:** 2 results

### Result 1
- **Category:** Accessibility
- **Issue:** Color Only
- **Platform:** All
- **Description:** Don't convey information by color alone
- **Do:** Use icons/text in addition to color
- **Don't:** Red/green only for error/success
- **Code Example Good:** Red text + error icon
- **Code Example Bad:** Red border only for error
- **Severity:** High

### Result 2
- **Category:** Forms
- **Issue:** Redundant Entry
- **Platform:** All
- **Description:** WCAG 2.2 A avoids requiring the same information twice in one process
- **Do:** Auto-populate prior values or let users select previously entered information
- **Don't:** Ask users to retype the same address or account data without necessity
- **Code Example Good:** reuse confirmed shipping address
- **Code Example Bad:** repeat full address form
- **Severity:** Medium

```

## DENS-2 visual hierarchy card content
### COMMAND
```
search.py visual hierarchy primary secondary content --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** visual hierarchy primary secondary content
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
- **Category:** Navigation
- **Issue:** Breadcrumbs
- **Platform:** Web
- **Description:** Show user location in site hierarchy
- **Do:** Use for sites with 3+ levels of depth
- **Don't:** Use for flat single-level sites
- **Code Example Good:** Home > Category > Product
- **Code Example Bad:** Only on deep nested pages
- **Severity:** Low

### Result 3
- **Category:** Accessibility
- **Issue:** Heading Hierarchy
- **Platform:** Web
- **Description:** Screen readers use headings for navigation
- **Do:** Use sequential heading levels h1-h6
- **Don't:** Skip heading levels or misuse for styling
- **Code Example Good:** h1 then h2 then h3
- **Code Example Bad:** h1 then h4
- **Severity:** Medium

### Result 4
- **Category:** Typography
- **Issue:** Font Size Scale
- **Platform:** All
- **Description:** Consistent type hierarchy aids scanning
- **Do:** Use consistent modular scale
- **Don't:** Random font sizes
- **Code Example Good:** Type scale (12 14 16 18 24 32)
- **Code Example Bad:** Arbitrary sizes
- **Severity:** Medium

### Result 5
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

## DENS-3 badge chip label wraps
### COMMAND
```
search.py badge chip label wraps --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** badge chip label wraps
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Content
- **Issue:** Compact Label Overflow
- **Platform:** All
- **Description:** A badge chip or pill label should stay whole on one line when practical and disclose unavoidable truncation
- **Do:** Bound only unpredictable values; use nowrap with a shrinkable label; expose full text to keyboard pointer and touch users
- **Don't:** Let one compact label wrap to a second line or use a hover-only tooltip
- **Code Example Good:** Flexible label with min-width 0 and an operable full-value disclosure
- **Code Example Bad:** Fixed-width badge wraps to second line or clips with title-only recovery
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Contextual Live Badge Updates
- **Platform:** Web
- **Description:** Async badge and count changes should announce a meaningful contextual status without moving focus
- **Do:** Use one appropriate atomic status message such as 3 items in cart
- **Don't:** Announce a bare number or make every badge a competing live region
- **Code Example Good:** <span role='status' aria-atomic='true'>3 items in cart</span>
- **Code Example Bad:** <span aria-live='polite'>3</span>
- **Severity:** High

### Result 3
- **Category:** Forms
- **Issue:** Input Labels
- **Platform:** All
- **Description:** Every input needs a visible label
- **Do:** Always show label above or beside input
- **Don't:** Placeholder as only label
- **Code Example Good:** <label>Email</label><input>
- **Code Example Bad:** placeholder='Email' only
- **Severity:** High

### Result 4
- **Category:** Content
- **Issue:** Compact Label Semantics
- **Platform:** All
- **Description:** Badges communicate state while chips or tags represent values or actions
- **Do:** Choose static or interactive markup from the label's meaning and ownership
- **Don't:** Make every pill clickable or encode status with color alone
- **Code Example Good:** <span class='status'>Pending</span>
- **Code Example Bad:** <div class='pill' onclick='toggle()'>Pending</div>
- **Severity:** High

```

## DENS-4 overflow menu secondary actions
### COMMAND
```
search.py overflow menu secondary actions --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** overflow menu secondary actions
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Layout
- **Issue:** Overflow Hidden
- **Platform:** Web
- **Description:** Hidden overflow can clip important content
- **Do:** Test all content fits within containers
- **Don't:** Blindly apply overflow-hidden
- **Code Example Good:** overflow-auto with scroll
- **Code Example Bad:** overflow-hidden truncating content
- **Severity:** Medium

### Result 2
- **Category:** Responsive
- **Issue:** Table Handling
- **Platform:** Web
- **Description:** Tables can overflow on mobile
- **Do:** Use horizontal scroll or card layout
- **Don't:** Wide tables breaking layout
- **Code Example Good:** overflow-x-auto wrapper
- **Code Example Bad:** Table overflows viewport
- **Severity:** Medium

### Result 3
- **Category:** Feedback
- **Issue:** Confirmation Messages
- **Platform:** All
- **Description:** Confirm successful actions
- **Do:** Brief success message
- **Don't:** Silent success
- **Code Example Good:** Saved successfully toast
- **Code Example Bad:** No confirmation
- **Severity:** Medium

### Result 4
- **Category:** Interaction
- **Issue:** Success Feedback
- **Platform:** All
- **Description:** Confirm successful actions to users
- **Do:** Show success message or visual change
- **Don't:** No confirmation of completed action
- **Code Example Good:** Toast notification or checkmark
- **Code Example Bad:** Action completes silently
- **Severity:** Medium

```

## DENS-5 progressive disclosure detail
### COMMAND
```
search.py progressive disclosure hide detail --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** progressive disclosure hide detail
**Source:** ux-guidelines.csv | **Found:** 1 results

### Result 1
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

