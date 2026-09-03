# Issue #299 — UI UX Pro Max research transcript (Notes knowledge workspace)

Skill: `ui-ux-pro-max` v2.13.0 (nextlevelbuilder/ui-ux-pro-max-skill), installed into
`~/.claude/skills/ui-ux-pro-max` this session. Script: `scripts/search.py`. Every block
below is the unedited stdout of the command shown above it.

## Product / navigation architecture
----
### `note taking knowledge base app --domain product -n 3`
```
## UI Pro Max Search Results
**Domain:** product | **Query:** note taking knowledge base app
**Source:** products.csv | **Found:** 3 results

### Result 1
- **Product Type:** Knowledge Base/Documentation
- **Keywords:** base, documentation, knowledge
- **Primary Style Recommendation:** Minimalism & Swiss Style + Accessible & Ethical
- **Secondary Styles:** Swiss Modernism 2.0 , Flat Design
- **Landing Page Pattern:** FAQ/Documentation
- **Dashboard Style (if applicable):** N/A - Documentation focused
- **Color Palette Focus:** Clean hierarchy + minimal color

### Result 2
- **Product Type:** Voice Recorder & Memo
- **Keywords:** voice, recorder, memo, audio, transcription, dictate, recording, microphone, note, otter
- **Primary Style Recommendation:** Minimalism & Swiss Style + AI-Native UI
- **Secondary Styles:** Flat Design , Dark Mode (OLED)
- **Landing Page Pattern:** Interactive Product Demo + Minimal
- **Dashboard Style (if applicable):** N/A - Recording focused
- **Color Palette Focus:** Clean white + recording red + waveform accent

### Result 3
- **Product Type:** Password Manager
- **Keywords:** password, security, vault, credentials, login, secure, encrypt, keychain, 2fa, biometric
- **Primary Style Recommendation:** Minimalism & Swiss Style + Accessible & Ethical
- **Secondary Styles:** Dark Mode (OLED) , Swiss Modernism 2.0
- **Landing Page Pattern:** Trust & Authority + Feature-Rich
- **Dashboard Style (if applicable):** N/A - Vault focused
- **Color Palette Focus:** Trust blue + security green + dark neutral

```

----
### `sidebar navigation hierarchy --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** sidebar navigation hierarchy
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
### `search filter results --domain ux -n 4`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** search filter results
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

## Search / discovery ergonomics
----
### `search input placeholder clarity --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** search input placeholder clarity
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Forms
- **Issue:** Input Types
- **Platform:** All
- **Description:** Use appropriate input types
- **Do:** Use email tel number url etc
- **Don't:** Text input for everything
- **Code Example Good:** type='email'
- **Code Example Bad:** type='text' for email
- **Severity:** Medium

### Result 2
- **Category:** Forms
- **Issue:** Input Labels
- **Platform:** All
- **Description:** Every input needs a visible label
- **Do:** Always show label above or beside input
- **Don't:** Placeholder as only label
- **Code Example Good:** <label>Email</label><input>
- **Code Example Bad:** placeholder='Email' only
- **Severity:** High

### Result 3
- **Category:** Content
- **Issue:** Placeholder Content
- **Platform:** All
- **Description:** Show realistic placeholders during dev
- **Do:** Use realistic sample data
- **Don't:** Lorem ipsum everywhere
- **Code Example Good:** Real sample content
- **Code Example Bad:** Lorem ipsum
- **Severity:** Low

```

----
### `progressive disclosure advanced options --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** progressive disclosure advanced options
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

----
### `filter chip removable label --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** filter chip removable label
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
- **Category:** Layout
- **Issue:** Chip Collection Reflow
- **Platform:** All
- **Description:** Filter chips and editable value collections must preserve labels when space or text size changes
- **Do:** Wrap the collection or use an operable +n disclosure for hidden overflow values
- **Don't:** Force all chips into one clipped row or hide overflow values
- **Code Example Good:** <div class='chip-list'>{chips}</div> with flex-wrap
- **Code Example Bad:** <div class='chip-list' style='height:32px;overflow:hidden'>
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

