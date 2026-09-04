## ICON-3 full guideline
### COMMAND
```
search.py icon context accessibility --domain icons -n 1 --full
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** icon context accessibility
**Source:** icons.csv | **Found:** 1 results

### Result 1
- **Category:** Guideline
- **Icon Name:** icon-context-accessibility
- **Keywords:** decorative icon aria hidden, meaningful icon text alternative, icon button accessible label, accessible name, aria pressed, aria expanded, semantic context, phosphor, heroicons
- **Library:** Phosphor (primary) + Heroicons (fallback)
- **Import Code:** import { Question } from '@phosphor-icons/react'; import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
- **Usage:** Prefer the most semantically precise Phosphor icon, even if it is outside this curated subset. Use Heroicons only as a consistent fallback. Keep one visual family per surface. Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for example aria-pressed or aria-expanded).
- **Best For:** Contextual icon semantics, icon accessibility, and library fallback rules
- **Style:** Outline
- **Semantic Role:** guideline
- **Allowed Contexts:** decorative|meaningful|interactive

```

## STACK-3 react retry
### COMMAND
```
search.py memo rerender list --domain react -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** react | **Query:** memo rerender list
**Source:** react-performance.csv | **Found:** 4 results

### Result 1
- **Category:** Rerender
- **Issue:** Memoized Components
- **Platform:** React/Next.js
- **Description:** Extract expensive work into memoized components for early returns
- **Do:** Extract to memo() components
- **Don't:** Compute expensive values before early return
- **Code Example Good:** const UserAvatar = memo(({ user }) => ...); if (loading) return <Skeleton />
- **Code Example Bad:** const avatar = useMemo(() => compute(user)); if (loading) return <Skeleton />
- **Severity:** Medium

### Result 2
- **Category:** Rerender
- **Issue:** Narrow Dependencies
- **Platform:** React/Next.js
- **Description:** Specify primitive dependencies instead of objects in effects
- **Do:** Use primitive values in dependency arrays
- **Don't:** Use object references as dependencies
- **Code Example Good:** useEffect(() => { console.log(user.id) }, [user.id])
- **Code Example Bad:** useEffect(() => { console.log(user.id) }, [user])
- **Severity:** Low

### Result 3
- **Category:** Rerender
- **Issue:** Derived State
- **Platform:** React/Next.js
- **Description:** Subscribe to derived booleans instead of continuous values
- **Do:** Use derived boolean state
- **Don't:** Subscribe to continuous values
- **Code Example Good:** const isMobile = useMediaQuery('(max-width: 767px)')
- **Code Example Bad:** const width = useWindowWidth(); const isMobile = width < 768
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

