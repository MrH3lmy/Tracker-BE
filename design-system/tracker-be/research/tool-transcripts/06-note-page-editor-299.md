# Issue #299 follow-up — UI UX Pro Max research (Notion-style note page editor)

Skill: `ui-ux-pro-max` v2.13.0, `scripts/search.py`. Unedited stdout below each command.

----
### `rich text editor content editable --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** rich text editor content editable
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
- **Issue:** Essential Text Truncation
- **Platform:** All
- **Description:** Headings actions errors safety text and distinguishing names need complete access
- **Do:** Wrap stack resize or provide a visible full-detail path
- **Don't:** Clamp essential meaning only to make cards uniform
- **Code Example Good:** Action label wraps or opens full details
- **Code Example Bad:** Primary action shown only as an unexplained ellipsis
- **Severity:** Critical

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

```

----
### `keyboard navigation menu arrow keys --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** keyboard navigation menu arrow keys
**Source:** ux-guidelines.csv | **Found:** 3 results

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

```

----
### `drag and drop reorder accessible --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** drag and drop reorder accessible
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Issue:** ARIA Labels
- **Platform:** All
- **Description:** Interactive elements need accessible names
- **Do:** Add aria-label for icon-only buttons
- **Don't:** Icon buttons without labels
- **Code Example Good:** aria-label='Close menu'
- **Code Example Bad:** <button><Icon/></button>
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

----
### `autosave save status feedback --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** autosave save status feedback
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

```

----
### `optimistic update rollback failure --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** optimistic update rollback failure
**Source:** ux-guidelines.csv | **Found:** 1 results

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

```

----
### `unsaved changes navigation warning --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** unsaved changes navigation warning
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
- **Category:** Animation
- **Issue:** Easing Functions
- **Platform:** All
- **Description:** Easing should match how an element changes speed and purpose
- **Do:** Use deceleration when arriving acceleration when leaving and linear for constant-rate progress
- **Don't:** Reject linear easing even for steady rotation or progress
- **Code Example Good:** ease-out for entry; linear for spinner
- **Code Example Bad:** ease-in-out for every motion
- **Severity:** Low

```

----
### `editable title in place editing --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** editable title in place editing
**Source:** ux-guidelines.csv | **Found:** 2 results

### Result 1
- **Category:** Data Entry
- **Issue:** Bulk Actions
- **Platform:** Web
- **Description:** Editing one by one is tedious
- **Do:** Allow multi-select and bulk edit
- **Don't:** Single row actions only
- **Code Example Good:** Checkbox column + Action bar
- **Code Example Bad:** Repeated actions per row
- **Severity:** Low

### Result 2
- **Category:** Layout
- **Issue:** Chip Collection Reflow
- **Platform:** All
- **Description:** Filter chips and editable value collections must preserve labels when space or text size changes
- **Do:** Wrap the collection or use an operable +n disclosure for hidden overflow values
- **Don't:** Force all chips into one clipped row or hide overflow values
- **Code Example Good:** <div class='chip-list'>{chips}</div> with flex-wrap
- **Code Example Bad:** <div class='chip-list' style='height:32px;overflow:hidden'>
- **Severity:** High

```

----
### `contextual controls hover reveal --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** contextual controls hover reveal
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
- **Category:** Animation
- **Issue:** Hover vs Tap
- **Platform:** All
- **Description:** Hover effects don't work on touch devices
- **Do:** Use click/tap for primary interactions
- **Don't:** Rely only on hover for important actions
- **Code Example Good:** onClick handler
- **Code Example Bad:** onMouseEnter only
- **Severity:** High

### Result 3
- **Category:** Interaction
- **Issue:** Hover States
- **Platform:** Web
- **Description:** Visual feedback on interactive elements
- **Do:** Change cursor and add subtle visual change
- **Don't:** No hover feedback on clickable elements
- **Code Example Good:** hover:bg-gray-100 cursor-pointer
- **Code Example Bad:** No hover style
- **Severity:** Medium

