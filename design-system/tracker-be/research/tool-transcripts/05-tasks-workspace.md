# Issue #304 — UI UX Pro Max raw search transcripts (Tasks workspace)

Skill: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill> (cloned at `src/ui-ux-pro-max`,
Python 3.11, stdlib only, no network). Every block below is unedited stdout from
`python3 scripts/search.py`, run from the skill root, in the order shown.

The `--design-system --persist --page tasks-workspace` run that produced
`../../pages/tasks-workspace.md` is recorded at the end of this file.

---

### task management workspace (product)
```bash
python3 scripts/search.py task management workspace productivity --domain product -n 3
```
```
## UI Pro Max Search Results
**Domain:** product | **Query:** task management workspace productivity
**Source:** products.csv | **Found:** 3 results

### Result 1
- **Product Type:** Productivity Tool
- **Keywords:** collaboration, productivity, project, task, tool, workflow
- **Primary Style Recommendation:** Flat Design + Micro-interactions
- **Secondary Styles:** Minimalism & Swiss Style , Soft UI Evolution
- **Landing Page Pattern:** Interactive Product Demo
- **Dashboard Style (if applicable):** Drill-Down Analytics
- **Color Palette Focus:** Clear hierarchy + functional colors

### Result 2
- **Product Type:** LMS (Learning Management System)
- **Keywords:** lms, course-management, learning-management, canvas, moodle, blackboard, enrollment, gradebook, syllabus, assignment-submit
- **Primary Style Recommendation:** Flat Design + Accessible & Ethical
- **Secondary Styles:** Minimalism & Swiss Style , Vibrant & Block-based
- **Landing Page Pattern:** Dashboard + Course Grid
- **Dashboard Style (if applicable):** Education Analytics Dashboard
- **Color Palette Focus:** Calm blue + course category colors + grade green + alert red

### Result 3
- **Product Type:** Event Management
- **Keywords:** conference, event, management, meetup, registration, ticket
- **Primary Style Recommendation:** Vibrant & Block-based + Motion-Driven
- **Secondary Styles:** Glassmorphism , Aurora UI
- **Landing Page Pattern:** Hero-Centric Design + Feature-Rich
- **Dashboard Style (if applicable):** Event Analytics
- **Color Palette Focus:** Event theme colors + Excitement accents

```

### work queue prioritization (ux)
```bash
python3 scripts/search.py work queue prioritization scanning --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** work queue prioritization scanning
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Category:** Navigation
- **Issue:** Back Button
- **Platform:** Mobile
- **Description:** Users expect back to work predictably
- **Do:** Preserve navigation history properly
- **Don't:** Break browser/app back button behavior
- **Code Example Good:** history.pushState()
- **Code Example Bad:** location.replace()
- **Severity:** High

### Result 3
- **Category:** Animation
- **Issue:** Hover vs Tap
- **Platform:** All
- **Description:** Hover effects don't work on touch devices
- **Do:** Use click/tap for primary interactions
- **Don't:** Rely only on hover for important actions
- **Code Example Good:** onClick handler
- **Code Example Bad:** onMouseEnter only
- **Severity:** High

```

### task list scanning density (ux)
```bash
python3 scripts/search.py task list information density scanning --domain ux -n 4
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** task list information density scanning
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Category:** Accessibility
- **Issue:** Color Only
- **Platform:** All
- **Description:** Don't convey information by color alone
- **Do:** Use icons/text in addition to color
- **Don't:** Red/green only for error/success
- **Code Example Good:** Red text + error icon
- **Code Example Bad:** Red border only for error
- **Severity:** High

### Result 3
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

### ready blocked overdue task state (ux)
```bash
python3 scripts/search.py status not conveyed by color alone --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** status not conveyed by color alone
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Issue:** Submit Feedback
- **Platform:** All
- **Description:** Confirm form submission status
- **Do:** Show loading then success/error state
- **Don't:** No feedback after submit
- **Code Example Good:** Loading -> Success message
- **Code Example Bad:** Button click with no response
- **Severity:** High

### Result 3
- **Category:** Accessibility
- **Issue:** Color Contrast
- **Platform:** All
- **Description:** Text must be readable against background
- **Do:** Minimum 4.5:1 ratio for normal text
- **Don't:** Low contrast text
- **Code Example Good:** #333 on white (7:1)
- **Code Example Bad:** #999 on white (2.8:1)
- **Severity:** High

```

### dependency blocker disclosure (ux)
```bash
python3 scripts/search.py progressive disclosure accordion detail --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** progressive disclosure accordion detail
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

