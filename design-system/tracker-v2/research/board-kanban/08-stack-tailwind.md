# Stack guidance — Tailwind and React implementation

## TW-1 sticky header scroll container
### COMMAND
```
search.py sticky header scroll container --stack html-tailwind -n 5
```

### OUTPUT
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** sticky header scroll container
**Source:** stacks/html-tailwind.csv | **Found:** 0 results

No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.
**Closest known terms:** contain, reader, readers
```

## TW-2 chip badge overflow nowrap
### COMMAND
```
search.py chip badge overflow nowrap --stack html-tailwind -n 4
```

### OUTPUT
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** chip badge overflow nowrap
**Source:** stacks/html-tailwind.csv | **Found:** 4 results

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

### Result 4
- **Category:** Typography
- **Guideline:** Balanced heading wrapping
- **Description:** Polish short multi-line headings without fixing exact line breaks
- **Do:** Use text-balance with a readable max-width and natural wrapping fallback
- **Don't:** Insert hardcoded br tags or blanket nonbreaking spaces
- **Code Good:** max-w-xl text-balance
- **Code Bad:** whitespace-nowrap with manual br
- **Severity:** Medium
- **Docs URL:** https://tailwindcss.com/docs/text-wrap
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

```

## TW-3 grid layout responsive columns
### COMMAND
```
search.py grid responsive columns gap --stack html-tailwind -n 4
```

### OUTPUT
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** grid responsive columns gap
**Source:** stacks/html-tailwind.csv | **Found:** 4 results

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
- **Category:** Spacing
- **Guideline:** Consistent spacing scale
- **Description:** Use Tailwind spacing scale consistently
- **Do:** p-4 m-6 gap-8
- **Don't:** Arbitrary pixel values
- **Code Good:** p-4 (1rem)
- **Code Bad:** p-[15px]
- **Severity:** Low
- **Docs URL:** https://tailwindcss.com/docs/customizing-spacing
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** Spacing
- **Guideline:** Space between
- **Description:** Use space-y-* for vertical lists
- **Do:** space-y-4 on flex/grid column
- **Don't:** Margin on each child
- **Code Good:** space-y-4
- **Code Bad:** Each child has mb-4
- **Severity:** Low
- **Docs URL:** https://tailwindcss.com/docs/space
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 4
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

```

## TW-4 focus visible ring dark mode
### COMMAND
```
search.py focus visible ring dark mode --stack html-tailwind -n 4
```

### OUTPUT
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** focus visible ring dark mode
**Source:** stacks/html-tailwind.csv | **Found:** 4 results

### Result 1
- **Category:** Accessibility
- **Guideline:** Focus visible
- **Description:** Show focus only for keyboard users
- **Do:** focus-visible:ring-2
- **Don't:** Focus on all interactions
- **Code Good:** focus-visible:ring-2
- **Code Bad:** focus:ring-2 (shows on click too)
- **Severity:** Medium
- **Docs URL:** 
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 2
- **Category:** Colors
- **Guideline:** Dark mode
- **Description:** Support dark mode with dark: prefix
- **Do:** dark:bg-gray-900 dark:text-white
- **Don't:** No dark mode support
- **Code Good:** dark:bg-gray-900
- **Code Bad:** Only light theme
- **Severity:** Medium
- **Docs URL:** https://tailwindcss.com/docs/dark-mode
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** Forms
- **Guideline:** Focus states
- **Description:** Always show focus indicators
- **Do:** focus:ring-2 focus:ring-blue-500
- **Don't:** Remove focus outline
- **Code Good:** focus:ring-2 focus:ring-offset-2
- **Code Bad:** focus:outline-none (no replacement)
- **Severity:** High
- **Docs URL:** https://tailwindcss.com/docs/hover-focus-and-other-states#focus
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 4
- **Category:** Forms
- **Guideline:** Placeholder styling
- **Description:** Style placeholder text appropriately
- **Do:** placeholder:text-gray-400
- **Don't:** Dark placeholder text
- **Code Good:** placeholder:text-gray-400
- **Code Bad:** Default dark placeholder
- **Severity:** Low
- **Docs URL:** 
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

```