## Dense list / card scanning
----
### `list density scanning readability --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** list density scanning readability
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
- **Category:** Content
- **Issue:** Number Formatting
- **Platform:** All
- **Description:** Format large numbers for readability
- **Do:** Use thousand separators or abbreviations
- **Don't:** Long unformatted numbers
- **Code Example Good:** 1.2K or 1,234
- **Code Example Bad:** 1234567
- **Severity:** Low

### Result 3
- **Category:** Typography
- **Issue:** Line Height
- **Platform:** All
- **Description:** Adequate line height improves readability
- **Do:** Use 1.5-1.75 for body text
- **Don't:** Cramped or excessive line height
- **Code Example Good:** leading-relaxed (1.625)
- **Code Example Bad:** leading-none (1)
- **Severity:** Medium

```

----
### `card content truncation overflow --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** card content truncation overflow
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
- **Category:** Layout
- **Issue:** Overflow Hidden
- **Platform:** Web
- **Description:** Hidden overflow can clip important content
- **Do:** Test all content fits within containers
- **Don't:** Blindly apply overflow-hidden
- **Code Example Good:** overflow-auto with scroll
- **Code Example Bad:** overflow-hidden truncating content
- **Severity:** Medium

### Result 3
- **Category:** Content
- **Issue:** Compact Label Overflow
- **Platform:** All
- **Description:** A badge chip or pill label should stay whole on one line when practical and disclose unavoidable truncation
- **Do:** Bound only unpredictable values; use nowrap with a shrinkable label; expose full text to keyboard pointer and touch users
- **Don't:** Let one compact label wrap to a second line or use a hover-only tooltip
- **Code Example Good:** Flexible label with min-width 0 and an operable full-value disclosure
- **Code Example Bad:** Fixed-width badge wraps to second line or clips with title-only recovery
- **Severity:** High

```

----
### `long text truncation ellipsis --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** long text truncation ellipsis
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
- **Issue:** Essential Text Truncation
- **Platform:** All
- **Description:** Headings actions errors safety text and distinguishing names need complete access
- **Do:** Wrap stack resize or provide a visible full-detail path
- **Don't:** Clamp essential meaning only to make cards uniform
- **Code Example Good:** Action label wraps or opens full details
- **Code Example Bad:** Primary action shown only as an unexplained ellipsis
- **Severity:** Critical

### Result 3
- **Category:** Typography
- **Issue:** Line Length
- **Platform:** Web
- **Description:** Long lines are hard to read
- **Do:** Limit to 65-75 characters per line
- **Don't:** Full-width text on large screens
- **Code Example Good:** max-w-prose
- **Code Example Bad:** Full viewport width text
- **Severity:** Medium

```

## Capture / editor
----
### `form field grouping sections --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** form field grouping sections
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Forms
- **Issue:** Error Placement
- **Platform:** All
- **Description:** Each invalid field needs an inline error connected to that field
- **Do:** Show a specific error below the input and reference it with aria-describedby
- **Don't:** Show only a top-level error without identifying each invalid field
- **Code Example Good:** <input aria-describedby="email-error"><p id="email-error">Enter an email address</p>
- **Code Example Bad:** Red border or summary only
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
- **Issue:** Form Labels
- **Platform:** All
- **Description:** Inputs must have associated labels
- **Do:** Use label with for attribute or wrap input
- **Don't:** Placeholder-only inputs
- **Code Example Good:** <label for='email'>
- **Code Example Bad:** placeholder='Email' only
- **Severity:** High

```

----
### `inline validation error clarity --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** inline validation error clarity
**Source:** ux-guidelines.csv | **Found:** 3 results

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

```

----
### `autosave draft unsaved changes --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** autosave draft unsaved changes
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Animation
- **Issue:** Easing Functions
- **Platform:** All
- **Description:** Easing should match how an element changes speed and purpose
- **Do:** Use deceleration when arriving acceleration when leaving and linear for constant-rate progress
- **Don't:** Reject linear easing even for steady rotation or progress
- **Code Example Good:** ease-out for entry; linear for spinner
- **Code Example Bad:** ease-in-out for every motion
- **Severity:** Low