### responsive table on mobile (ux)
```bash
python3 scripts/search.py responsive data table mobile layout --domain ux -n 4
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** responsive data table mobile layout
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Responsive
- **Issue:** Table Handling
- **Platform:** Web
- **Description:** Tables can overflow on mobile
- **Do:** Use horizontal scroll or card layout
- **Don't:** Wide tables breaking layout
- **Code Example Good:** overflow-x-auto wrapper
- **Code Example Bad:** Table overflows viewport
- **Severity:** Medium

### Result 2
- **Category:** Responsive
- **Issue:** Mobile First
- **Platform:** Web
- **Description:** Design for mobile then enhance for larger
- **Do:** Start with mobile styles then add breakpoints
- **Don't:** Desktop-first causing mobile issues
- **Code Example Good:** Default mobile + md: lg: xl:
- **Code Example Bad:** Desktop default + max-width queries
- **Severity:** Medium

### Result 3
- **Category:** Responsive
- **Issue:** Viewport Meta
- **Platform:** Web
- **Description:** Set viewport for mobile devices
- **Do:** Use width=device-width initial-scale=1
- **Don't:** Missing or incorrect viewport
- **Code Example Good:** <meta name='viewport'...>
- **Code Example Bad:** No viewport meta tag
- **Severity:** High

### Result 4
- **Category:** Layout
- **Issue:** Viewport Units
- **Platform:** Web
- **Description:** 100vh can be problematic on mobile browsers
- **Do:** Use dvh or account for mobile browser chrome
- **Don't:** Use 100vh for full-screen mobile layouts
- **Code Example Good:** min-h-dvh or min-h-screen
- **Code Example Bad:** h-screen on mobile
- **Severity:** Medium

```

### mobile task interaction (ux)
```bash
python3 scripts/search.py touch target size tap interaction --domain ux -n 4
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** touch target size tap interaction
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Touch
- **Issue:** Touch Target Size
- **Platform:** Mobile
- **Description:** Touch target guidance depends on platform and web context
- **Do:** Use 44pt on iOS and 48dp on Android; for web use the separate WCAG Target Size rule
- **Don't:** Treat one unit or minimum as universal across platforms
- **Code Example Good:** iOS 44pt; Android 48dp; Web 24 CSS px plus WCAG exceptions
- **Code Example Bad:** w-6 h-6 buttons
- **Severity:** High

### Result 2
- **Category:** Touch
- **Issue:** Tap Delay
- **Platform:** Mobile
- **Description:** 300ms tap delay feels laggy
- **Do:** Use touch-action CSS or fastclick
- **Don't:** Default mobile tap handling
- **Code Example Good:** touch-action: manipulation
- **Code Example Bad:** No touch optimization
- **Severity:** Medium

### Result 3
- **Category:** Animation
- **Issue:** Hover vs Tap
- **Platform:** All
- **Description:** Hover effects don't work on touch devices
- **Do:** Use click/tap for primary interactions
- **Don't:** Rely only on hover for important actions
- **Code Example Good:** onClick handler
- **Code Example Bad:** onMouseEnter only
- **Severity:** High

### Result 4
- **Category:** Performance
- **Issue:** Bundle Size
- **Platform:** Web
- **Description:** Large JavaScript slows interaction
- **Do:** Monitor and minimize bundle size
- **Don't:** Ignore bundle size growth
- **Code Example Good:** Bundle analyzer
- **Code Example Bad:** No size monitoring
- **Severity:** Medium

```

### keyboard operation of task rows (ux)
```bash
python3 scripts/search.py keyboard focus visible interactive control --domain ux -n 4
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** keyboard focus visible interactive control
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Accessibility
- **Issue:** Compact Control Semantics
- **Platform:** Web
- **Description:** Interactive chips need a native role accessible name state keyboard operation and visible focus
- **Do:** Prefer a button and expose pressed or selected state that matches the visible label
- **Don't:** Use a clickable div or reveal the only action on hover
- **Code Example Good:** <button aria-pressed='true'>Open now</button>
- **Code Example Bad:** <div class='selected' onclick='toggle()'>Open now</div>
- **Severity:** Critical

### Result 2
- **Category:** Accessibility
- **Issue:** Keyboard Navigation
- **Platform:** Web
- **Description:** Web users need complete keyboard navigation with visible focus on every operable control
- **Do:** Keep tab order aligned with visual order and test every action without a pointer
- **Don't:** Keyboard traps or illogical tab order
- **Code Example Good:** tabIndex for custom order
- **Code Example Bad:** Unreachable elements
- **Severity:** High

### Result 3
- **Category:** Interaction
- **Issue:** Focus States
- **Platform:** All
- **Description:** Keyboard focus, including controls inside a modal, needs a visible indicator
- **Do:** Use a visible focus ring on every interactive control, including modal controls
- **Don't:** Remove focus outline without replacement
- **Code Example Good:** focus:ring-2 focus:ring-blue-500
- **Code Example Bad:** outline-none without alternative
- **Severity:** High

### Result 4
- **Category:** Accessibility
- **Issue:** Focus Not Obscured (Enhanced)
- **Platform:** Web
- **Description:** WCAG 2.2 AAA requires keyboard focus to remain fully visible
- **Do:** Keep the entire focused component unobscured by author-created content
- **Don't:** Present this enhanced AAA criterion as an AA requirement or allow persistent UI to hide any part of focus
- **Code Example Good:** close persistent overlay before focus moves behind it
- **Code Example Bad:** sticky footer covers half the focused button
- **Severity:** Medium

```

