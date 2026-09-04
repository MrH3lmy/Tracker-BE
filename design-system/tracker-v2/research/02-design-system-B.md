## DS-B: retry — task management dashboard SaaS
### COMMAND
```
search.py task management dashboard productivity SaaS --design-system -p Tracker --density 8 --motion 2
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
│  Name: Product Demo + Features                                                          │
│     Conversion: Use an interactive demo only when it explains value better than static media. Provide captions, transcript, visible play/pause controls, and a non-video fallback; do not autoplay under reduced motion. Pause media when offscreen or hidden and keep the final product state available as static content.│
│     CTA: Video center + CTA right/bottom                                                │
│     Sections:                                                                           │
│       1. Hero                                                                           │
│       2. Product video/mockup (center)                                                  │
│       3. Feature breakdown per section                                                  │
│       4. Comparison (optional)                                                          │
│       5. CTA                                                                            │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Flat Design                                                                      │
│     Mode Support: Light supported  Dark supported                                       │
│     Keywords: 2D, minimalist, bold colors, no shadows, clean lines, simple shapes,      │
│     typography-focused, modern, icon-heavy                                              │
│     Best For: Web apps, mobile apps, cross-platform, startup MVPs, user-friendly,       │
│     SaaS, dashboards, corporate                                                         │
│     Performance: cost:low|drivers:none | Accessibility: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #0D9488    (--color-primary)                                         │
│     On Primary:    #000000    (--color-on-primary)                                      │
│     Secondary:     #14B8A6    (--color-secondary)                                       │
│     On Secondary:  #0F172A    (--color-on-secondary)                                    │
│     Accent/CTA:    #EA580C    (--color-accent)                                          │
│     On Accent/CTA: #000000    (--color-on-accent)                                       │
│     Background:    #F0FDFA    (--color-background)                                      │
│     Foreground:    #134E4A    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #134E4A    (--color-card-foreground)                               │
│     Muted:         #E8F1F4    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #99F6E4    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #0D9488    (--color-ring)                                            │
│     Notes: Teal focus + action orange [Accent adjusted from #F97316]                    │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Plus Jakarta Sans / Plus Jakarta Sans                                                  │
│     Mood: friendly, modern, saas, clean, approachable, professional                     │
│     Best For: SaaS products, web apps, dashboards, B2B, productivity tools              │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+San...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     No gradients/shadows, simple hover (color/opacity shift), fast loading, clean       │
│     transitions (150-200ms ease), minimal icons                                         │
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
│     Complex onboarding + Slow performance                                               │
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

