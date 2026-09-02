### blocked task explanation
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** blocked task explanation progressive disclosure
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

### ready task actionable status
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** ready task actionable status
**Source:** ux-guidelines.csv | **Found:** 2 results

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
- **Issue:** Contextual Live Badge Updates
- **Platform:** Web
- **Description:** Async badge and count changes should announce a meaningful contextual status without moving focus
- **Do:** Use one appropriate atomic status message such as 3 items in cart
- **Don't:** Announce a bare number or make every badge a competing live region
- **Code Example Good:** <span role='status' aria-atomic='true'>3 items in cart</span>
- **Code Example Bad:** <span aria-live='polite'>3</span>
- **Severity:** High

```

### dashboard information hierarchy
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** dashboard information hierarchy
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

```

### activity timeline scanning
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** activity timeline scanning
**Source:** ux-guidelines.csv | **Found:** 1 results

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

```

### responsive tabs mobile nav
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** responsive tabs mobile navigation
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Issue:** Viewport Meta
- **Platform:** Web
- **Description:** Set viewport for mobile devices
- **Do:** Use width=device-width initial-scale=1
- **Don't:** Missing or incorrect viewport
- **Code Example Good:** <meta name='viewport'...>
- **Code Example Bad:** No viewport meta tag
- **Severity:** High

### Result 3
- **Category:** Responsive
- **Issue:** Table Handling
- **Platform:** Web
- **Description:** Tables can overflow on mobile
- **Do:** Use horizontal scroll or card layout
- **Don't:** Wide tables breaking layout
- **Code Example Good:** overflow-x-auto wrapper
- **Code Example Bad:** Table overflows viewport
- **Severity:** Medium

```

### loading empty error states
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** loading empty error states
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Category:** Animation
- **Issue:** Loading States
- **Platform:** All
- **Description:** Show feedback during async operations
- **Do:** Use skeleton screens or spinners
- **Don't:** Leave UI frozen with no feedback
- **Code Example Good:** animate-pulse skeleton
- **Code Example Bad:** Blank screen while loading
- **Severity:** High

### Result 3
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

### badge chip accessibility
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** badge chip label accessibility
**Source:** ux-guidelines.csv | **Found:** 3 results

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

```

### keyboard focus interactive status
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** keyboard focus interactive status
**Source:** ux-guidelines.csv | **Found:** 3 results

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

```

### task list density
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** task list information density
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

### cockpit dashboard layout
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** project cockpit dashboard layout
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Layout
- **Issue:** Fixed Positioning
- **Platform:** Web
- **Description:** Fixed elements can overlap or be inaccessible
- **Do:** Account for safe areas and other fixed elements
- **Don't:** Stack multiple fixed elements carelessly
- **Code Example Good:** Fixed nav + fixed bottom with gap
- **Code Example Bad:** Multiple overlapping fixed elements
- **Severity:** Medium

### Result 2
- **Category:** Layout
- **Issue:** Stacking Context
- **Platform:** Web
- **Description:** New stacking contexts reset z-index
- **Do:** Understand what creates new stacking context
- **Don't:** Expect z-index to work across contexts
- **Code Example Good:** Parent with z-index isolates children
- **Code Example Bad:** z-index: 9999 not working
- **Severity:** Medium

### Result 3
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

### icons dashboard
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** dashboard status icons
**Source:** icons.csv | **Found:** 0 results

No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.
```

### typography dashboard
```
## UI Pro Max Search Results
**Domain:** typography | **Query:** dashboard productivity
**Source:** typography.csv | **Found:** 3 results

### Result 1
- **Font Pairing Name:** Dashboard Data
- **Category:** Mono + Sans
- **Heading Font:** Fira Code
- **Body Font:** Fira Sans
- **Mood/Style Keywords:** dashboard, data, analytics, code, technical, precise
- **Best For:** Dashboards, analytics, data visualization, admin panels
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
- **Tailwind Config:** fontFamily: { mono: ['Fira Code', 'monospace'], sans: ['Fira Sans', 'sans-serif'] }
- **Notes:** Fira family cohesion. Code for data, Sans for labels.

