## UX-4 empty loading error states
### COMMAND
```
search.py empty state skeleton loading --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** empty state skeleton loading
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
- **Category:** Feedback
- **Issue:** Loading Indicators
- **Platform:** All
- **Description:** Loading feedback should match the expected wait and avoid flashing for near-instant work
- **Do:** Follow platform and component guidance; preserve layout focus and accessible busy status
- **Don't:** Apply one timing threshold to every operation or leave long waits unexplained
- **Code Example Good:** Stable skeleton or progress with aria-busy
- **Code Example Bad:** Flickering spinner or frozen UI
- **Severity:** High

### Result 3
- **Category:** Performance
- **Issue:** Lazy Loading
- **Platform:** All
- **Description:** Load content as needed
- **Do:** Lazy load below-fold images and content
- **Don't:** Load everything upfront
- **Code Example Good:** loading='lazy'
- **Code Example Bad:** All images eager load
- **Severity:** Medium

### Result 4
- **Category:** Layout
- **Issue:** Content Jumping
- **Platform:** Web
- **Description:** Images badges validation text and skeleton replacements can shift nearby content when they update
- **Do:** Reserve appropriate space or keep async states in a stable content-driven container
- **Don't:** Insert compact text or media without a layout strategy
- **Code Example Good:** aspect-ratio for media; stable count slot for badges
- **Code Example Bad:** Badge insertion pushes toolbar actions
- **Severity:** High

### Result 5
- **Category:** Navigation
- **Issue:** Active State
- **Platform:** All
- **Description:** Current page/section should be visually indicated
- **Do:** Highlight active nav item with color/underline
- **Don't:** No visual feedback on current location
- **Code Example Good:** text-primary border-b-2
- **Code Example Bad:** All links same style
- **Severity:** Medium

```

## UX-5 reduced motion
### COMMAND
```
search.py prefers reduced motion animation --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** prefers reduced motion animation
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Animation
- **Issue:** Reduced Motion
- **Platform:** All
- **Description:** Respect user's motion preferences
- **Do:** Check prefers-reduced-motion media query
- **Don't:** Ignore accessibility motion settings
- **Code Example Good:** @media (prefers-reduced-motion: reduce)
- **Code Example Bad:** No motion query check
- **Severity:** High

### Result 2
- **Category:** Animation
- **Issue:** Excessive Motion
- **Platform:** All
- **Description:** Too many animations cause distraction and motion sickness
- **Do:** Animate 1-2 key elements per view maximum
- **Don't:** Animate everything that moves
- **Code Example Good:** Single hero animation
- **Code Example Bad:** animate-bounce on 5+ elements
- **Severity:** High

### Result 3
- **Category:** Animation
- **Issue:** Duration Timing
- **Platform:** All
- **Description:** Motion duration depends on distance complexity platform and user context
- **Do:** Use shared motion tokens and test that feedback stays responsive
- **Don't:** Present 150-300ms or any cutoff as a universal requirement
- **Code Example Good:** transition-colors duration-200
- **Code Example Bad:** One duration copied to every transition
- **Severity:** Medium

### Result 4
- **Category:** Animation
- **Issue:** Continuous Animation
- **Platform:** All
- **Description:** Infinite animations are distracting
- **Do:** Use for loading indicators only
- **Don't:** Use for decorative elements
- **Code Example Good:** animate-spin on loader
- **Code Example Bad:** animate-bounce on icons
- **Severity:** Medium

```