### Result 2
- **Category:** Animation
- **Issue:** Cancellable State Transitions
- **Platform:** Web
- **Description:** Rapid compact-control changes can interrupt an in-flight transition
- **Do:** Cancel or replace prior motion; set the final semantic state directly and handle cancellation cleanup
- **Don't:** Depend on animationend or transitionend for required state correctness
- **Code Example Good:** previous?.cancel(); setSelected(next)
- **Code Example Bad:** Enable the chip only inside transitionend
- **Severity:** High

### Result 3
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

## Images / attachments
----
### `image thumbnail lazy loading --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** image thumbnail lazy loading
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Performance
- **Issue:** Lazy Loading
- **Platform:** All
- **Description:** Load content as needed
- **Do:** Lazy load below-fold images and content
- **Don't:** Load everything upfront
- **Code Example Good:** loading='lazy'
- **Code Example Bad:** All images eager load
- **Severity:** Medium

### Result 2
- **Category:** Performance
- **Issue:** Image Optimization
- **Platform:** All
- **Description:** Large images slow page load
- **Do:** Use appropriate size and format (WebP)
- **Don't:** Unoptimized full-size images
- **Code Example Good:** srcset with multiple sizes
- **Code Example Bad:** 4000px image for 400px display
- **Severity:** High

### Result 3
- **Category:** Responsive
- **Issue:** Image Scaling
- **Platform:** Web
- **Description:** Images should scale with container
- **Do:** Use max-width: 100% on images
- **Don't:** Fixed width images overflow
- **Code Example Good:** max-w-full h-auto
- **Code Example Bad:** width='800' fixed
- **Severity:** Medium

```

----
### `image alt text descriptive --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** image alt text descriptive
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
- **Category:** Performance
- **Issue:** Image Optimization
- **Platform:** All
- **Description:** Large images slow page load
- **Do:** Use appropriate size and format (WebP)
- **Don't:** Unoptimized full-size images
- **Code Example Good:** srcset with multiple sizes
- **Code Example Bad:** 4000px image for 400px display
- **Severity:** High

### Result 3
- **Category:** Responsive
- **Issue:** Image Scaling
- **Platform:** Web
- **Description:** Images should scale with container
- **Do:** Use max-width: 100% on images
- **Don't:** Fixed width images overflow
- **Code Example Good:** max-w-full h-auto
- **Code Example Bad:** width='800' fixed
- **Severity:** Medium

```

## Mobile / responsive
----
### `mobile drawer bottom sheet navigation --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** mobile drawer bottom sheet navigation
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

```

----
### `responsive breakpoint mobile first --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** responsive breakpoint mobile first
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
- **Issue:** Breakpoint Testing
- **Platform:** Web
- **Description:** Test at all common screen sizes
- **Do:** Test at 320 375 414 768 1024 1440
- **Don't:** Only test on your device
- **Code Example Good:** Multiple device testing
- **Code Example Bad:** Single device development
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

```

----
### `touch target size spacing --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** touch target size spacing
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Issue:** Touch Spacing
- **Platform:** Mobile
- **Description:** Adjacent touch targets need adequate spacing
- **Do:** Minimum 8px gap between touch targets
- **Don't:** Tightly packed clickable elements
- **Code Example Good:** gap-2 between buttons
- **Code Example Bad:** gap-0 or gap-1
- **Severity:** Medium

### Result 3
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

## Keyboard / accessibility
----
### `keyboard shortcut discoverability --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** keyboard shortcut discoverability
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

----
### `focus not obscured --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** focus not obscured
**Source:** ux-guidelines.csv | **Found:** 3 results

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
- **Category:** Accessibility
- **Issue:** Focus Appearance
- **Platform:** Web
- **Description:** WCAG 2.2 AAA defines minimum area and contrast for focus indicators
- **Do:** Use an indicator at least as large as a 2 CSS px perimeter with 3:1 state contrast
- **Don't:** Present this enhanced AAA criterion as an AA requirement or use a thin low-contrast outline
- **Code Example Good:** outline: 2px solid currentColor; outline-offset: 2px
- **Code Example Bad:** box-shadow: 0 0 1px low-contrast
- **Severity:** Medium

