## STYLE-1
### COMMAND
```
search.py productivity workspace application shell --domain style -n 6
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** style | **Query:** productivity workspace application shell
**Source:** styles.csv | **Found:** 0 results

No matches. This is not a match with an empty value -- the query did not hit the database. Retry with broader/different keywords before falling back to general defaults, and say explicitly that no database match was found if you do fall back.
```

## STYLE-2
### COMMAND
```
search.py content first calm reading surface --domain style -n 6
```

### OUTPUT
```
## UI Pro Max Search Results
**Domain:** style | **Query:** content first calm reading surface
**Source:** styles.csv | **Found:** 6 results

### Result 1
- **Style ID:** e-ink-paper
- **Style Category:** E-Ink / Paper
- **Aliases:** E-Ink Paper|E-Ink/Paper
- **Status:** active
- **Parent Style ID:** 
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Paper-like, matte, high contrast, texture, reading, calm, slow tech, monochrome
- **Primary Colors:** Off-White #FDFBF7, Paper White #F5F5F5, Ink Black #1A1A1A
- **Effects & Animation:** No motion blur, distinct page turns, grain/noise texture, sharp transitions (no fade)
- **Best For:** Reading apps, digital newspapers, minimal journals, distraction-free writing, slow-living brands
- **Light Mode ✓:** supported
- **Dark Mode ✓:** not-recommended
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** tailwind|css
- **Complexity:** Low
- **AI Prompt Keywords:** Design an e-ink/paper style interface. Use: high contrast black on off-white, paper texture, no animations (instant transitions), reading-focused, minimal UI chrome, distraction-free, calm aesthetic, monochrome.
- **CSS/Technical Keywords:** background: #FDFBF7 (paper white), color: #1A1A1A, transition: none, font-family: serif for reading, no gradients, border: 1px solid #E0E0E0, texture overlay (noise)
- **Implementation Checklist:** ☐ Paper background color, ☐ High contrast text, ☐ No animations, ☐ Reading optimized, ☐ Distraction-free, ☐ Print-friendly
- **Design System Variables:** --paper-bg: #FDFBF7, --ink-color: #1A1A1A, --pencil-grey: #4A4A4A, --border-color: #E0E0E0, --font-reading: Georgia, --transition: none

### Result 2
- **Style ID:** fluent-2
- **Style Category:** Fluent 2
- **Aliases:** Fluent UI|Microsoft Fluent 2
- **Status:** active
- **Parent Style ID:** 
- **Preferred Mode:** auto
- **Type:** Platform/System
- **Keywords:** fluent 2, microsoft, enterprise, calm, rounded, tokenized, cross-platform, copilot
- **Primary Colors:** Fluent neutral palette with brand and status tokens
- **Effects & Animation:** Subtle depth, calm transitions, platform-adaptive motion
- **Best For:** Microsoft 365, Windows, Copilot, and enterprise line-of-business tools
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:moderate|drivers:animation,blur
- **Accessibility:** risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** custom
- **Complexity:** Medium
- **AI Prompt Keywords:** Design a Fluent 2 product surface using calm hierarchy, standardized corners, semantic tokens, subtle depth, and platform-aware components. Preserve Microsoft interaction patterns and accessible focus states.
- **CSS/Technical Keywords:** design tokens, semantic color, component states, focus-visible, reduced motion
- **Implementation Checklist:** Use official tokens and components; preserve platform conventions; test keyboard, contrast, zoom, motion preferences, and responsive behavior
- **Design System Variables:** --color-primary, --color-surface, --color-on-surface, --radius-control, --motion-duration, --focus-ring

### Result 3
- **Style ID:** voice-first-multimodal
- **Style Category:** Voice-First Multimodal
- **Aliases:** 
- **Status:** active
- **Parent Style ID:** 
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Voice UI, multimodal, audio feedback, conversational, hands-free, ambient, contextual, speech recognition
- **Primary Colors:** Calm neutrals: Soft White #FAFAFA, Muted Blue #6B8FAF, Gentle Purple #9B8FBB
- **Effects & Animation:** Voice waveform visualization, listening pulse, processing spinner, speak animation, smooth transitions
- **Best For:** Voice assistants, accessibility apps, hands-free tools, smart home, automotive UI, cooking apps
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** web-speech-api|react
- **Complexity:** Medium
- **AI Prompt Keywords:** Design a voice-first multimodal interface. Use: voice waveform visualization, listening state indicator, speaking animation, minimal visible UI, audio feedback cues, hands-free optimized, conversational flow, ambient design.
- **CSS/Technical Keywords:** Web Speech API integration, canvas for waveform, animation: pulse for listening, status indicators (color change), audio visualization (Web Audio API), minimal chrome, large touch targets
- **Implementation Checklist:** ☐ Voice recognition works, ☐ Visual feedback clear, ☐ Listening state obvious, ☐ Speaking animation smooth, ☐ Fallback UI provided, ☐ Accessibility excellent
- **Design System Variables:** --listening-color: #6B8FAF, --speaking-color: #22C55E, --waveform-height: 60px, --pulse-duration: 1.5s, --indicator-size: 24px, --voice-accent: #9B8FBB

### Result 4
- **Style ID:** zero-interface
- **Style Category:** Zero Interface
- **Aliases:** 
- **Status:** active
- **Parent Style ID:** 
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Minimal visible UI, voice-first, gesture-based, AI-driven, invisible controls, predictive, context-aware, ambient
- **Primary Colors:** Neutral backgrounds: Soft white #FAFAFA, light grey #F0F0F0, warm off-white #F5F1E8
- **Effects & Animation:** Voice recognition UI, gesture detection, AI predictions (smooth reveal), progressive disclosure, smart suggestions
- **Best For:** Voice assistants, AI platforms, future-forward UX, smart home, contextual computing, ambient experiences
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** tailwind|custom
- **Complexity:** Low
- **AI Prompt Keywords:** Create a voice-first, gesture-based, AI-driven interface with minimal visible UI, progressive disclosure, voice recognition UI, gesture detection, AI predictions, smart suggestions, context-aware actions. Hide controls until needed.
- **CSS/Technical Keywords:** voice-commands: Web Speech API, gesture-detection: touch events, AI-predictions: hidden by default (reveal on hover), progressive-disclosure: show on demand, minimal UI visible
- **Implementation Checklist:** ☐ Voice commands responsive, ☐ Gesture detection active, ☐ AI predictions hidden/revealed, ☐ Progressive disclosure working, ☐ Minimal visible UI, ☐ Smart suggestions contextual
- **Design System Variables:** --voice-ui: enabled, --gesture-detection: active, --ai-predictions: smart, --progressive-disclosure: true, --visible-ui: minimal, --context-aware: true

### Result 5
- **Style ID:** liquid-glass
- **Style Category:** Liquid Glass
- **Aliases:** Apple Liquid Glass
- **Status:** active
- **Parent Style ID:** 
- **Preferred Mode:** auto
- **Type:** Platform/Material
- **Keywords:** dynamic material, optical glass, translucency, lensing, refraction, fluid morphing, system navigation
- **Primary Colors:** Adaptive translucent material derived from surrounding content; use color judiciously
- **Effects & Animation:** Lensing and refraction, adaptive translucency, and fluid morph transitions aligned to Apple platform behavior
- **Best For:** Apple-platform navigation, controls, and system-aligned app chrome
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:moderate|drivers:animation,blur
- **Accessibility:** risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** swiftui|uikit|appkit
- **Complexity:** High
- **AI Prompt Keywords:** Apply Apple Liquid Glass sparingly to navigation and controls. Use dynamic translucent material, lensing, and fluid transitions while keeping content clear. Respect reduced transparency and reduced motion settings.
- **CSS/Technical Keywords:** platform material, adaptive translucency, lensing, refraction, reduced transparency, reduced motion
- **Implementation Checklist:** ☐ Use for navigation and controls, ☐ Keep content on a separate layer, ☐ Apply color judiciously, ☐ Test reduced transparency, ☐ Test reduced motion, ☐ Verify text and control contrast
- **Design System Variables:** --material-role: navigation-controls, --translucency: adaptive, --tint: semantic, --reduced-transparency-fallback: opaque, --motion: platform-aligned

### Result 6
- **Style ID:** spectrum-design-system
- **Style Category:** Adobe Spectrum
- **Aliases:** Spectrum|Adobe Spectrum Design System
- **Status:** active
- **Parent Style ID:** 
- **Preferred Mode:** auto
- **Type:** Platform/System
- **Keywords:** adobe spectrum, creative tools, enterprise, content creation, tokenized, cross-platform
- **Primary Colors:** Spectrum semantic colors with product-specific accents
- **Effects & Animation:** Layered depth and restrained professional motion
- **Best For:** Creative tools, media workflows, document products, and Adobe-adjacent enterprise software
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:moderate|drivers:animation,blur
- **Accessibility:** risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** spectrum-web-components|react-spectrum
- **Complexity:** Medium
- **AI Prompt Keywords:** Design an Adobe Spectrum professional tool with tokenized color, precise hierarchy, dense but legible controls, strong focus states, and cross-platform component consistency.
- **CSS/Technical Keywords:** design tokens, semantic color, component states, focus-visible, reduced motion
- **Implementation Checklist:** Use official tokens and components; preserve platform conventions; test keyboard, contrast, zoom, motion preferences, and responsive behavior
- **Design System Variables:** --color-primary, --color-surface, --color-on-surface, --radius-control, --motion-duration, --focus-ring

```