## UX-6 focus route change
### COMMAND
```
search.py focus on route change main content --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** focus on route change main content
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Accessibility
- **Issue:** Focus Appearance
- **Platform:** Web
- **Description:** WCAG 2.2 AAA defines minimum area and contrast for focus indicators
- **Do:** Use an indicator at least as large as a 2 CSS px perimeter with 3:1 state contrast
- **Don't:** Present this enhanced AAA criterion as an AA requirement or use a thin low-contrast outline
- **Code Example Good:** outline: 2px solid currentColor; outline-offset: 2px
- **Code Example Bad:** box-shadow: 0 0 1px low-contrast
- **Severity:** Medium

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
- **Issue:** Focus Not Obscured (Enhanced)
- **Platform:** Web
- **Description:** WCAG 2.2 AAA requires keyboard focus to remain fully visible
- **Do:** Keep the entire focused component unobscured by author-created content
- **Don't:** Present this enhanced AAA criterion as an AA requirement or allow persistent UI to hide any part of focus
- **Code Example Good:** close persistent overlay before focus moves behind it
- **Code Example Bad:** sticky footer covers half the focused button
- **Severity:** Medium

### Result 4
- **Category:** Accessibility
- **Issue:** Focus Not Obscured (Minimum)
- **Platform:** Web
- **Description:** WCAG 2.2 AA requires keyboard focus to remain at least partially visible
- **Do:** Offset sticky UI with scroll-padding and dismiss or move persistent overlays
- **Don't:** Let headers footers banners or chat widgets fully cover focus
- **Code Example Good:** scroll-padding-top: var(--header-height)
- **Code Example Bad:** fixed overlay covers :focus
- **Severity:** High

```

## UX-7 search accessible
### COMMAND
```
search.py search accessible recent queries --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** search accessible recent queries
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Search
- **Issue:** No Results
- **Platform:** Web
- **Description:** Dead ends frustrate users
- **Do:** Show 'No results' with suggestions
- **Don't:** Blank screen or '0 results'
- **Code Example Good:** Try searching for X instead
- **Code Example Bad:** No results found.
- **Severity:** Medium

### Result 2
- **Category:** Search
- **Issue:** Autocomplete
- **Platform:** Web
- **Description:** Help users find results faster
- **Do:** Show predictions as user types
- **Don't:** Require full type and enter
- **Code Example Good:** Debounced fetch + dropdown
- **Code Example Bad:** No suggestions
- **Severity:** Medium

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
- **Category:** Accessibility
- **Issue:** Compact Control Semantics
- **Platform:** Web
- **Description:** Interactive chips need a native role accessible name state keyboard operation and visible focus
- **Do:** Prefer a button and expose pressed or selected state that matches the visible label
- **Don't:** Use a clickable div or reveal the only action on hover
- **Code Example Good:** <button aria-pressed='true'>Open now</button>
- **Code Example Bad:** <div class='selected' onclick='toggle()'>Open now</div>
- **Severity:** Critical

```

## UX-8 information density scanning
### COMMAND
```
search.py information density scanning visual hierarchy --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** information density scanning visual hierarchy
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Typography
- **Issue:** Font Size Scale
- **Platform:** All
- **Description:** Consistent type hierarchy aids scanning
- **Do:** Use consistent modular scale
- **Don't:** Random font sizes
- **Code Example Good:** Type scale (12 14 16 18 24 32)
- **Code Example Bad:** Arbitrary sizes
- **Severity:** Medium

### Result 2
- **Category:** Interaction
- **Issue:** Hover States
- **Platform:** Web
- **Description:** Visual feedback on interactive elements
- **Do:** Change cursor and add subtle visual change
- **Don't:** No hover feedback on clickable elements
- **Code Example Good:** hover:bg-gray-100 cursor-pointer
- **Code Example Bad:** No hover style
- **Severity:** Medium

### Result 3
- **Category:** Accessibility
- **Issue:** Color Only
- **Platform:** All
- **Description:** Don't convey information by color alone
- **Do:** Use icons/text in addition to color
- **Don't:** Red/green only for error/success
- **Code Example Good:** Red text + error icon
- **Code Example Bad:** Red border only for error
- **Severity:** High

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
- **Category:** Accessibility
- **Issue:** Heading Hierarchy
- **Platform:** Web
- **Description:** Screen readers use headings for navigation
- **Do:** Use sequential heading levels h1-h6
- **Don't:** Skip heading levels or misuse for styling
- **Code Example Good:** h1 then h2 then h3
- **Code Example Bad:** h1 then h4
- **Severity:** Medium

```

