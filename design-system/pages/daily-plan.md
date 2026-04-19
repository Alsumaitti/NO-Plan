# Daily Plan — page overrides

Inherits MASTER.md. This page is the flagship of the redesign — it must look and feel noticeably more premium than the current version.

## Layout

- Single column on mobile, two-column at `lg:` (ban list spans wide, priorities + if-then stack on the right side on `xl:`).
- Container `max-w-5xl`, horizontal padding `--space-5` on mobile, `--space-6` on md.
- Sections stacked with `--space-8` between them.

## Header

- H1 in display font, `--text-2xl`, `--ink`. Date subline in `--text-sm` `--ink-muted`.
- "Add item" primary button on the right (start-aligned on RTL).
- Add a **focus score chip** on the right: "3 / 5 Done today" — uses `done` column (currently unused in UI).

## "Today's ban list" card

- Title row: `CheckCircle2` icon (gold), "Today's Ban List", count badge on end.
- Item row (replaces current nested-border pattern):
  - Row bg transparent, hover `--surface-2`, active `--surface-2` w/ left-border `--accent` 3px.
  - **Lead**: risk dot (colored circle 10px using `--risk-n`) + numeric tier label.
  - **Title**: item text in `--text-base` weight 500.
  - **Meta row** (below title, `--text-sm` `--ink-muted`): positive-alt chip (arrow-right icon, `--info-surface` bg), category chip (outline), source (`MapPin` icon + text), hours (`Timer` icon + tabular figures).
  - **Done toggle** (new): checkbox on start edge, hits the `done` DB column. Checked → row gets `line-through` + `--ink-muted`, moves to bottom of list.
  - **Delete**: overflow menu (`MoreHorizontal`) → confirmation dialog. Never one-tap destructive.
- Empty state: `CalendarCheck` icon 48px, "No bans set for today", "Pick what you'll avoid to protect your focus", "Add your first item" button.

## "Unarchived past items" banner

- Top of page (above ban list). `--warn-surface` bg, `--warn` accent border-start 3px.
- Icon `AlertTriangle`, body in `--ink`, CTA "Archive to log" opens confirmation sheet showing the items first (currently one-tap, no preview — unsafe).

## Priorities (top 3)

- 3 rows, each with ordinal chip (`1 2 3` in gold on gold-surface), input, drag handle (`GripVertical`) for reordering.
- Auto-save on blur (debounced 500ms) — remove the "Save priorities" button. Tiny "Saved ✓" indicator fades in.

## If-Then plans

- List with icon `Zap` on title.
- Item shape: "If <trigger> → Then <response>" rendered with the trigger in `--ink`, the response in `--info`.
- Add form always visible at bottom (not toggle) but collapsed to a compact "Add trigger..." input that expands on focus.
- Empty state: `Zap` icon, "Plan your first if-then", one-line why, example trigger.

## Risk level control (inside add form)

- Replace raw range + text label with **5 segmented pill buttons**, each showing the risk dot + level number. Tap to select. Visible tier label (Low / Medium / High) below.

## Loading + error states (NEW — currently missing)

- All four queries (`daily-items`, `priorities`, `if-then`, `unarchived`): skeleton shapes on first load. Error card with retry on 500.

## Animation

- Row enter: opacity 0 → 1 over 220ms, translate-y 8px → 0, stagger 40ms.
- Done-toggle: checkmark scales 0.6 → 1 over 150ms, row crossfades.
- Risk segment: segment-to-segment slide 180ms.
- Archive success: toast slide-in from top, auto-dismiss 3s.
- Reduced-motion: all of the above → opacity only.

## Acceptance checks

- [ ] No emoji anywhere on this page.
- [ ] All colors come from semantic tokens; no raw Tailwind color classes.
- [ ] Body text ≥ 16px on mobile, contrast ≥ 4.5:1 verified against parchment.
- [ ] Every interactive element ≥ 44×44px.
- [ ] Keyboard: Tab order matches visual; Enter on input adds item; Escape closes add form.
- [ ] RTL: icons and paddings flip correctly; tested at `dir="rtl"`.
- [ ] Skeleton shows within 100ms; error retries work.
- [ ] Dark mode: tested, contrast verified independently.
- [ ] Reduced-motion: animations drop to fade only.