### Result 2
- **Font Pairing Name:** Friendly SaaS
- **Category:** Sans + Sans
- **Heading Font:** Plus Jakarta Sans
- **Body Font:** Plus Jakarta Sans
- **Mood/Style Keywords:** friendly, modern, saas, clean, approachable, professional
- **Best For:** SaaS products, web apps, dashboards, B2B, productivity tools
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
- **Tailwind Config:** fontFamily: { sans: ['Plus Jakarta Sans', 'sans-serif'] }
- **Notes:** Single versatile font. Modern alternative to Inter.

### Result 3
- **Font Pairing Name:** Modern Dark Cinema (Inter System)
- **Category:** Sans + Mono
- **Heading Font:** Inter
- **Body Font:** Inter
- **Mood/Style Keywords:** dark, cinematic, technical, precision, clean, premium, developer, professional, high-end utility
- **Best For:** Developer tools, fintech/trading, AI dashboards, streaming platforms, high-end productivity apps
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
- **Tailwind Config:** fontFamily: { sans: ['Inter', 'sans-serif'] }
- **Notes:** Single-family precision system: Inter 700 (-1.5 tracking) for Display 48pt; Inter 600 (-0.5 tracking) for H1 32pt / H2 24pt; Inter 400 for body 16pt; Inter 500 uppercase +1.2 tracking for labels/mono. Gradient text via mask-view + react-native-linear-gradient (#FFFFFF → rgba(255,255,255,0.7)) on maj...

```

### color dashboard
```
## UI Pro Max Search Results
**Domain:** color | **Query:** productivity dashboard functional colors
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
- **Product Type:** Financial Dashboard
- **Primary:** #0F172A
- **On Primary:** #FFFFFF
- **Secondary:** #1E293B
- **On Secondary:** #FFFFFF
- **Accent:** #22C55E
- **On Accent:** #0F172A
- **Background:** #020617
- **Foreground:** #F8FAFC
- **Card:** #0E1223
- **Card Foreground:** #F8FAFC
- **Muted:** #1A1E2F
- **Muted Foreground:** #94A3B8
- **Border:** #334155
- **Destructive:** #EF4444
- **On Destructive:** #000000
- **Ring:** #FFFFFF
- **Notes:** Dark bg + green positive indicators

```

### react stack
```
## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** component structure performance
**Source:** stacks/react.csv | **Found:** 3 results

### Result 1
- **Category:** Performance
- **Guideline:** Use React DevTools Profiler
- **Description:** Profile to identify performance bottlenecks
- **Do:** Profile before optimizing
- **Don't:** Optimize without measuring
- **Code Good:** React DevTools Profiler
- **Code Bad:** Guessing at bottlenecks
- **Severity:** Medium
- **Docs URL:** https://react.dev/learn/react-developer-tools
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** Components
- **Guideline:** Colocate related code
- **Description:** Keep related components and hooks together
- **Do:** Related files in same directory
- **Don't:** Flat structure with many files
- **Code Good:** components/User/UserCard.tsx
- **Code Bad:** components/UserCard.tsx + hooks/useUser.ts
- **Severity:** Low
- **Docs URL:** 
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** Components
- **Guideline:** Keep components small and focused
- **Description:** Single responsibility for each component
- **Do:** One concern per component
- **Don't:** Large multi-purpose components
- **Code Good:** <UserAvatar /><UserName />
- **Code Bad:** <UserCard /> with 500 lines
- **Severity:** Medium
- **Docs URL:** 
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

```

### html-tailwind chip overflow
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** chip badge overflow nowrap
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
- **Guideline:** Text truncation
- **Description:** Handle long text gracefully
- **Do:** truncate or line-clamp-*
- **Don't:** Overflow breaking layout
- **Code Good:** line-clamp-2
- **Code Bad:** No overflow handling
- **Severity:** Medium
- **Docs URL:** https://tailwindcss.com/docs/text-overflow
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** Images
- **Guideline:** Reserve image space
- **Description:** Give image wrappers an aspect ratio or dimensions to avoid layout shifts
- **Do:** aspect-video or explicit dimensions
- **Don't:** Let images determine layout after load
- **Code Good:** aspect-video overflow-hidden
- **Code Bad:** Image without reserved space
- **Severity:** High
- **Docs URL:** https://tailwindcss.com/docs/aspect-ratio
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

```

