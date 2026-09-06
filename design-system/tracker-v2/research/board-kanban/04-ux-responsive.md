# UX domain — responsive and mobile board patterns

## RESP-1 horizontal scroll region mobile
### COMMAND
```
search.py horizontal scroll region mobile --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** horizontal scroll region mobile
**Source:** ux-guidelines.csv | **Found:** 5 results

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
- **Category:** Navigation
- **Issue:** Smooth Scroll
- **Platform:** Web
- **Description:** Anchor links should scroll smoothly to target section
- **Do:** Use scroll-behavior: smooth on html element
- **Don't:** Jump directly without transition
- **Code Example Good:** html { scroll-behavior: smooth; }
- **Code Example Bad:** <a href='#section'> without CSS
- **Severity:** High

### Result 3
- **Category:** Accessibility
- **Issue:** Motion Sensitivity
- **Platform:** All
- **Description:** Parallax/Scroll-jacking causes nausea
- **Do:** Honor prefers-reduced-motion and present the final readable state without parallax or scroll-jacking
- **Don't:** Force scroll effects
- **Code Example Good:** @media (prefers-reduced-motion)
- **Code Example Bad:** ScrollTrigger.create()
- **Severity:** High

### Result 4
- **Category:** Layout
- **Issue:** Long Token Wrapping
- **Platform:** Web
- **Description:** URLs identifiers and user content must not force horizontal overflow
- **Do:** Use overflow-wrap anywhere and let flex or grid text children shrink
- **Don't:** Apply word-break break-all to all prose
- **Code Example Good:** .token { min-inline-size: 0; overflow-wrap: anywhere; }
- **Code Example Bad:** .token { white-space: nowrap; }
- **Severity:** High

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

## RESP-2 swipe gesture conflicts main content
### COMMAND
```
search.py swipe gesture conflict vertical scroll --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** swipe gesture conflict vertical scroll
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Touch
- **Issue:** Gesture Conflicts
- **Platform:** Mobile
- **Description:** Custom gestures can conflict with system
- **Do:** Avoid horizontal swipe on main content
- **Don't:** Override system gestures
- **Code Example Good:** Vertical scroll primary
- **Code Example Bad:** Horizontal swipe carousel only
- **Severity:** Medium

### Result 2
- **Category:** Navigation
- **Issue:** Smooth Scroll
- **Platform:** Web
- **Description:** Anchor links should scroll smoothly to target section
- **Do:** Use scroll-behavior: smooth on html element
- **Don't:** Jump directly without transition
- **Code Example Good:** html { scroll-behavior: smooth; }
- **Code Example Bad:** <a href='#section'> without CSS
- **Severity:** High

### Result 3
- **Category:** Responsive
- **Issue:** Horizontal Scroll
- **Platform:** Web
- **Description:** Avoid horizontal scrolling
- **Do:** Ensure content fits viewport width
- **Don't:** Content wider than viewport
- **Code Example Good:** max-w-full overflow-x-hidden
- **Code Example Bad:** Horizontal scrollbar on mobile
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

## RESP-3 mobile first breakpoint layout
### COMMAND
```
search.py mobile first breakpoint consistency --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** mobile first breakpoint consistency
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Responsive
- **Issue:** Mobile First
- **Platform:** Web
- **Description:** Design for mobile then enhance for larger
- **Do:** Start with mobile styles then add breakpoints
- **Don't:** Desktop-first causing mobile issues
- **Code Example Good:** Default mobile + md: lg: xl:
- **Code Example Bad:** Desktop default + max-width queries
- **Severity:** Medium

### Result 2
- **Category:** Responsive
- **Issue:** Breakpoint Testing
- **Platform:** Web
- **Description:** Test at all common screen sizes
- **Do:** Test at 320 375 414 768 1024 1440
- **Don't:** Only test on your device
- **Code Example Good:** Multiple device testing
- **Code Example Bad:** Single device development
- **Severity:** Medium

### Result 3
- **Category:** Performance
- **Issue:** Render Blocking
- **Platform:** Web
- **Description:** CSS/JS can block first paint
- **Do:** Inline critical CSS defer non-critical
- **Don't:** Large blocking CSS files
- **Code Example Good:** Critical CSS inline
- **Code Example Bad:** All CSS in head
- **Severity:** Medium

### Result 4
- **Category:** Forms
- **Issue:** Mobile Keyboards
- **Platform:** Mobile
- **Description:** Show appropriate keyboard for input type
- **Do:** Use inputmode attribute
- **Don't:** Default keyboard for all inputs
- **Code Example Good:** inputmode='numeric'
- **Code Example Bad:** Text keyboard for numbers
- **Severity:** Medium

### Result 5
- **Category:** Touch
- **Issue:** Pull to Refresh
- **Platform:** Mobile
- **Description:** Accidental refresh is frustrating
- **Do:** Disable where not needed
- **Don't:** Enable by default everywhere
- **Code Example Good:** overscroll-behavior: contain
- **Code Example Bad:** Default overscroll
- **Severity:** Low

```