### empty loading error states (ux)
```bash
python3 scripts/search.py loading skeleton empty error state --domain ux -n 4
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** loading skeleton empty error state
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Accessibility
- **Issue:** Error Messages
- **Platform:** All
- **Description:** Error messages must be announced
- **Do:** Use aria-live or role=alert for errors
- **Don't:** Visual-only error indication
- **Code Example Good:** role='alert'
- **Code Example Bad:** Red border only
- **Severity:** High

### Result 2
- **Category:** Feedback
- **Issue:** Empty States
- **Platform:** All
- **Description:** Guide users when no content exists
- **Do:** Show helpful message and action
- **Don't:** Blank empty screens
- **Code Example Good:** No items yet. Create one!
- **Code Example Bad:** Empty white space
- **Severity:** Medium

### Result 3
- **Category:** Forms
- **Issue:** Error Placement
- **Platform:** All
- **Description:** Each invalid field needs an inline error connected to that field
- **Do:** Show a specific error below the input and reference it with aria-describedby
- **Don't:** Show only a top-level error without identifying each invalid field
- **Code Example Good:** <input aria-describedby="email-error"><p id="email-error">Enter an email address</p>
- **Code Example Bad:** Red border or summary only
- **Severity:** High

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

### quick task capture form (ux)
```bash
python3 scripts/search.py inline form validation error summary --domain ux -n 4
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** inline form validation error summary
**Source:** ux-guidelines.csv | **Found:** 4 results

### Result 1
- **Category:** Forms / Accessibility
- **Issue:** Focusable Error Summary
- **Platform:** Web
- **Description:** An error summary for failed validation complements inline field errors and must be easy to find by keyboard and screen reader users
- **Do:** Place it at the top of the form; move focus to its heading or container after failed submit; link each item to its invalid field; retain inline errors
- **Don't:** Replace inline errors with a visual-only summary or move focus on every blur
- **Code Example Good:** <div role="alert" tabindex="-1" aria-labelledby="error-title"><h2 id="error-title">There is a problem</h2><a href="#email">Enter an email address</a></div>
- **Code Example Bad:** Toast only with no field links or focus target
- **Severity:** High

### Result 2
- **Category:** Forms
- **Issue:** Inline Validation
- **Platform:** All
- **Description:** Validate as user types or on blur
- **Do:** Validate on blur for most fields
- **Don't:** Validate only on submit
- **Code Example Good:** onBlur validation
- **Code Example Bad:** Submit-only validation
- **Severity:** Medium

### Result 3
- **Category:** Forms
- **Issue:** Error Placement
- **Platform:** All
- **Description:** Each invalid field needs an inline error connected to that field
- **Do:** Show a specific error below the input and reference it with aria-describedby
- **Don't:** Show only a top-level error without identifying each invalid field
- **Code Example Good:** <input aria-describedby="email-error"><p id="email-error">Enter an email address</p>
- **Code Example Bad:** Red border or summary only
- **Severity:** High

### Result 4
- **Category:** Accessibility
- **Issue:** Error Messages
- **Platform:** All
- **Description:** Error messages must be announced
- **Do:** Use aria-live or role=alert for errors
- **Don't:** Visual-only error indication
- **Code Example Good:** role='alert'
- **Code Example Bad:** Red border only
- **Severity:** High

```

### task filtering reusable views (ux)
```bash
python3 scripts/search.py filter chips remove applied filter --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** filter chips remove applied filter
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Layout
- **Issue:** Chip Collection Reflow
- **Platform:** All
- **Description:** Filter chips and editable value collections must preserve labels when space or text size changes
- **Do:** Wrap the collection or use an operable +n disclosure for hidden overflow values
- **Don't:** Force all chips into one clipped row or hide overflow values
- **Code Example Good:** <div class='chip-list'>{chips}</div> with flex-wrap
- **Code Example Bad:** <div class='chip-list' style='height:32px;overflow:hidden'>
- **Severity:** High

### Result 2
- **Category:** Content
- **Issue:** Compact Label Semantics
- **Platform:** All
- **Description:** Badges communicate state while chips or tags represent values or actions
- **Do:** Choose static or interactive markup from the label's meaning and ownership
- **Don't:** Make every pill clickable or encode status with color alone
- **Code Example Good:** <span class='status'>Pending</span>
- **Code Example Bad:** <div class='pill' onclick='toggle()'>Pending</div>
- **Severity:** High

### Result 3
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