```

----
### `visible focus indicator --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** visible focus indicator
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Interaction
- **Issue:** Focus States
- **Platform:** All
- **Description:** Keyboard focus, including controls inside a modal, needs a visible indicator
- **Do:** Use a visible focus ring on every interactive control, including modal controls
- **Don't:** Remove focus outline without replacement
- **Code Example Good:** focus:ring-2 focus:ring-blue-500
- **Code Example Bad:** outline-none without alternative
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Focus Not Obscured (Enhanced)
- **Platform:** Web
- **Description:** WCAG 2.2 AAA requires keyboard focus to remain fully visible
- **Do:** Keep the entire focused component unobscured by author-created content
- **Don't:** Present this enhanced AAA criterion as an AA requirement or allow persistent UI to hide any part of focus
- **Code Example Good:** close persistent overlay before focus moves behind it
- **Code Example Bad:** sticky footer covers half the focused button
- **Severity:** Medium

### Result 3
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

## States
----
### `empty state guidance next action --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** empty state guidance next action
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
### `skeleton loading placeholder --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** skeleton loading placeholder
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Content
- **Issue:** Placeholder Content
- **Platform:** All
- **Description:** Show realistic placeholders during dev
- **Do:** Use realistic sample data
- **Don't:** Lorem ipsum everywhere
- **Code Example Good:** Real sample content
- **Code Example Bad:** Lorem ipsum
- **Severity:** Low

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

```

----
### `error retry recovery --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** error retry recovery
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Feedback
- **Issue:** Error Recovery
- **Platform:** All
- **Description:** Help users recover from errors
- **Do:** Provide clear next steps
- **Don't:** Error without recovery path
- **Code Example Good:** Try again button + help link
- **Code Example Bad:** Error message only
- **Severity:** Medium

### Result 2
- **Category:** Accessibility
- **Issue:** Error Messages
- **Platform:** All
- **Description:** Error messages must be announced
- **Do:** Use aria-live or role=alert for errors
- **Don't:** Visual-only error indication
- **Code Example Good:** role='alert'
- **Code Example Bad:** Red border only
- **Severity:** High

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

```

## Icons
----
### `folder collection bookmark navigation icon --domain icons -n 6`
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** folder collection bookmark navigation icon
**Source:** icons.csv | **Found:** 6 results

### Result 1
- **Category:** Files
- **Icon Name:** folder
- **Keywords:** directory organize group files
- **Library:** Phosphor
- **Import Code:** import { Folder } from '@phosphor-icons/react'
- **Usage:** <Folder size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (fo...
- **Best For:** Folder directory
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 2
- **Category:** Social
- **Icon Name:** bookmark
- **Keywords:** save later favorite mark
- **Library:** Phosphor
- **Import Code:** import { Bookmark } from '@phosphor-icons/react'
- **Usage:** <Bookmark size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (...
- **Best For:** Bookmark save
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 3
- **Category:** Files
- **Icon Name:** folder-open
- **Keywords:** expanded browse files view
- **Library:** Phosphor
- **Import Code:** import { FolderOpen } from '@phosphor-icons/react'
- **Usage:** <FolderOpen size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state...
- **Best For:** Open folder browse
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 4
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

### Result 5
- **Category:** Social
- **Icon Name:** star
- **Keywords:** rating review favorite bookmark
- **Library:** Phosphor
- **Import Code:** import { Star } from '@phosphor-icons/react'
- **Usage:** <Star size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for ...
- **Best For:** Star rating favorite
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 6
- **Category:** Navigation
- **Icon Name:** list
- **Keywords:** hamburger menu navigation toggle bars
- **Library:** Phosphor
- **Import Code:** import { List } from '@phosphor-icons/react'
- **Usage:** <List size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for ...
- **Best For:** Mobile navigation drawer toggle sidebar
- **Style:** Outline
- **Semantic Role:** interactive
- **Allowed Contexts:** decorative|meaningful|interactive

```

