# Board controls — filters, undo, deep linking

## CTL-1 filter controls active state
### COMMAND
```
search.py filter controls applied state --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** filter controls applied state
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Animation
- **Issue:** Auto-Rotating Content Controls
- **Platform:** All
- **Description:** Auto-rotating content needs user control
- **Do:** Provide previous next and play/pause; stop on focus or hover and when reduced motion is requested
- **Don't:** Auto-advance slides without a stop control
- **Code Example Good:** button aria-label="Pause carousel"
- **Code Example Bad:** timer-only carousel
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
- **Category:** Layout
- **Issue:** Chip Collection Reflow
- **Platform:** All
- **Description:** Filter chips and editable value collections must preserve labels when space or text size changes
- **Do:** Wrap the collection or use an operable +n disclosure for hidden overflow values
- **Don't:** Force all chips into one clipped row or hide overflow values
- **Code Example Good:** <div class='chip-list'>{chips}</div> with flex-wrap
- **Code Example Bad:** <div class='chip-list' style='height:32px;overflow:hidden'>
- **Severity:** High

### Result 4
- **Category:** Navigation
- **Issue:** Active State
- **Platform:** All
- **Description:** Current page/section should be visually indicated
- **Do:** Highlight active nav item with color/underline
- **Don't:** No visual feedback on current location
- **Code Example Good:** text-primary border-b-2
- **Code Example Bad:** All links same style
- **Severity:** Medium

### Result 5
- **Category:** Navigation
- **Issue:** Deep Linking
- **Platform:** All
- **Description:** URLs should reflect current state for sharing
- **Do:** Update URL on state/view changes
- **Don't:** Static URLs for dynamic content
- **Code Example Good:** Use query params or hash
- **Code Example Bad:** Single URL for all states
- **Severity:** Medium

```

## CTL-2 undo reversible action
### COMMAND
```
search.py undo reversible destructive action --domain ux -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** undo reversible destructive action
**Source:** ux-guidelines.csv | **Found:** 1 results

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

```

## CTL-3 deep link url state
### COMMAND
```
search.py deep linking url reflects state --domain ux -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** ux | **Query:** deep linking url reflects state
**Source:** ux-guidelines.csv | **Found:** 4 results

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
- **Issue:** Active State
- **Platform:** All
- **Description:** Current page/section should be visually indicated
- **Do:** Highlight active nav item with color/underline
- **Don't:** No visual feedback on current location
- **Code Example Good:** text-primary border-b-2
- **Code Example Bad:** All links same style
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

