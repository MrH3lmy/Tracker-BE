## UX-1 nav hierarchy
### COMMAND
```
search.py navigation hierarchy primary secondary --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** navigation hierarchy primary secondary
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Navigation
- **Issue:** Breadcrumbs
- **Platform:** Web
- **Description:** Show user location in site hierarchy
- **Do:** Use for sites with 3+ levels of depth
- **Don't:** Use for flat single-level sites
- **Code Example Good:** Home > Category > Product
- **Code Example Bad:** Only on deep nested pages
- **Severity:** Low

### Result 2
- **Category:** Accessibility
- **Issue:** Heading Hierarchy
- **Platform:** Web
- **Description:** Screen readers use headings for navigation
- **Do:** Use sequential heading levels h1-h6
- **Don't:** Skip heading levels or misuse for styling
- **Code Example Good:** h1 then h2 then h3
- **Code Example Bad:** h1 then h4
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
- **Category:** Accessibility
- **Issue:** Keyboard Navigation
- **Platform:** Web
- **Description:** Web users need complete keyboard navigation with visible focus on every operable control
- **Do:** Keep tab order aligned with visual order and test every action without a pointer
- **Don't:** Keyboard traps or illogical tab order
- **Code Example Good:** tabIndex for custom order
- **Code Example Bad:** Unreachable elements
- **Severity:** High

```

## UX-2 bottom nav limit
### COMMAND
```
search.py bottom nav limit mobile tabs --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** bottom nav limit mobile tabs
**Source:** ux-guidelines.csv | **Found:** 5 results

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
- **Category:** Navigation
- **Issue:** Sticky Navigation
- **Platform:** Web
- **Description:** Fixed nav should not obscure content
- **Do:** Add padding-top to body equal to nav height
- **Don't:** Let nav overlap first section content
- **Code Example Good:** pt-20 (if nav is h-20)
- **Code Example Bad:** No padding compensation
- **Severity:** Medium

### Result 3
- **Category:** Forms
- **Issue:** Mobile Keyboards
- **Platform:** Mobile
- **Description:** Show appropriate keyboard for input type
- **Do:** Use inputmode attribute
- **Don't:** Default keyboard for all inputs
- **Code Example Good:** inputmode='numeric'
- **Code Example Bad:** Text keyboard for numbers
- **Severity:** Medium

### Result 4
- **Category:** Responsive
- **Issue:** Mobile First
- **Platform:** Web
- **Description:** Design for mobile then enhance for larger
- **Do:** Start with mobile styles then add breakpoints
- **Don't:** Desktop-first causing mobile issues
- **Code Example Good:** Default mobile + md: lg: xl:
- **Code Example Bad:** Desktop default + max-width queries
- **Severity:** Medium

### Result 5
- **Category:** Accessibility
- **Issue:** Keyboard Navigation
- **Platform:** Web
- **Description:** Web users need complete keyboard navigation with visible focus on every operable control
- **Do:** Keep tab order aligned with visual order and test every action without a pointer
- **Don't:** Keyboard traps or illogical tab order
- **Code Example Good:** tabIndex for custom order
- **Code Example Bad:** Unreachable elements
- **Severity:** High

```

## UX-3 back behavior deep link
### COMMAND
```
search.py predictable back behavior deep linking --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** predictable back behavior deep linking
**Source:** ux-guidelines.csv | **Found:** 2 results

### Result 1
- **Category:** Navigation
- **Issue:** Deep Linking
- **Platform:** All
- **Description:** URLs should reflect current state for sharing
- **Do:** Update URL on state/view changes
- **Don't:** Static URLs for dynamic content
- **Code Example Good:** Use query params or hash
- **Code Example Bad:** Single URL for all states
- **Severity:** Medium

### Result 2
- **Category:** Navigation
- **Issue:** Back Button
- **Platform:** Mobile
- **Description:** Users expect back to work predictably
- **Do:** Preserve navigation history properly
- **Don't:** Break browser/app back button behavior
- **Code Example Good:** history.pushState()
- **Code Example Bad:** location.replace()
- **Severity:** High

```