### task hierarchy and subtasks (ux)
```bash
python3 scripts/search.py nested list hierarchy indentation tree --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** nested list hierarchy indentation tree
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Category:** Typography
- **Issue:** Font Size Scale
- **Platform:** All
- **Description:** Consistent type hierarchy aids scanning
- **Do:** Use consistent modular scale
- **Don't:** Random font sizes
- **Code Example Good:** Type scale (12 14 16 18 24 32)
- **Code Example Bad:** Arbitrary sizes
- **Severity:** Medium

```

### live count announcement (ux)
```bash
python3 scripts/search.py live badge count screen reader --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** live badge count screen reader
**Source:** ux-guidelines.csv | **Found:** 3 results

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

### Result 2
- **Category:** Accessibility
- **Issue:** Screen Reader
- **Platform:** All
- **Description:** Content should make sense when read aloud
- **Do:** Use semantic HTML and ARIA properly
- **Don't:** Div soup with no semantics
- **Code Example Good:** <nav> <main> <article>
- **Code Example Bad:** <div> for everything
- **Severity:** Medium

### Result 3
- **Category:** Forms / Accessibility
- **Issue:** Focusable Error Summary
- **Platform:** Web
- **Description:** An error summary for failed validation complements inline field errors and must be easy to find by keyboard and screen reader users
- **Do:** Place it at the top of the form; move focus to its heading or container after failed submit; link each item to its invalid field; retain inline errors
- **Don't:** Replace inline errors with a visual-only summary or move focus on every blur
- **Code Example Good:** <div role="alert" tabindex="-1" aria-labelledby="error-title"><h2 id="error-title">There is a problem</h2><a href="#email">Enter an email address</a></div>
- **Code Example Bad:** Toast only with no field links or focus target
- **Severity:** High

```

### sticky toolbar obscuring content (ux)
```bash
python3 scripts/search.py sticky header overlap scroll content --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** sticky header overlap scroll content
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Navigation
- **Issue:** Sticky Navigation
- **Platform:** Web
- **Description:** Fixed nav should not obscure content
- **Do:** Add padding-top to body equal to nav height
- **Don't:** Let nav overlap first section content
- **Code Example Good:** pt-20 (if nav is h-20)
- **Code Example Bad:** No padding compensation
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
- **Category:** Layout
- **Issue:** Fixed Positioning
- **Platform:** Web
- **Description:** Fixed elements can overlap or be inaccessible
- **Do:** Account for safe areas and other fixed elements
- **Don't:** Stack multiple fixed elements carelessly
- **Code Example Good:** Fixed nav + fixed bottom with gap
- **Code Example Bad:** Multiple overlapping fixed elements
- **Severity:** Medium

```

### long text truncation (ux)
```bash
python3 scripts/search.py text truncation ellipsis long label --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** text truncation ellipsis long label
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

### icons for ready blocked overdue (icons)
```bash
python3 scripts/search.py check circle warning clock alert status --domain icons -n 8
```
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** check circle warning clock alert status
**Source:** icons.csv | **Found:** 8 results

### Result 1
- **Category:** Status
- **Icon Name:** warning-circle
- **Keywords:** info notice information help
- **Library:** Phosphor
- **Import Code:** import { WarningCircle } from '@phosphor-icons/react'
- **Usage:** <WarningCircle size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable st...
- **Best For:** Info notice alert
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 2
- **Category:** Status
- **Icon Name:** check-circle
- **Keywords:** success verified approved complete
- **Library:** Phosphor
- **Import Code:** import { CheckCircle } from '@phosphor-icons/react'
- **Usage:** <CheckCircle size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable stat...
- **Best For:** Success badge verified
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 3
- **Category:** Status
- **Icon Name:** warning
- **Keywords:** warning caution attention danger
- **Library:** Phosphor
- **Import Code:** import { Warning } from '@phosphor-icons/react'
- **Usage:** <Warning size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (f...
- **Best For:** Warning message caution
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 4
- **Category:** Status
- **Icon Name:** clock
- **Keywords:** time schedule pending wait
- **Library:** Phosphor
- **Import Code:** import { Clock } from '@phosphor-icons/react'
- **Usage:** <Clock size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for...
- **Best For:** Pending time schedule
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 5
- **Category:** Status
- **Icon Name:** check
- **Keywords:** success done complete verified
- **Library:** Phosphor
- **Import Code:** import { Check } from '@phosphor-icons/react'
- **Usage:** <Check size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for...
- **Best For:** Success state checkmark
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 6
- **Category:** Status
- **Icon Name:** x-circle
- **Keywords:** error failed cancel rejected
- **Library:** Phosphor
- **Import Code:** import { XCircle } from '@phosphor-icons/react'
- **Usage:** <XCircle size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (f...
- **Best For:** Error state failed
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 7
- **Category:** Status
- **Icon Name:** circle-notch
- **Keywords:** loading spinner processing wait
- **Library:** Phosphor
- **Import Code:** import { CircleNotch } from '@phosphor-icons/react'
- **Usage:** <CircleNotch size={20} weight="regular" className="animate-spin" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name a...
- **Best For:** Loading state spinner
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 8
- **Category:** Communication
- **Icon Name:** bell
- **Keywords:** notification alert ring reminder
- **Library:** Phosphor
- **Import Code:** import { Bell } from '@phosphor-icons/react'
- **Usage:** <Bell size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for ...
- **Best For:** Notification bell alert
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

```