----
### `decorative icon aria hidden --domain icons -n 3`
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** decorative icon aria hidden
**Source:** icons.csv | **Found:** 3 results

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
- **Category:** Security
- **Icon Name:** eye-slash
- **Keywords:** hide invisible password hidden
- **Library:** Phosphor
- **Import Code:** import { EyeSlash } from '@phosphor-icons/react'
- **Usage:** <EyeSlash size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (...
- **Best For:** Hide password
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

### Result 3
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

## Typography
----
### `documentation knowledge reading --domain typography -n 3`
```
## UI Pro Max Search Results
**Domain:** typography | **Query:** documentation knowledge reading
**Source:** typography.csv | **Found:** 3 results

### Result 1
- **Font Pairing Name:** Academia Mobile (Cormorant + Crimson + Cinzel)
- **Category:** Serif + Book Serif + Engraved (Triple Stack)
- **Heading Font:** Cormorant Garamond
- **Body Font:** Crimson Pro
- **Mood/Style Keywords:** academia, library, mahogany, parchment, brass, scholarly, prestige, antique, victorian, leather
- **Best For:** Knowledge management apps, scholarly reading tools, personal brand portfolios, RPG games, cultural community platforms
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,500;0,700;1,300;1,500&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,500;0,700;1,300;1,500&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
- **Tailwind Config:** fontFamily: { heading: ['Cormorant Garamond', 'serif'], body: ['Crimson Pro', 'serif'], display: ['Cinzel', 'serif'] }
- **Notes:** Triple-stack: Cormorant Garamond Medium for all headings (32–40px tight leading). Crimson Pro Regular for body reading text (16–18px, lineHeight 24–26px). Cinzel SemiBold for ALL-CAPS labels, overlines, section prefixes (10–12px, letterSpacing 2–3px). Drop caps: first letter 60px Cinzel in Brass #C9...

### Result 2
- **Font Pairing Name:** Minimal Swiss
- **Category:** Sans + Sans
- **Heading Font:** Inter
- **Body Font:** Inter
- **Mood/Style Keywords:** minimal, clean, swiss, functional, neutral, professional
- **Best For:** Dashboards, admin panels, documentation, enterprise apps, design systems
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
- **Tailwind Config:** fontFamily: { sans: ['Inter', 'sans-serif'] }
- **Notes:** Single font family with weight variations. Ultimate simplicity.

### Result 3
- **Font Pairing Name:** Science/Tech
- **Category:** Sans + Sans
- **Heading Font:** Exo
- **Body Font:** Roboto Mono
- **Mood/Style Keywords:** science, technology, research, data, futuristic, precise
- **Best For:** Science, research, tech documentation, data-heavy sites
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Exo:wght@300;400;500;600;700&family=Roboto+Mono:wght@300;400;500;700&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Exo:wght@300;400;500;600;700&family=Roboto+Mono:wght@300;400;500;700&display=swap');
- **Tailwind Config:** fontFamily: { sans: ['Exo', 'sans-serif'], mono: ['Roboto Mono', 'monospace'] }
- **Notes:** Exo for modern tech feel. Roboto Mono for code/data.

```

## Style
----
### `flat minimal documentation workspace --domain style -n 3`
```
## UI Pro Max Search Results
**Domain:** style | **Query:** flat minimal documentation workspace
**Source:** styles.csv | **Found:** 1 results

### Result 1
- **Style ID:** minimalism-and-swiss-style
- **Style Category:** Minimalism & Swiss Style
- **Aliases:** Minimal|Minimalism|Minimalism (Frame)
- **Status:** active
- **Parent Style ID:** 
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential
- **Primary Colors:** Monochromatic, Black #000000, White #FFFFFF
- **Effects & Animation:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading
- **Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** tailwind|bootstrap|mui
- **Complexity:** Low
- **AI Prompt Keywords:** Design a minimalist landing page. Use: white space, geometric layouts, sans-serif fonts, high contrast, grid-based structure, essential elements only. Avoid shadows and gradients. Focus on clarity and functionality.
- **CSS/Technical Keywords:** display: grid, gap: 2rem, font-family: sans-serif, color: #000 or #FFF, max-width: 1200px, clean borders, no box-shadow unless necessary
- **Implementation Checklist:** ☐ Grid-based layout 12-16 columns, ☐ Typography hierarchy clear, ☐ No unnecessary decorations, ☐ text contrast measured against the chosen project target, ☐ Mobile responsive grid
- **Design System Variables:** --spacing: 2rem, --border-radius: 0px, --font-weight: 400-700, --shadow: none, --accent-color: single primary only

```

## Stack implementation (React)
----
### `list rendering memo virtualize --stack react -n 3`
```
## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** list rendering memo virtualize
**Source:** stacks/react.csv | **Found:** 3 results

### Result 1
- **Category:** Rendering
- **Guideline:** Use React.memo wisely
- **Description:** Keep React.memo as a measured optimization, not a blanket default.
- **Do:** Use React.memo for pure components with stable props and real render cost
- **Don't:** Memoize every component or use it as a guess
- **Code Good:** memo(ExpensiveList)
- **Code Bad:** memo(SimpleButton)
- **Severity:** Low
- **Docs URL:** https://react.dev/reference/react/memo
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** Rendering
- **Guideline:** Use keys properly
- **Description:** Stable unique keys for list items
- **Do:** Use stable IDs as keys
- **Don't:** Array index as key for dynamic lists
- **Code Good:** key={item.id}
- **Code Bad:** key={index}
- **Severity:** High
- **Docs URL:** https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** TypeScript
- **Guideline:** Use generics for reusable components
- **Description:** Generic components for flexible typing
- **Do:** Generic props for list components
- **Don't:** Union types for flexibility
- **Code Good:** <List<T> items={T[]}>
- **Code Bad:** <List items={any[]}>
- **Severity:** Medium
- **Docs URL:** 
- **Applies To:** react 19.2.x
- **Status:** active
- **Verified At:** 2026-08-13

```

----
### `sidebar layout grid responsive --stack html-tailwind -n 3`
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** sidebar layout grid responsive
**Source:** stacks/html-tailwind.csv | **Found:** 3 results

### Result 1
- **Category:** Layout
- **Guideline:** Grid gaps
- **Description:** Use consistent gap utilities for spacing
- **Do:** gap-4 gap-6 gap-8
- **Don't:** Margins on individual items
- **Code Good:** grid gap-6
- **Code Bad:** grid with mb-4 on each item
- **Severity:** Medium
- **Docs URL:** https://tailwindcss.com/docs/gap
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** Layout
- **Guideline:** Responsive padding
- **Description:** Adjust padding for different screen sizes
- **Do:** px-4 md:px-6 lg:px-8
- **Don't:** Same padding all sizes
- **Code Good:** px-4 sm:px-6 lg:px-8
- **Code Bad:** px-8 (same all sizes)
- **Severity:** Medium
- **Docs URL:** 
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

```

----
### `truncate line clamp overflow --stack html-tailwind -n 3`
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** truncate line clamp overflow
**Source:** stacks/html-tailwind.csv | **Found:** 3 results

### Result 1
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

### Result 2
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

### Result 3
- **Category:** Typography
- **Guideline:** Line height
- **Description:** Use appropriate line height for readability
- **Do:** leading-relaxed for body text
- **Don't:** Default tight line height
- **Code Good:** leading-relaxed (1.625)
- **Code Bad:** leading-none or leading-tight
- **Severity:** Medium
- **Docs URL:** https://tailwindcss.com/docs/line-height
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

```

## Capture, action items, and view switching (issue-specific)
----
### `primary action button hierarchy --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** primary action button hierarchy
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

----
### `checkbox list task completion --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** checkbox list task completion
**Source:** ux-guidelines.csv | **Found:** 0 results

No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.
**Closest known terms:** collection, complete, collections, tags, talk, operation
```

----
### `tab panel content switching --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** tab panel content switching
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
- **Issue:** Placeholder Content
- **Platform:** All
- **Description:** Show realistic placeholders during dev
- **Do:** Use realistic sample data
- **Don't:** Lorem ipsum everywhere
- **Code Example Good:** Real sample content
- **Code Example Bad:** Lorem ipsum
- **Severity:** Low

### Result 3
- **Category:** Animation
- **Issue:** Auto-Rotating Content Controls
- **Platform:** All
- **Description:** Auto-rotating content needs user control
- **Do:** Provide previous next and play/pause; stop on focus or hover and when reduced motion is requested
- **Don't:** Auto-advance slides without a stop control
- **Code Example Good:** button aria-label="Pause carousel"
- **Code Example Bad:** timer-only carousel
- **Severity:** High

```

----
### `modal dialog focus trap escape --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** modal dialog focus trap escape
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Interaction
- **Issue:** Focus States
- **Platform:** All
- **Description:** Keyboard focus, including controls inside a modal, needs a visible indicator
- **Do:** Use a visible focus ring on every interactive control, including modal controls
- **Don't:** Remove focus outline without replacement
- **Code Example Good:** focus:ring-2 focus:ring-blue-500
- **Code Example Bad:** outline-none without alternative
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

----
### `reduced motion animation preference --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** reduced motion animation preference
**Source:** ux-guidelines.csv | **Found:** 3 results

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

```

## Dark mode contrast
----
### `dark mode contrast surface --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** dark mode contrast surface
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Typography
- **Issue:** Contrast Readability
- **Platform:** All
- **Description:** Body text needs good contrast
- **Do:** Use darker text on light backgrounds
- **Don't:** Gray text on gray background
- **Code Example Good:** text-gray-900 on white
- **Code Example Bad:** text-gray-400 on gray-100
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Color Contrast
- **Platform:** All
- **Description:** Text must be readable against background
- **Do:** Minimum 4.5:1 ratio for normal text
- **Don't:** Low contrast text
- **Code Example Good:** #333 on white (7:1)
- **Code Example Bad:** #999 on white (2.8:1)
- **Severity:** High

### Result 3
- **Category:** Accessibility
- **Issue:** Focus Appearance
- **Platform:** Web
- **Description:** WCAG 2.2 AAA defines minimum area and contrast for focus indicators
- **Do:** Use an indicator at least as large as a 2 CSS px perimeter with 3:1 state contrast
- **Don't:** Present this enhanced AAA criterion as an AA requirement or use a thin low-contrast outline
- **Code Example Good:** outline: 2px solid currentColor; outline-offset: 2px
- **Code Example Bad:** box-shadow: 0 0 1px low-contrast
- **Severity:** Medium

```

### Retry after a 0-result query (per SKILL.md "If a search returns 0 results")
----
### `checkbox state announcement --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** checkbox state announcement
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Navigation
- **Issue:** Active State
- **Platform:** All
- **Description:** Current page/section should be visually indicated
- **Do:** Highlight active nav item with color/underline
- **Don't:** No visual feedback on current location
- **Code Example Good:** text-primary border-b-2
- **Code Example Bad:** All links same style
- **Severity:** Medium

### Result 2
- **Category:** Navigation
- **Issue:** Deep Linking
- **Platform:** All
- **Description:** URLs should reflect current state for sharing
- **Do:** Update URL on state/view changes
- **Don't:** Static URLs for dynamic content
- **Code Example Good:** Use query params or hash
- **Code Example Bad:** Single URL for all states
- **Severity:** Medium

### Result 3
- **Category:** Animation
- **Issue:** Cancellable State Transitions
- **Platform:** Web
- **Description:** Rapid compact-control changes can interrupt an in-flight transition
- **Do:** Cancel or replace prior motion; set the final semantic state directly and handle cancellation cleanup
- **Don't:** Depend on animationend or transitionend for required state correctness
- **Code Example Good:** previous?.cancel(); setSelected(next)
- **Code Example Bad:** Enable the chip only inside transitionend
- **Severity:** High

```

----
### `nav hierarchy active state --domain ux -n 3`
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** nav hierarchy active state
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Navigation
- **Issue:** Active State
- **Platform:** All
- **Description:** Current page/section should be visually indicated
- **Do:** Highlight active nav item with color/underline
- **Don't:** No visual feedback on current location
- **Code Example Good:** text-primary border-b-2
- **Code Example Bad:** All links same style
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

```

