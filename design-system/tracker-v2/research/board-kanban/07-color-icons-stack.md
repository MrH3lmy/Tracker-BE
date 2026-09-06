# Color, icons and stack

## COL-1 productivity tool functional color hierarchy
### COMMAND
```
search.py productivity tool task status --domain color -n 4 --full
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** color | **Query:** productivity tool task status
**Source:** colors.csv | **Found:** 4 results

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

### Result 3
- **Product Type:** Status Page / Incident Management
- **Primary:** #16A34A
- **On Primary:** #000000
- **Secondary:** #22C55E
- **On Secondary:** #0F172A
- **Accent:** #DC2626
- **On Accent:** #FFFFFF
- **Background:** #F0FDF4
- **Foreground:** #14532D
- **Card:** #FFFFFF
- **Card Foreground:** #14532D
- **Muted:** #E8F0F1
- **Muted Foreground:** #475569
- **Border:** #BBF7D0
- **Destructive:** #DC2626
- **On Destructive:** #FFFFFF
- **Ring:** #16A34A
- **Notes:** Operational green + incident red + maintenance amber

### Result 4
- **Product Type:** Patent / IP Database
- **Primary:** #475569
- **On Primary:** #FFFFFF
- **Secondary:** #64748B
- **On Secondary:** #FFFFFF
- **Accent:** #A16207
- **On Accent:** #FFFFFF
- **Background:** #F8FAFC
- **Foreground:** #1E293B
- **Card:** #FFFFFF
- **Card Foreground:** #1E293B
- **Muted:** #EAEFF3
- **Muted Foreground:** #475569
- **Border:** #E2E8F0
- **Destructive:** #DC2626
- **On Destructive:** #FFFFFF
- **Ring:** #475569
- **Notes:** Formal neutral + patent type chips + status badges

```

## COL-2 project management pipeline stage color
### COMMAND
```
search.py project management pipeline stage --domain color -n 3 --full
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** color | **Query:** project management pipeline stage
**Source:** colors.csv | **Found:** 3 results

### Result 1
- **Product Type:** Open Source Project Landing
- **Primary:** #0F172A
- **On Primary:** #FFFFFF
- **Secondary:** #1E293B
- **On Secondary:** #FFFFFF
- **Accent:** #A16207
- **On Accent:** #FFFFFF
- **Background:** #020617
- **Foreground:** #F8FAFC
- **Card:** #0E1223
- **Card Foreground:** #F8FAFC
- **Muted:** #1A1E2F
- **Muted Foreground:** #94A3B8
- **Border:** #334155
- **Destructive:** #DC2626
- **On Destructive:** #FFFFFF
- **Ring:** #FFFFFF
- **Notes:** Dark code + star gold + fork silver + sponsor purple

### Result 2
- **Product Type:** CRM & Client Management
- **Primary:** #2563EB
- **On Primary:** #FFFFFF
- **Secondary:** #3B82F6
- **On Secondary:** #000000
- **Accent:** #059669
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
- **Notes:** Professional blue + deal green

### Result 3
- **Product Type:** Inventory & Stock Management
- **Primary:** #334155
- **On Primary:** #FFFFFF
- **Secondary:** #475569
- **On Secondary:** #FFFFFF
- **Accent:** #059669
- **On Accent:** #000000
- **Background:** #F8FAFC
- **Foreground:** #0F172A
- **Card:** #FFFFFF
- **Card Foreground:** #0F172A
- **Muted:** #F2F3F4
- **Muted Foreground:** #475569
- **Border:** #E6E8EA
- **Destructive:** #DC2626
- **On Destructive:** #FFFFFF
- **Ring:** #334155
- **Notes:** Industrial slate + stock green

```


## ICON-1 drag handle move icon
### COMMAND
```
search.py drag handle move reorder icon --domain icons -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** drag handle move reorder icon
**Source:** icons.csv | **Found:** 0 results

No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.
**Closest known terms:** love
```

## ICON-2 decorative icon aria hidden
### COMMAND
```
search.py decorative icon aria hidden --domain icons -n 3
```

### OUTPUT
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


## REACT-1 list rerender memo virtualization
### COMMAND
```
search.py rerender memo list --domain react -n 5
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** react | **Query:** rerender memo list
**Source:** react-performance.csv | **Found:** 5 results

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

### Result 5
- **Category:** Rerender
- **Issue:** Lazy State Init
- **Platform:** React/Next.js
- **Description:** Pass function to useState for expensive initial values
- **Do:** Use function form for expensive init
- **Don't:** Compute expensive value directly
- **Code Example Good:** useState(() => buildSearchIndex(items))
- **Code Example Bad:** useState(buildSearchIndex(items)) // runs every render
- **Severity:** Medium

```

## STACK-1 react drag list performance
### COMMAND
```
search.py list keys reconciliation reorder --stack react -n 5
```

### OUTPUT
```
## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** list keys reconciliation reorder
**Source:** stacks/react.csv | **Found:** 2 results

### Result 1
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

### Result 2
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

