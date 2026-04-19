# NO-Plan — Design System (MASTER)

> Source of truth for every UI decision. Page-specific files in `design-system/pages/` override this.
> Tone: **calm, focused, professional**. Personal productivity dashboard. Bilingual AR/EN.

## 1. Design intent

Keep the existing **manuscript** DNA (parchment + navy ink + gold), but execute it to a high-class standard. The product is about **restraint and intention** (a "ban list" — what NOT to do today). The UI should feel considered, never loud.

- **Feel:** quiet confidence. Generous negative space. Warm neutrals. Single gold accent used sparingly as a signal, not decoration.
- **Don't:** no emojis as icons, no raw Tailwind color classes in components, no gradient-heavy hero, no busy background patterns competing with content.
- **Do:** semantic tokens everywhere, tabular figures for data, one primary action per screen, skeleton loading states, visible focus rings.

## 2. Color (semantic tokens)

All components consume semantic tokens. Raw hex / `bg-emerald-100` class usage is a violation.

### Role tokens (light)
| Token | HSL | Hex | Purpose |
|---|---|---|---|
| `--surface` | `40 44% 96%` | `#FBF7EF` | Page background (parchment) |
| `--surface-2` | `42 46% 92%` | `#F5EFE2` | Elevated panels, dividers |
| `--surface-card` | `0 0% 100%` | `#FFFFFF` | Card body |
| `--ink` | `213 50% 12%` | `#0F1B2D` | Primary text |
| `--ink-2` | `218 40% 20%` | `#1E2D46` | Secondary text (≥ 4.5:1 on surface) |
| `--ink-muted` | `218 20% 40%` | `#525C6B` | Tertiary text (≥ 4.5:1 on surface) — **raised from previous 213/20%/50%** which failed contrast |
| `--border` | `42 30% 85%` | `#DFD5BD` | Hairline borders |
| `--border-strong` | `42 25% 70%` | `#B5A98A` | Interactive borders on focus/hover |
| `--accent` | `41 56% 48%` | `#BB9640` | Gold, primary signal color (darkened from `#C9A14A` to meet 4.5:1 on white for small text) |
| `--accent-hover` | `42 60% 40%` | `#A17E2A` | Gold hover |
| `--accent-on` | `0 0% 100%` | `#FFFFFF` | Text on accent |

### Status (semantic, never raw)
| Token | HSL | Hex | Usage |
|---|---|---|---|
| `--success` | `160 55% 28%` | `#217052` | Completed / positive outcome |
| `--success-surface` | `160 55% 94%` | `#E4F4EB` | Success badge bg |
| `--warn` | `32 85% 38%` | `#B5660F` | Warning, past-items-not-archived |
| `--warn-surface` | `40 85% 94%` | `#FBEFD6` | Warn badge bg |
| `--danger` | `10 65% 42%` | `#B24431` | Destructive actions |
| `--danger-surface` | `10 60% 95%` | `#F9E5DF` | Destructive badge bg |
| `--info` | `180 50% 30%` | `#266B72` | Teal — informational highlights, "positive alternative" |
| `--info-surface` | `180 45% 93%` | `#DDEFEF` | Info badge bg |

### Risk levels (semantic, replace current ad-hoc bg-emerald/green/amber/orange/red)
| Level | Token | Label EN | Label AR |
|---|---|---|---|
| 1 | `--risk-1` → `--success` | Very Low | منخفض جدًّا |
| 2 | `--risk-2` → mix(success, warn, 0.35) | Low | منخفض |
| 3 | `--risk-3` → `--warn` | Medium | متوسط |
| 4 | `--risk-4` → mix(warn, danger, 0.5) | High | عالٍ |
| 5 | `--risk-5` → `--danger` | Very High | عالٍ جدًّا |

Every risk badge MUST pair the color with a numeric dot/icon (color is not the only signal — WCAG §1.4.1).

### Dark mode
Dark ink becomes background, parchment becomes tertiary text. Gold stays visible by brightening to `#D4B05A`. All status surfaces desaturate and darken — do not invert.

## 3. Typography

### Fonts (keep existing — good bilingual choice)
- **Display:** `Reem Kufi` (headings, landing hero)
- **Body:** `Tajawal` (Arabic-first, excellent Latin fallback)
- **Serif:** `Amiri` (quotations, principles page, reflective copy only)
- **Mono / tabular:** `JSS variant via font-feature-settings: "tnum" 1, "lnum" 1` on number-heavy elements (hours recovered, timestamps).

Preload the two most critical font files. Use `font-display: swap`.

### Scale (major-third: 1.25)
| Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `--text-xs` | 12px | 1.4 | 500 | Labels, metadata |
| `--text-sm` | 14px | 1.5 | 400 | Helper text, chips |
| `--text-base` | 16px | 1.6 | 400 | Body copy (min on mobile) |
| `--text-md` | 18px | 1.5 | 500 | Card titles |
| `--text-lg` | 20px | 1.4 | 600 | Section headers |
| `--text-xl` | 24px | 1.3 | 700 | Page H2 |
| `--text-2xl` | 30px | 1.25 | 700 | Page H1 |
| `--text-3xl` | 36px | 1.2 | 700 | Landing hero |

Body text min **16px on mobile** (iOS auto-zoom avoidance).

## 4. Spacing (4/8 scale — no ad-hoc values)