```

----
### `text selection toolbar --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** text selection toolbar
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Accessibility
- **Issue:** Alt Text
- **Platform:** All
- **Description:** Images need text alternatives
- **Do:** Descriptive alt text for meaningful images
- **Don't:** Empty or missing alt attributes
- **Code Example Good:** alt='Dog playing in park'
- **Code Example Bad:** alt='' for content images
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Text Reflow and Spacing
- **Platform:** Web
- **Description:** Text must remain available at narrow widths zoom and user spacing overrides
- **Do:** Use fluid sizes content-driven height and unitless line height
- **Don't:** Clip text in fixed-width or fixed-height boxes
- **Code Example Good:** .copy { inline-size: min(100%, 65ch); height: auto; line-height: 1.5; }
- **Code Example Bad:** .copy { width: 900px; height: 40px; overflow: hidden; }
- **Severity:** Critical

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

----
### `document properties metadata panel --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** document properties metadata panel
**Source:** ux-guidelines.csv | **Found:** 1 results

### Result 1
- **Category:** Animation
- **Issue:** Transform Performance
- **Platform:** Web
- **Description:** Some CSS properties trigger expensive repaints
- **Do:** Use transform and opacity for animations
- **Don't:** Animate width/height/top/left properties
- **Code Example Good:** transform: translateY()
- **Code Example Bad:** top: 10px animation
- **Severity:** Medium

```

----
### `mobile text input software keyboard --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** mobile text input software keyboard
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Forms
- **Issue:** Mobile Keyboards
- **Platform:** Mobile
- **Description:** Show appropriate keyboard for input type
- **Do:** Use inputmode attribute
- **Don't:** Default keyboard for all inputs
- **Code Example Good:** inputmode='numeric'
- **Code Example Bad:** Text keyboard for numbers
- **Severity:** Medium

### Result 2
- **Category:** Forms
- **Issue:** Input Types
- **Platform:** All
- **Description:** Use appropriate input types
- **Do:** Use email tel number url etc
- **Don't:** Text input for everything
- **Code Example Good:** type='email'
- **Code Example Bad:** type='text' for email
- **Severity:** Medium

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

----
### `long press touch alternative --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** long press touch alternative
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Interaction
- **Issue:** Active States
- **Platform:** All
- **Description:** Show immediate feedback on press/click
- **Do:** Add pressed/active state visual change
- **Don't:** No feedback during interaction
- **Code Example Good:** active:scale-95
- **Code Example Bad:** No active state
- **Severity:** Medium

### Result 2
- **Category:** Touch
- **Issue:** Touch Spacing
- **Platform:** Mobile
- **Description:** Adjacent touch targets need adequate spacing
- **Do:** Minimum 8px gap between touch targets
- **Don't:** Tightly packed clickable elements
- **Code Example Good:** gap-2 between buttons
- **Code Example Bad:** gap-0 or gap-1
- **Severity:** Medium

### Result 3
- **Category:** Touch
- **Issue:** Touch Target Size
- **Platform:** Mobile
- **Description:** Touch target guidance depends on platform and web context
- **Do:** Use 44pt on iOS and 48dp on Android; for web use the separate WCAG Target Size rule
- **Don't:** Treat one unit or minimum as universal across platforms
- **Code Example Good:** iOS 44pt; Android 48dp; Web 24 CSS px plus WCAG exceptions
- **Code Example Bad:** w-6 h-6 buttons
- **Severity:** High

```

----
### `back navigation preserve state scroll --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** back navigation preserve state scroll
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Issue:** Smooth Scroll
- **Platform:** Web
- **Description:** Anchor links should scroll smoothly to target section
- **Do:** Use scroll-behavior: smooth on html element
- **Don't:** Jump directly without transition
- **Code Example Good:** html { scroll-behavior: smooth; }
- **Code Example Bad:** <a href='#section'> without CSS
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

