## DS-A: baseline productivity workspace
### COMMAND
```
personal productivity work management workspace --design-system -p Tracker --density 8
```

### OUTPUT
```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║  TARGET: Tracker - RECOMMENDED DESIGN SYSTEM                                            ║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
┌─────────────────────────────────────────────────────────────────────────────────────────┐
├─── DESIGN DIALS ─────────────────────────────────────────────────────────────────────────┤
│  Density:  8/10 — Dense / Dashboard                                                     │
├─── PATTERN ──────────────────────────────────────────────────────────────────────────────┤
│  Name: Scroll-Triggered Storytelling                                                    │
│     Conversion: Keep the narrative understandable without scroll-driven effects. Use progress indicator. Mobile: simplify animations. Keep DOM reading order complete; disable parallax and scroll-scrub under reduced motion. Pause scroll animation when offscreen or hidden and render each chapter in its final readable state under reduced motion.│
│     CTA: End of each chapter (mini) + Final climax CTA                                  │
│     Sections:                                                                           │
│       1. Intro hook                                                                     │
│       2. Chapter 1 (problem)                                                            │
│       3. Chapter 2 (journey)                                                            │
│       4. Chapter 3 (solution)                                                           │
│       5. Climax CTA                                                                     │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Motion-Driven                                                                    │
│     Mode Support: Light supported  Dark supported                                       │
│     Keywords: Animation-heavy, microinteractions, smooth transitions, scroll effects,   │
│     parallax, entrance anim, page transitions                                           │
│     Best For: Portfolio sites, storytelling platforms, interactive experiences,         │
│     entertainment apps, creative, SaaS                                                  │
│     Performance: cost:low|drivers:none | Accessibility: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #18181B    (--color-primary)                                         │
│     On Primary:    #FFFFFF    (--color-on-primary)                                      │
│     Secondary:     #3F3F46    (--color-secondary)                                       │
│     On Secondary:  #FFFFFF    (--color-on-secondary)                                    │
│     Accent/CTA:    #2563EB    (--color-accent)                                          │
│     On Accent/CTA: #FFFFFF    (--color-on-accent)                                       │
│     Background:    #FAFAFA    (--color-background)                                      │
│     Foreground:    #09090B    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #09090B    (--color-card-foreground)                               │
│     Muted:         #E8ECF0    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #E4E4E7    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #18181B    (--color-ring)                                            │
│     Notes: Monochrome + blue accent                                                     │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Caveat / Quicksand                                                                     │
│     Mood: handwritten, personal, friendly, casual, warm, charming                       │
│     Best For: Personal blogs, invitations, creative portfolios, lifestyle brands        │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Quicksand:wght@300;400;500;600;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Scroll anim (Intersection Observer), hover (300-400ms), entrance, parallax (3-5     │
│     layers), page transitions                                                           │
├─── AVOID ────────────────────────────────────────────────────────────────────────────────┤
│     Corporate templates + Generic layouts                                               │
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