### icon button accessible label (icons)
```bash
python3 scripts/search.py icon button accessible label --domain icons -n 4
```
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** icon button accessible label
**Source:** icons.csv | **Found:** 4 results

### Result 1
- **Category:** Guideline
- **Icon Name:** icon-context-accessibility
- **Keywords:** decorative icon aria hidden, meaningful icon text alternative, icon button accessible label, accessible name, aria pressed, aria expanded, semantic context, phosphor, heroicons
- **Library:** Phosphor (primary) + Heroicons (fallback)
- **Import Code:** import { Question } from '@phosphor-icons/react'; import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
- **Usage:** Prefer the most semantically precise Phosphor icon, even if it is outside this curated subset. Use Heroicons only as a consistent fallback. Keep one visual family per surface. Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visibl...
- **Best For:** Contextual icon semantics, icon accessibility, and library fallback rules
- **Style:** Outline
- **Semantic Role:** guideline
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 2
- **Category:** Commerce
- **Icon Name:** tag
- **Keywords:** label price discount sale
- **Library:** Phosphor
- **Import Code:** import { Tag } from '@phosphor-icons/react'
- **Usage:** <Tag size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for e...
- **Best For:** Price tag label
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 3
- **Category:** Style Config
- **Icon Name:** bold-typography-icon-system
- **Keywords:** bold typography, editorial, mono label, phosphor, weight regular, minimal, icon+label required, size 20–32
- **Library:** Phosphor (react-native)
- **Import Code:** import { ArrowRight } from 'phosphor-react-native'
- **Usage:** <ArrowRight size={20} weight="regular" color={colors.accent} />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and e...
- **Best For:** Bold Typography Mobile style: weight="regular". Size 20px for UI controls, 32px for feature anchors. Icons MUST be paired with a Mono-stack text label (JetBrains Mono). Standalone icons only allowed for standard navigation (e.g., Back arrow). Accent color #FF3D00 only.
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 4
- **Category:** Style Config
- **Icon Name:** cyberpunk-icon-system
- **Keywords:** cyberpunk, neon, glow, hud, phosphor, weight regular, accent glow, dark, angular, react native
- **Library:** Phosphor (react-native)
- **Import Code:** import { Lightning } from 'phosphor-react-native'
- **Usage:** <Lightning size={24} weight="regular" color={colors.accent} />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and ex...
- **Best For:** Cyberpunk Mobile HUD style: weight="regular", color={colors.accent} (#00FF88 Matrix Green). Wrap every icon in a View with shadowColor: colors.accent / shadowOpacity: 0.6 / shadowRadius: 8 to simulate neon glow. Use borderRadius: 0 on wrapper. Avoid rounded icon containers. Always pair icon with dat...
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

```

### list rerender performance (react)
```bash
python3 scripts/search.py list rerender memo derived state --domain react -n 4
```
```
## UI Pro Max Search Results
**Domain:** react | **Query:** list rerender memo derived state
**Source:** react-performance.csv | **Found:** 4 results

### Result 1
- **Category:** Rerender
- **Issue:** Derived State
- **Platform:** React/Next.js
- **Description:** Subscribe to derived booleans instead of continuous values
- **Do:** Use derived boolean state
- **Don't:** Subscribe to continuous values
- **Code Example Good:** const isMobile = useMediaQuery('(max-width: 767px)')
- **Code Example Bad:** const width = useWindowWidth(); const isMobile = width < 768
- **Severity:** Medium

### Result 2
- **Category:** Rerender
- **Issue:** Defer State Reads
- **Platform:** React/Next.js
- **Description:** Don't subscribe to state only used in callbacks
- **Do:** Read state on-demand in callbacks
- **Don't:** Subscribe to state used only in handlers
- **Code Example Good:** const handleClick = () => { const params = new URLSearchParams(location.search) }
- **Code Example Bad:** const params = useSearchParams(); const handleClick = () => { params.get('ref') }
- **Severity:** Medium

### Result 3
- **Category:** Rerender
- **Issue:** Memoized Components
- **Platform:** React/Next.js
- **Description:** Extract expensive work into memoized components for early returns
- **Do:** Extract to memo() components
- **Don't:** Compute expensive values before early return
- **Code Example Good:** const UserAvatar = memo(({ user }) => ...); if (loading) return <Skeleton />
- **Code Example Bad:** const avatar = useMemo(() => compute(user)); if (loading) return <Skeleton />
- **Severity:** Medium

### Result 4
- **Category:** Rerender
- **Issue:** Transitions
- **Platform:** React/Next.js
- **Description:** Mark frequent non-urgent state updates as transitions
- **Do:** Use startTransition for non-urgent updates
- **Don't:** Block UI on every state change
- **Code Example Good:** startTransition(() => setScrollY(window.scrollY))
- **Code Example Bad:** setScrollY(window.scrollY) // blocks on every scroll
- **Severity:** Medium

```

### component composition (stack react)
```bash
python3 scripts/search.py component composition props drilling --stack react -n 3
```
```
## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** component composition props drilling
**Source:** stacks/react.csv | **Found:** 3 results

### Result 1
- **Category:** Props
- **Guideline:** Avoid prop drilling
- **Description:** Use context or composition for deeply nested data
- **Do:** Context for global data composition for UI
- **Don't:** Passing props through 5+ levels
- **Code Good:** <UserContext.Provider>
- **Code Bad:** <A user={u}><B user={u}><C user={u}>
- **Severity:** Medium
- **Docs URL:** https://react.dev/learn/passing-data-deeply-with-context
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** TypeScript
- **Guideline:** Type component props
- **Description:** Define interfaces for all props
- **Do:** interface Props with all prop types
- **Don't:** any or missing types
- **Code Good:** interface Props { name: string }
- **Code Bad:** function Component(props: any)
- **Severity:** High
- **Docs URL:** https://react.dev/learn/passing-props-to-a-component
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** Props
- **Guideline:** Destructure props
- **Description:** Destructure props for cleaner component code
- **Do:** Destructure in function signature
- **Don't:** props.name props.value throughout
- **Code Good:** function User({ name, age })
- **Code Bad:** function User(props)
- **Severity:** Low
- **Docs URL:** 
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

```

### responsive row to card (stack html-tailwind)
```bash
python3 scripts/search.py responsive table stacked card breakpoint --stack html-tailwind -n 4
```
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** responsive table stacked card breakpoint
**Source:** stacks/html-tailwind.csv | **Found:** 4 results

### Result 1
- **Category:** Responsive
- **Guideline:** Hidden/shown utilities
- **Description:** Control visibility per breakpoint
- **Do:** hidden md:block
- **Don't:** Different content per breakpoint
- **Code Good:** hidden md:flex
- **Code Bad:** Separate mobile/desktop components
- **Severity:** Low
- **Docs URL:** https://tailwindcss.com/docs/display
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** Responsive
- **Guideline:** Breakpoint testing
- **Description:** Test across breakpoint boundaries and representative viewport sizes
- **Do:** Test below at and above configured breakpoints
- **Don't:** Only test on development device
- **Code Good:** Test mobile through 2xl boundaries
- **Code Bad:** Single device testing
- **Severity:** High
- **Docs URL:** https://tailwindcss.com/docs/responsive-design
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** Images
- **Guideline:** Responsive image layout
- **Description:** Adjust image sizing and placement mobile-first with breakpoint variants
- **Do:** w-full md:w-1/2
- **Don't:** Use a fixed desktop width at every viewport
- **Code Good:** w-full md:max-w-xl
- **Code Bad:** w-[900px]
- **Severity:** High
- **Docs URL:** https://tailwindcss.com/docs/responsive-design
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 4
- **Category:** Cards
- **Guideline:** Card structure
- **Description:** Consistent card styling
- **Do:** rounded-lg shadow-md p-6
- **Don't:** Inconsistent card styles
- **Code Good:** rounded-2xl shadow-lg p-6
- **Code Bad:** Mixed card styling
- **Severity:** Low
- **Docs URL:** 
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

```

### chip badge overflow (stack html-tailwind)
```bash
python3 scripts/search.py chip badge overflow nowrap min-width --stack html-tailwind -n 3
```
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** chip badge overflow nowrap min-width
**Source:** stacks/html-tailwind.csv | **Found:** 3 results

### Result 1
- **Category:** Layout
- **Guideline:** Compact label layout
- **Description:** Handle chip and badge text overflow without breaking compact labels or hiding collection values
- **Do:** Use flex flex-wrap gap-2 for collections; for one label use whitespace-nowrap bounded min-w-0 truncate and shrink-0 controls
- **Don't:** Clip a fixed-height row let labels wrap inside a pill or let dismiss icons shrink
- **Code Good:** flex flex-wrap gap-2; label min-w-0 whitespace-nowrap truncate; icon shrink-0
- **Code Bad:** flex h-8 overflow-hidden
- **Severity:** High
- **Docs URL:** https://tailwindcss.com/docs/flex-wrap
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** Typography
- **Guideline:** Long token resilience
- **Description:** Allow URLs identifiers and user content to break without widening flex layouts
- **Do:** Use wrap-anywhere on unpredictable text and min-w-0 on its flexible parent
- **Don't:** Use break-all globally or keep the flex child at its intrinsic minimum
- **Code Good:** flex min-w-0 with wrap-anywhere
- **Code Bad:** flex with whitespace-nowrap
- **Severity:** High
- **Docs URL:** https://tailwindcss.com/docs/overflow-wrap
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** Buttons
- **Guideline:** Touch targets
- **Description:** Minimum 44px touch target on mobile
- **Do:** min-h-11 min-w-11 on mobile
- **Don't:** Small buttons on mobile
- **Code Good:** min-h-11 min-w-11
- **Code Bad:** h-8 w-8 on mobile
- **Severity:** High
- **Docs URL:** https://tailwindcss.com/docs/min-height
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

```

### dense dashboard style (style)
```bash
python3 scripts/search.py flat design dense dashboard dark mode --domain style -n 3
```
```
## UI Pro Max Search Results
**Domain:** style | **Query:** flat design dense dashboard dark mode
**Source:** styles.csv | **Found:** 1 results

### Result 1
- **Style ID:** dark-mode-oled
- **Style Category:** Dark Mode (OLED)
- **Aliases:** Dark Mode
- **Status:** active
- **Parent Style ID:** 
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Dark theme, low light, high contrast, deep black, midnight blue, eye-friendly, OLED, night mode, power efficient
- **Primary Colors:** Deep Black #000000, Dark Grey #121212, Midnight Blue #0A0E27
- **Effects & Animation:** Minimal glow (text-shadow: 0 0 10px), dark-to-light transitions, low white emission, high readability, visible focus
- **Best For:** Night-mode apps, coding platforms, entertainment, eye-strain prevention, OLED devices, low-light
- **Light Mode ✓:** not-recommended
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** tailwind|mui|chakra
- **Complexity:** Low
- **AI Prompt Keywords:** Create an OLED-optimized dark interface with deep black (#000000), dark grey (#121212), midnight blue accents. Use minimal glow effects, vibrant neon accents (green, blue, gold, purple), high contrast text. Optimize for eye comfort and OLED power saving.
- **CSS/Technical Keywords:** background: #000000 or #121212, color: #FFFFFF or #E0E0E0, text-shadow: 0 0 10px neon-color (sparingly), filter: brightness(0.8) if needed, color-scheme: dark
- **Implementation Checklist:** ☐ Deep black #000000 or #121212, ☐ Vibrant neon accents used, ☐ Text contrast 7:1+, ☐ Minimal glow effects, ☐ OLED power optimization, ☐ No white (#FFFFFF) background
- **Design System Variables:** --bg-black: #000000, --bg-dark-grey: #121212, --text-primary: #FFFFFF, --accent-neon: neon colors, --glow-effect: minimal, --oled-optimized: true

```

### functional status colors (color)
```bash
python3 scripts/search.py productivity tool functional status colors --domain color -n 3
```
```
## UI Pro Max Search Results
**Domain:** color | **Query:** productivity tool functional status colors
**Source:** colors.csv | **Found:** 3 results

### Result 1
- **Product Type:** Productivity Tool
- **Primary:** #0D9488
- **On Primary:** #000000
- **Secondary:** #14B8A6
- **On Secondary:** #0F172A
- **Accent:** #EA580C
- **On Accent:** #000000
- **Background:** #F0FDFA
- **Foreground:** #134E4A
- **Card:** #FFFFFF
- **Card Foreground:** #134E4A
- **Muted:** #E8F1F4
- **Muted Foreground:** #475569
- **Border:** #99F6E4
- **Destructive:** #DC2626
- **On Destructive:** #FFFFFF
- **Ring:** #0D9488
- **Notes:** Teal focus + action orange [Accent adjusted from #F97316]

### Result 2
- **Product Type:** Public Transit Guide
- **Primary:** #2563EB
- **On Primary:** #FFFFFF
- **Secondary:** #0891B2
- **On Secondary:** #000000
- **Accent:** #EA580C
- **On Accent:** #000000
- **Background:** #F8FAFC
- **Foreground:** #0F172A
- **Card:** #FFFFFF
- **Card Foreground:** #0F172A
- **Muted:** #F1F5FD
- **Muted Foreground:** #475569
- **Border:** #E4ECFC
- **Destructive:** #DC2626
- **On Destructive:** #FFFFFF
- **Ring:** #2563EB
- **Notes:** Transit blue + line colors

### Result 3
- **Product Type:** Smart Home/IoT Dashboard
- **Primary:** #1E293B
- **On Primary:** #FFFFFF
- **Secondary:** #334155
- **On Secondary:** #FFFFFF
- **Accent:** #22C55E
- **On Accent:** #0F172A
- **Background:** #0F172A
- **Foreground:** #F8FAFC
- **Card:** #1B2336
- **Card Foreground:** #F8FAFC
- **Muted:** #272F42
- **Muted Foreground:** #94A3B8
- **Border:** #475569
- **Destructive:** #EF4444
- **On Destructive:** #000000
- **Ring:** #FFFFFF
- **Notes:** Dark tech + status green

```

### row action affordance (ux)
```bash
python3 scripts/search.py row action menu discoverable affordance --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** row action menu discoverable affordance
**Source:** ux-guidelines.csv | **Found:** 1 results

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

```

### search input results feedback (ux)
```bash
python3 scripts/search.py search results count announce --domain ux -n 3
```
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** search results count announce
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Issue:** Contextual Live Badge Updates
- **Platform:** Web
- **Description:** Async badge and count changes should announce a meaningful contextual status without moving focus
- **Do:** Use one appropriate atomic status message such as 3 items in cart
- **Don't:** Announce a bare number or make every badge a competing live region
- **Code Example Good:** <span role='status' aria-atomic='true'>3 items in cart</span>
- **Code Example Bad:** <span aria-live='polite'>3</span>
- **Severity:** High

```

---

## Page-override generation (Step 2b, `--persist --page`)

First attempt — rejected on the skill's own Query Contract ("verify the returned domain/category,
top result identity, and whether its guidance fits the user's product and platform... Retry once
with a narrower rewrite"): it classified the page as **Product Detail** and recommended magnetic-
cursor/trail effects, which is marketing-site guidance with no application to an internal task
list screen.

```bash
python3 scripts/search.py "task management workspace productivity tool" \
  --design-system --persist -p "Tracker-BE" --page "tasks-workspace" \
  --variance 6 --motion 4 --density 8 --output-dir <scratch>
```
```
# Tasks Workspace Page Overrides

> **PROJECT:** Tracker-BE
> **Generated:** 2026-09-03 09:36:59
> **Page Type:** Product Detail

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- No overrides — use Master colors

### Component Overrides

- Avoid: Use arbitrary large z-index values

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Cursor scale on hover, magnetic pull to elements, cursor morphing, trail effects, blend mode cursors, click feedback
- Layout: Define z-index scale system (10 20 30 50)
```

Retry (narrower, names the surface as an internal app screen) — classified **Dashboard / Data
View**; this is the output persisted to `../../pages/tasks-workspace.md`.

```bash
python3 scripts/search.py "internal task list dashboard screen" \
  --design-system --persist -p "Tracker-BE" --page "tasks-workspace" \
  --variance 6 --motion 4 --density 8 --output-dir <repo-root>
```
```
# Tasks Workspace Page Overrides

> **PROJECT:** Tracker-BE
> **Generated:** 2026-09-03 09:37:09
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1400px or full-width
- **Grid:** 12-column grid for data flexibility

### Spacing Overrides

- **Content Density:** High — optimize for information display

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- No overrides — use Master colors

### Component Overrides

- Avoid: Skip heading levels or misuse for styling
- Avoid: Only test on your device
- Avoid: Div soup with no semantics

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Hover tooltips, chart zoom on click, row highlighting on hover, smooth filter animations, data loading spinners
- Accessibility: Use sequential heading levels h1-h6
- Responsive: Test at 320 375 414 768 1024 1440
- Accessibility: Use semantic HTML and ARIA properly
```

`MASTER.md` was **not** regenerated. The retry's MASTER output matches the committed one from #297
on every applied rule — identical palette, style, density scale, motion tier and anti-patterns — and
the issue explicitly forbids creating a second app-wide visual language. The only diff (below) is the
`Typography` block, and it *confirms* rather than contradicts the shipped app: this run resolved
**Fira Code / Fira Sans** ("dashboard, data, analytics") on its own, which is exactly the pairing
#297 adopted after overriding the committed file's generic Plus Jakarta Sans via a dedicated
`--domain typography "dashboard productivity"` search (see `../../REDESIGN-296.md` §2). No token
changes are needed for this issue.

```bash
diff design-system/tracker-be/MASTER.md <scratch>/dsout2/design-system/tracker-be/MASTER.md
```
```
10c10
< **Generated:** 2026-09-01 23:45:39
---
> **Generated:** 2026-09-03 09:37:09
43,46c43,46
< - **Heading Font:** Plus Jakarta Sans
< - **Body Font:** Plus Jakarta Sans
< - **Mood:** friendly, modern, saas, clean, approachable, professional
< - **Google Fonts:** [Plus Jakarta Sans + Plus Jakarta Sans](https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap)
---
> - **Heading Font:** Fira Code
> - **Body Font:** Fira Sans
> - **Mood:** dashboard, data, analytics, code, technical, precise
> - **Google Fonts:** [Fira Code + Fira Sans](https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap)
50c50
< @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
---
> @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```