```

----
### `focus management after delete --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** focus management after delete
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Layout
- **Issue:** Z-Index Management
- **Platform:** Web
- **Description:** Stacking context conflicts cause hidden elements
- **Do:** Define z-index scale system (10 20 30 50)
- **Don't:** Use arbitrary large z-index values
- **Code Example Good:** z-10 z-20 z-50
- **Code Example Bad:** z-[9999]
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Focus Appearance
- **Platform:** Web
- **Description:** WCAG 2.2 AAA defines minimum area and contrast for focus indicators
- **Do:** Use an indicator at least as large as a 2 CSS px perimeter with 3:1 state contrast
- **Don't:** Present this enhanced AAA criterion as an AA requirement or use a thin low-contrast outline
- **Code Example Good:** outline: 2px solid currentColor; outline-offset: 2px
- **Code Example Bad:** box-shadow: 0 0 1px low-contrast
- **Severity:** Medium

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

```

----
### `drag handle grip icon --domain icons -n 5`
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** drag handle grip icon
**Source:** icons.csv | **Found:** 0 results

No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.
**Closest known terms:** grid
```

----
### `editor block state management --stack react -n 3`
```
## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** editor block state management
**Source:** stacks/react.csv | **Found:** 3 results

### Result 1
- **Category:** Accessibility
- **Guideline:** Manage focus properly
- **Description:** Handle focus for modals dialogs
- **Do:** Focus trap in modals return focus on close
- **Don't:** No focus management
- **Code Good:** useEffect to focus input
- **Code Bad:** Modal without focus trap
- **Severity:** High
- **Docs URL:** https://react.dev/reference/react/useRef
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** State
- **Guideline:** Lift state up when needed
- **Description:** Share state between siblings by lifting to parent
- **Do:** Lift shared state to common ancestor
- **Don't:** Prop drilling through many levels
- **Code Good:** Parent holds state passes down
- **Code Bad:** Deep prop chains
- **Severity:** Medium
- **Docs URL:** https://react.dev/learn/sharing-state-between-components
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** State
- **Guideline:** Use useState for local state
- **Description:** Simple component state should use useState hook in current React apps.
- **Do:** useState for form inputs toggles counters
- **Don't:** Class components this.state
- **Code Good:** const [count, setCount] = useState(0)
- **Code Bad:** this.state = { count: 0 }
- **Severity:** Medium
- **Docs URL:** https://react.dev/reference/react/useState
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

```

----
### `controlled input performance rerender --stack react -n 3`
```
## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** controlled input performance rerender
**Source:** stacks/react.csv | **Found:** 3 results

### Result 1
- **Category:** Forms
- **Guideline:** Controlled components for forms
- **Description:** Use state to control form inputs
- **Do:** value + onChange for inputs
- **Don't:** Uncontrolled inputs with refs
- **Code Good:** <input value={val} onChange={setVal}>
- **Code Bad:** <input ref={inputRef}>
- **Severity:** Medium
- **Docs URL:** https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** Components
- **Guideline:** Pass ref as a prop
- **Description:** React 19 supports ref as a prop; this is the current path for exposing DOM nodes.
- **Do:** Accept ref as a normal prop in new components
- **Don't:** Reach for forwardRef in new code
- **Code Good:** function Input({ ref, ...props }) { return <input ref={ref} {...props} /> }
- **Code Bad:** const Input = forwardRef(function Input(props, ref) { ... })
- **Severity:** Medium
- **Docs URL:** https://react.dev/reference/react/forwardRef
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
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

```

### Retries after 0-result queries (per SKILL.md)
----
### `menu more options icon --domain icons -n 4`
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** menu more options icon
**Source:** icons.csv | **Found:** 0 results

No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.
```

----
### `text formatting bold italic icon --domain icons -n 4`
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** text formatting bold italic icon
**Source:** icons.csv | **Found:** 4 results

### Result 1
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

### Result 2
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

### Result 3
- **Category:** Files
- **Icon Name:** file-text
- **Keywords:** document text page article
- **Library:** Phosphor
- **Import Code:** import { FileText } from '@phosphor-icons/react'
- **Usage:** <FileText size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (...
- **Best For:** Text document article
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