## RESP-4 sticky header offset obscured
### COMMAND
```
search.py sticky header focus not obscured --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** sticky header focus not obscured
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Accessibility
- **Issue:** Focus Not Obscured (Enhanced)
- **Platform:** Web
- **Description:** WCAG 2.2 AAA requires keyboard focus to remain fully visible
- **Do:** Keep the entire focused component unobscured by author-created content
- **Don't:** Present this enhanced AAA criterion as an AA requirement or allow persistent UI to hide any part of focus
- **Code Example Good:** close persistent overlay before focus moves behind it
- **Code Example Bad:** sticky footer covers half the focused button
- **Severity:** Medium

### Result 2
- **Category:** Accessibility
- **Issue:** Focus Not Obscured (Minimum)
- **Platform:** Web
- **Description:** WCAG 2.2 AA requires keyboard focus to remain at least partially visible
- **Do:** Offset sticky UI with scroll-padding and dismiss or move persistent overlays
- **Don't:** Let headers footers banners or chat widgets fully cover focus
- **Code Example Good:** scroll-padding-top: var(--header-height)
- **Code Example Bad:** fixed overlay covers :focus
- **Severity:** High

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
- **Category:** Accessibility
- **Issue:** Focus Appearance
- **Platform:** Web
- **Description:** WCAG 2.2 AAA defines minimum area and contrast for focus indicators
- **Do:** Use an indicator at least as large as a 2 CSS px perimeter with 3:1 state contrast
- **Don't:** Present this enhanced AAA criterion as an AA requirement or use a thin low-contrast outline
- **Code Example Good:** outline: 2px solid currentColor; outline-offset: 2px
- **Code Example Bad:** box-shadow: 0 0 1px low-contrast
- **Severity:** Medium

### Result 5
- **Category:** Interaction
- **Issue:** Focus States
- **Platform:** All
- **Description:** Keyboard focus, including controls inside a modal, needs a visible indicator
- **Do:** Use a visible focus ring on every interactive control, including modal controls
- **Don't:** Remove focus outline without replacement
- **Code Example Good:** focus:ring-2 focus:ring-blue-500
- **Code Example Bad:** outline-none without alternative
- **Severity:** High

```

## RESP-5 scroll snap carousel columns
### COMMAND
```
search.py scroll snap paging columns --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** scroll snap paging columns
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Navigation
- **Issue:** Smooth Scroll
- **Platform:** Web
- **Description:** Anchor links should scroll smoothly to target section
- **Do:** Use scroll-behavior: smooth on html element
- **Don't:** Jump directly without transition
- **Code Example Good:** html { scroll-behavior: smooth; }
- **Code Example Bad:** <a href='#section'> without CSS
- **Severity:** High

### Result 2
- **Category:** Responsive
- **Issue:** Horizontal Scroll
- **Platform:** Web
- **Description:** Avoid horizontal scrolling
- **Do:** Ensure content fits viewport width
- **Don't:** Content wider than viewport
- **Code Example Good:** max-w-full overflow-x-hidden
- **Code Example Bad:** Horizontal scrollbar on mobile
- **Severity:** High

### Result 3
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

