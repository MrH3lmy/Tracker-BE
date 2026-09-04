## ICON-1
### COMMAND
```
search.py decorative icon aria hidden --domain icons -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** decorative icon aria hidden
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

### Result 4
- **Category:** Style Config
- **Icon Name:** academia-icon-system
- **Keywords:** academia, library, brass, ornate, phosphor, weight thin, muted warm, scholarly, mobile
- **Library:** Phosphor (react-native)
- **Import Code:** import { BookOpen } from 'phosphor-react-native'
- **Usage:** <BookOpen size={22} weight="thin" color={colors.brass} />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose ...
- **Best For:** Academia (Scholarly Mobile) style: weight="thin" (thin engraved feel), color={colors.brass} (#C9A962). No sharp geometric or tech-inspired icons. Prefer book, scroll, key, quill-type icon metaphors. Wrap in circular View with 1px brass border. Avoid neon or saturated colored icons. All icon-only nav...
- **Style:** Outline
- **Semantic Role:** meaningful
- **Allowed Contexts:** decorative|meaningful|interactive

```

## ICON-2
### COMMAND
```
search.py icon button accessible label navigation --domain icons -n 4
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** icons | **Query:** icon button accessible label navigation
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
- **Category:** Navigation
- **Icon Name:** arrow-left
- **Keywords:** back previous return navigate
- **Library:** Phosphor
- **Import Code:** import { ArrowLeft } from '@phosphor-icons/react'
- **Usage:** <ArrowLeft size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state ...
- **Best For:** Back button breadcrumb navigation
- **Style:** Outline
- **Semantic Role:** interactive
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
- **Category:** Navigation
- **Icon Name:** x
- **Keywords:** close cancel dismiss remove exit
- **Library:** Phosphor
- **Import Code:** import { X } from '@phosphor-icons/react'
- **Usage:** <X size={20} weight="regular" />; Context is chosen by use: if decorative beside visible text, set aria-hidden="true"; if meaningful without equivalent visible text, provide a text alternative; if inside an interactive control, give the control an accessible name and expose applicable state (for exa...
- **Best For:** Modal close dismiss button
- **Style:** Outline
- **Semantic Role:** interactive
- **Allowed Contexts:** decorative|meaningful|interactive

```

## STACK-1 react
### COMMAND
```
search.py layout shell route transition --stack react -n 4
```

### OUTPUT
```
## UI Pro Max Stack Guidelines
**Stack:** react | **Query:** layout shell route transition
**Source:** stacks/react.csv | **Found:** 0 results

No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.
**Closest known terms:** routes, hello, starttransition
```

## STACK-2 tailwind
### COMMAND
```
search.py semantic design tokens dark mode --stack html-tailwind -n 4
```

### OUTPUT
```
## UI Pro Max Stack Guidelines
**Stack:** html-tailwind | **Query:** semantic design tokens dark mode
**Source:** stacks/html-tailwind.csv | **Found:** 4 results

### Result 1
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

### Result 2
- **Category:** Colors
- **Guideline:** Semantic colors
- **Description:** Define semantic design tokens with CSS-first @theme
- **Do:** Declare --color-primary and related tokens in @theme
- **Don't:** Repeat palette utilities in components
- **Code Good:** bg-primary
- **Code Bad:** bg-blue-500 everywhere
- **Severity:** Medium
- **Docs URL:** https://tailwindcss.com/docs/theme
- **Applies To:** html-tailwind 4.3
- **Status:** active
- **Verified At:** 2026-08-13

### Result 3
- **Category:** Colors
- **Guideline:** Theme color variables
- **Description:** Declare color namespaces in @theme so Tailwind generates semantic utilities
- **Do:** @theme { --color-primary: oklch(...); }
- **Don't:** Use arbitrary CSS-variable utilities for registered tokens
- **Code Good:** bg-primary
- **Code Bad:** bg-[var(--color-primary)]
- **Severity:** Medium
- **Docs URL:** https://tailwindcss.com/docs/colors#customizing-your-colors
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

