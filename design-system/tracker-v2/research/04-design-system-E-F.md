## DS-E: focused single-user knowledge + task workspace
### COMMAND
```
search.py focus writing knowledge workspace calm minimal --design-system -p Tracker --density 7 --motion 2
```

### OUTPUT
```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║  TARGET: Tracker - RECOMMENDED DESIGN SYSTEM                                            ║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
┌─────────────────────────────────────────────────────────────────────────────────────────┐
├─── DESIGN DIALS ─────────────────────────────────────────────────────────────────────────┤
│  Motion:   2/10 — Subtle                                                                │
│  Density:  7/10 — Standard                                                              │
├─── PATTERN ──────────────────────────────────────────────────────────────────────────────┤
│  Name: Hero + Testimonials + CTA                                                        │
│     Conversion: Social proof before CTA. Use a concise set of verified testimonials with photo, name, and role. CTA after social proof. Provide previous/next and pause controls; stop rotation on focus, hover, and reduced motion; announce slide position. Previous/next buttons and keyboard controls must expose every slide without dragging.│
│     CTA: Hero (sticky) + Post-testimonials                                              │
│     Sections:                                                                           │
│       1. Hero                                                                           │
│       2. Problem statement                                                              │
│       3. Solution overview                                                              │
│       4. Testimonials carousel                                                          │
│       5. CTA                                                                            │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Neumorphism                                                                      │
│     Mode Support: Light supported  Dark conditional                                     │
│     Keywords: Soft UI, embossed, debossed, convex, concave, light source, subtle        │
│     depth, rounded (12-16px), monochromatic                                             │
│     Best For: Health/wellness apps, meditation platforms, fitness trackers, minimal     │
│     interaction UIs                                                                     │
│     Performance: cost:low|drivers:none | Accessibility: risk:high|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #7C3AED    (--color-primary)                                         │
│     On Primary:    #FFFFFF    (--color-on-primary)                                      │
│     Secondary:     #8B5CF6    (--color-secondary)                                       │
│     On Secondary:  #000000    (--color-on-secondary)                                    │
│     Accent/CTA:    #059669    (--color-accent)                                          │
│     On Accent/CTA: #000000    (--color-on-accent)                                       │
│     Background:    #FAF5FF    (--color-background)                                      │
│     Foreground:    #0F172A    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #0F172A    (--color-card-foreground)                               │
│     Muted:         #F7F3FD    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #EFE7FC    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #7C3AED    (--color-ring)                                            │
│     Notes: Calm lavender + mindful green                                                │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Lora / Raleway                                                                         │
│     Mood: calm, wellness, health, relaxing, natural, organic                            │
│     Best For: Health apps, wellness, spa, meditation, yoga, organic brands              │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;50...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Soft box-shadow (multiple: -5px -5px 15px, 5px 5px 15px), smooth press (150ms),     │
│     inner subtle shadow                                                                 │
├─── MOTION ───────────────────────────────────────────────────────────────────────────────┤
│  Scroll Reveal (Subtle)                                                                 │
│     Trigger: scroll (viewport enter) | Duration: 300-400ms | Easing: power1.out         │
│     GSAP: gsap.from(el, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out',        │
│     scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none      │
│     reverse' } });                                                                      │
│     Framework: Requires the ScrollTrigger plugin registered once via                    │
│     gsap.registerPlugin(ScrollTrigger); Use matchMedia('(prefers-reduced-motion:        │
│     reduce)') to skip non-essential motion and render the final state immediately       │
├─── AVOID ────────────────────────────────────────────────────────────────────────────────┤
│     Inconsistent styling + Poor contrast ratios                                         │
├─── PRE-DELIVERY CHECKLIST ───────────────────────────────────────────────────────────────┤
│     [ ] No emojis as icons (use SVG: Heroicons/Lucide)                                  │
│     [ ] cursor-pointer on all clickable elements                                        │
│     [ ] Hover states with smooth transitions (150-300ms)                                │
│     [ ] Light mode: text contrast 4.5:1 minimum                                         │
│     [ ] Focus states visible for keyboard nav                                           │
│     [ ] prefers-reduced-motion respected                                                │
│     [ ] Responsive: 375px, 768px, 1024px, 1440px                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## DS-F: keyboard-first professional tool
### COMMAND
```
search.py keyboard driven professional software tool --design-system -p Tracker --density 8 --motion 2
```

### OUTPUT
```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║  TARGET: Tracker - RECOMMENDED DESIGN SYSTEM                                            ║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
┌─────────────────────────────────────────────────────────────────────────────────────────┐
├─── DESIGN DIALS ─────────────────────────────────────────────────────────────────────────┤
│  Motion:   2/10 — Subtle                                                                │
│  Density:  8/10 — Dense / Dashboard                                                     │
├─── PATTERN ──────────────────────────────────────────────────────────────────────────────┤
│  Name: FAQ/Documentation Landing                                                        │
│     Conversion: Reduce support tickets. Track search analytics. Show related articles. Contact escalation path.│
│     CTA: Search bar prominent + Contact CTA for unresolved questions                    │
│     Sections:                                                                           │
│       1. Hero with search bar                                                           │
│       2. Popular categories                                                             │
│       3. FAQ accordion                                                                  │
│       4. Contact/support CTA                                                            │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Dark Mode (OLED)                                                                 │
│     Mode Support: Light not-recommended  Dark supported                                 │
│     Keywords: Dark theme, low light, high contrast, deep black, midnight blue,          │
│     eye-friendly, OLED, night mode, power efficient                                     │
│     Best For: Night-mode apps, coding platforms, entertainment, eye-strain prevention,  │
│     OLED devices, low-light                                                             │
│     Performance: cost:low|drivers:none | Accessibility: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #1E293B    (--color-primary)                                         │
│     On Primary:    #FFFFFF    (--color-on-primary)                                      │
│     Secondary:     #334155    (--color-secondary)                                       │
│     On Secondary:  #FFFFFF    (--color-on-secondary)                                    │
│     Accent/CTA:    #22C55E    (--color-accent)                                          │
│     On Accent/CTA: #0F172A    (--color-on-accent)                                       │
│     Background:    #0F172A    (--color-background)                                      │
│     Foreground:    #F8FAFC    (--color-foreground)                                      │
│     Card:          #1B2336    (--color-card)                                            │
│     Card Foreground: #F8FAFC    (--color-card-foreground)                               │
│     Muted:         #272F42    (--color-muted)                                           │
│     Muted Foreground: #94A3B8    (--color-muted-foreground)                             │
│     Border:        #475569    (--color-border)                                          │
│     Destructive:   #EF4444    (--color-destructive)                                     │
│     On Destructive: #000000    (--color-on-destructive)                                 │
│     Ring:          #FFFFFF    (--color-ring)                                            │
│     Notes: Code dark + run green                                                        │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  JetBrains Mono / IBM Plex Sans                                                         │
│     Mood: code, developer, technical, precise, functional, hacker                       │
│     Best For: Developer tools, documentation, code editors, tech blogs, CLI apps        │
│     Google Fonts: https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wg...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Minimal glow (text-shadow: 0 0 10px), dark-to-light transitions, low white          │
│     emission, high readability, visible focus                                           │
├─── MOTION ───────────────────────────────────────────────────────────────────────────────┤
│  Scroll Reveal (Subtle)                                                                 │
│     Trigger: scroll (viewport enter) | Duration: 300-400ms | Easing: power1.out         │
│     GSAP: gsap.from(el, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out',        │
│     scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none      │
│     reverse' } });                                                                      │
│     Framework: Requires the ScrollTrigger plugin registered once via                    │
│     gsap.registerPlugin(ScrollTrigger); Use matchMedia('(prefers-reduced-motion:        │
│     reduce)') to skip non-essential motion and render the final state immediately       │
├─── AVOID ────────────────────────────────────────────────────────────────────────────────┤
│     Light mode default + Slow performance                                               │
├─── PRE-DELIVERY CHECKLIST ───────────────────────────────────────────────────────────────┤
│     [ ] No emojis as icons (use SVG: Heroicons/Lucide)                                  │
│     [ ] cursor-pointer on all clickable elements                                        │
│     [ ] Hover states with smooth transitions (150-300ms)                                │
│     [ ] Light mode: text contrast 4.5:1 minimum                                         │
│     [ ] Focus states visible for keyboard nav                                           │
│     [ ] prefers-reduced-motion respected                                                │
│     [ ] Responsive: 375px, 768px, 1024px, 1440px                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

