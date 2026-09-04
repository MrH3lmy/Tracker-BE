## DS-C: information-dense data workspace
### COMMAND
```
search.py information dense data workspace application --design-system -p Tracker --density 8 --motion 2
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
│  Name: Enterprise Gateway                                                               │
│     Conversion: Path selection (I am a...). Mega menu navigation. Trust signals prominent. Provide pause/stop for video and rotating logos; stop on focus and reduced motion. Logo carousel controls must be keyboard operable; pause moving media offscreen/hidden and render a static final state under reduced motion.│
│     CTA: Contact Sales (Primary) + Login (Secondary)                                    │
│     Sections:                                                                           │
│       1. Hero (Video/Mission)                                                           │
│       2. Solutions by Industry                                                          │
│       3. Solutions by Role                                                              │
│       4. Client Logos                                                                   │
│       5. Contact Sales                                                                  │
├─── STYLE ────────────────────────────────────────────────────────────────────────────────┤
│  Name: Data-Dense Dashboard                                                             │
│     Mode Support: Light supported  Dark supported                                       │
│     Keywords: Multiple charts/widgets, data tables, KPI cards, minimal padding, grid    │
│     layout, space-efficient, maximum data visibility                                    │
│     Best For: Business intelligence dashboards, financial analytics, enterprise         │
│     reporting, operational dashboards, data warehousing                                 │
│     Performance: cost:low|drivers:none | Accessibility: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #1E40AF    (--color-primary)                                         │
│     On Primary:    #FFFFFF    (--color-on-primary)                                      │
│     Secondary:     #3B82F6    (--color-secondary)                                       │
│     On Secondary:  #000000    (--color-on-secondary)                                    │
│     Accent/CTA:    #D97706    (--color-accent)                                          │
│     On Accent/CTA: #000000    (--color-on-accent)                                       │
│     Background:    #F8FAFC    (--color-background)                                      │
│     Foreground:    #1E3A8A    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #1E3A8A    (--color-card-foreground)                               │
│     Muted:         #E9EEF6    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #DBEAFE    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #1E40AF    (--color-ring)                                            │
│     Notes: Blue data + amber highlights [Accent adjusted from #F59E0B]                  │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Fira Code / Fira Sans                                                                  │
│     Mood: dashboard, data, analytics, code, technical, precise                          │
│     Best For: Dashboards, analytics, data visualization, admin panels                   │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@4...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Hover tooltips, chart zoom on click, row highlighting on hover, smooth filter       │
│     animations, data loading spinners                                                   │
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
│     Ornate design + No filtering                                                        │
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

## DS-D: personal planner habits notes calendar
### COMMAND
```
search.py personal planner habit tracker notes calendar --design-system -p Tracker --density 7 --motion 2
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
│  Name: Claymorphism                                                                     │
│     Mode Support: Light supported  Dark conditional                                     │
│     Keywords: Soft 3D, chunky, playful, toy-like, bubbly, thick borders (3-4px),        │
│     double shadows, rounded (16-24px)                                                   │
│     Best For: Educational apps, children's apps, SaaS platforms, creative tools,        │
│     fun-focused, onboarding, casual games                                               │
│     Performance: cost:low|drivers:none | Accessibility: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion│
├─── COLORS ───────────────────────────────────────────────────────────────────────────────┤
│     Primary:       #D97706    (--color-primary)                                         │
│     On Primary:    #000000    (--color-on-primary)                                      │
│     Secondary:     #F59E0B    (--color-secondary)                                       │
│     On Secondary:  #0F172A    (--color-on-secondary)                                    │
│     Accent/CTA:    #059669    (--color-accent)                                          │
│     On Accent/CTA: #000000    (--color-on-accent)                                       │
│     Background:    #FFFBEB    (--color-background)                                      │
│     Foreground:    #0F172A    (--color-foreground)                                      │
│     Card:          #FFFFFF    (--color-card)                                            │
│     Card Foreground: #0F172A    (--color-card-foreground)                               │
│     Muted:         #FCF6F0    (--color-muted)                                           │
│     Muted Foreground: #475569    (--color-muted-foreground)                             │
│     Border:        #FAEEE1    (--color-border)                                          │
│     Destructive:   #DC2626    (--color-destructive)                                     │
│     On Destructive: #FFFFFF    (--color-on-destructive)                                 │
│     Ring:          #D97706    (--color-ring)                                            │
│     Notes: Streak amber + habit green                                                   │
├─── TYPOGRAPHY ───────────────────────────────────────────────────────────────────────────┤
│  Caveat / Quicksand                                                                     │
│     Mood: handwritten, personal, friendly, casual, warm, charming                       │
│     Best For: Personal blogs, invitations, creative portfolios, lifestyle brands        │
│     Google Fonts: https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Quicksand:wght@300;400;500;600;700&display=swap│
│     CSS Import: @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;...│
├─── KEY EFFECTS ──────────────────────────────────────────────────────────────────────────┤
│     Inner+outer shadows (subtle, no hard lines), soft press (200ms ease-out), fluffy    │
│     elements, smooth transitions                                                        │
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
│     Muted colors + Low energy                                                           │
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