| Token | Value | Use |
|---|---|---|
| `--space-0` | 0 | |
| `--space-1` | 4px | Icon ↔ label gap, tight chip padding |
| `--space-2` | 8px | Form input vertical gap |
| `--space-3` | 12px | Card inner list item gap |
| `--space-4` | 16px | Standard component padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section stack within page |
| `--space-8` | 32px | Page section spacing |
| `--space-10` | 40px | |
| `--space-12` | 48px | Hero vertical |

Page container: `max-w-5xl` on dashboard, `max-w-6xl` on landing, `max-w-2xl` on auth.

## 5. Radius & elevation

- `--radius-sm: 6px` (chips, small buttons)
- `--radius-md: 10px` (inputs)
- `--radius-lg: 14px` (cards) — slightly flatter than the current 0.75rem (12px → 14px for more breathing room)
- `--radius-xl: 20px` (modals, sheets)

Shadow scale (no one-off shadows):
- `--shadow-sm`: `0 1px 2px hsl(213 25% 15% / 0.05)`
- `--shadow-md`: `0 2px 8px hsl(213 25% 15% / 0.06), 0 1px 2px hsl(213 25% 15% / 0.04)`
- `--shadow-lg`: `0 8px 24px hsl(213 25% 15% / 0.08), 0 2px 6px hsl(213 25% 15% / 0.05)`

## 6. Motion

- Duration: micro `150ms`, standard `220ms`, modal `280ms`.
- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` (iOS-feel spring-ish).
- Exit ~70% of enter.
- Stagger list items `40ms`.
- **All animations must respect `prefers-reduced-motion: reduce`** → drop to opacity-only transitions at 100ms.
- Press feedback on tappable cards: scale to `0.98` for 120ms.

## 7. Icons

- **One family:** `lucide-react`. Stroke `1.75`.
- Sizes (tokens): `icon-xs` 14px, `icon-sm` 16px, `icon-md` 20px, `icon-lg` 24px.
- No emoji in UI. Source icon, trigger icon, hours-recovered icon — all Lucide.
  - `📍` → `<MapPin />`
  - `⏱` → `<Timer />` or `<Clock />`
  - Section headers: `CheckCircle2` (ban list), `Target` (priorities), `Zap` (if-then), `Flame` (streak), `Archive` (log).

## 8. Interaction baseline

- Every clickable element: `cursor-pointer`, ring on `:focus-visible`, `transition-colors duration-150`.
- Touch target: **≥ 44×44px** (use `hitSlop` via padding).
- Pressed state: reduce opacity to `0.92` OR scale `0.98` (pick one per component family — cards scale, buttons opacity).
- Button during async: disabled + spinner in-place (not separate loader).
- Destructive action: confirmation dialog, NOT a raw button.
- Form error: below field, red text + icon, `aria-live="polite"`.
- Every query: skeleton for > 300ms, error fallback with retry.

## 9. RTL / Bilingual

- Direction switches via `<html dir="...">` from `AppContext`.
- No hard-coded `left-*` / `right-*` → use `start-*` / `end-*`.
- Icons that have direction (arrows, chevrons) must flip with `rtl:rotate-180` utility.
- Latin fallback fonts always declared after Arabic in `font-family` stacks.

## 10. Accessibility (non-negotiable)

- Contrast: body ≥ 4.5:1, large text ≥ 3:1, UI glyphs ≥ 3:1. Verified at both light + dark.
- Focus rings visible (2px solid `--accent` + 2px outline offset).
- `aria-label` on every icon-only button.
- Form inputs have persistent labels (not placeholder-only).
- Color never the sole carrier of meaning.
- `prefers-reduced-motion` honored.
- Support system font scaling.

## 11. Component rules

### Card
- Background `--surface-card`, border `--border`, radius `--radius-lg`, padding `--space-5`.
- Hover (if interactive): border `--border-strong`, `--shadow-md`.
- No double nesting of cards.

### Button
- Primary: `--accent` bg, `--accent-on` text, weight 600, h-10, radius `--radius-md`.
- Secondary (outline): `--ink` text, border `--border`, bg transparent, hover `--surface-2`.
- Ghost: text only, hover `--surface-2`.
- Destructive: `--danger` bg.
- Disabled: opacity 0.5, `cursor-not-allowed`.

### Input
- h-10, border `--border`, bg `--surface-card`, text `--ink`.
- Focus: border `--accent`, ring `--accent` at 25% opacity.
- Error: border `--danger`, aria-invalid.

### Chip / Badge
- h-6, px-2, radius full, text-xs, weight 500.
- Status chips pair icon + label.

### Empty state
- Centered, Lucide icon 48px in `--ink-muted`, heading in `--text-md` weight 600, one-line explanation, one CTA button.
- Never just a sentence alone.

### Skeleton
- `--surface-2` base with shimmer overlay (respects reduced-motion).
- Match the actual component's shape & size.

## 12. What we are explicitly REMOVING

1. The diagonal cross-pattern SVG on `body` (too busy, hurts reading).
2. Emoji icons `📍 ⏱`.
3. Raw `bg-emerald-100 text-emerald-700` etc. in daily-plan risk badges.
4. The current muted-foreground `hsl(213 20% 50%)` — it fails 4.5:1 against parchment. Raised to 40% lightness.
5. The `h-9` input height — moves to `h-10` for touch comfort.
6. Nested card borders inside card bodies — replace with `--surface-2` row backgrounds.
