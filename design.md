# design.md

Read this before making any UI change. Every deviation needs a reason.

## philosophy

**Editorial minimalism.** Think Letterboxd's rail density and Pitchfork's typographic discipline. Whitespace and typography do the structural work. The manga covers are the content — everything else is scaffolding that should stay out of the way.

## the short list

- **Avoid AI-slop aesthetics.** No rounded-xl glass-morphism cards, no soft bg washes, no purple gradients, no subtle shadows, no pill badges for every piece of metadata.
- **Sharp corners.** The global CSS already snaps all `rounded-*` utilities to `0.375rem` — trust it. Don't fight it with inline styles.
- **Sentence case, always.** No `uppercase tracking-[0.28em]` eyebrows. Headings read like prose.
- **Hyperlink-style interactions.** `text-accent` on the word, arrow on hover, no buttons pretending to be links.
- **One motion only.** A 2px translate on hover arrows. Nothing else animates.

## typography

Inherited: Geist Sans + Geist Mono. Don't introduce new fonts.

| Role | Class |
|---|---|
| Section heading | `text-sm font-semibold text-white sm:text-base` |
| Small heading (nested) | `text-xs font-semibold text-white sm:text-sm` |
| Body | `text-sm text-white/80` or `text-surface-foreground` |
| Meta / caption | `text-xs text-surface-subtle` |
| Link / CTA | `text-xs font-medium text-accent hover:text-white` |
| Tiny meta | `text-[0.7rem]` on mobile, `sm:text-xs` on desktop |
| Placeholder / "coming soon" | `italic text-surface-subtle` |

Rules:
- Headings: sentence case. "Popular New Titles" — not "POPULAR NEW TITLES".
- Notes like "coming soon" go inline as `(coming soon)` in italic `text-surface-subtle`, never as a rounded pill.
- Truncate with `truncate` on headings that could overflow on 320px screens.

## color

Theme vars live in `globals.css`. Use CSS-variable–backed utilities, never hardcoded hex.

| Token | Purpose |
|---|---|
| `bg-surface` / `text-surface-foreground` | page ground + primary text |
| `text-surface-subtle` | muted body text, placeholders |
| `text-accent` | interactive text: links, active tab underlines, CTAs |
| `accent-soft` | rare — very subtle accent backdrop |
| `border-white/10` → `/15` → `/20` | hairline weights, low → high |

Rule: **accent appears only on things you can click.** A static "coming soon" note is not accent. A link is.

Themes (`dark`, `ocean`, `void`, `dim`, `light`) override `.bg-black`, `.bg-white/*`, `.border-white/*`, and `.text-white/*` via `[data-theme=...]` selectors in `globals.css`. Compose with those utilities so theming Just Works.

## spacing & rhythm

- Section-to-section gap: `mt-6 sm:mt-8`. **Not `mt-10`** — too airy.
- Section internal: `mb-2 sm:mb-4` between header and content, `space-y-2.5 sm:space-y-4` for nested stacks.
- Page main container: `px-4 sm:px-6 lg:px-10` + `pt-4 sm:pt-6 pb-10 sm:pb-16`.
- Box padding: `px-3 py-2.5 sm:px-4 sm:py-3` for minimal boxes, `p-4 sm:p-6` for larger.
- Card internal: `p-1.5 sm:p-2` with `gap-1.5` — keep it tight.

## containers / boxes

Default is **no box.** Reach for one only when content needs framing (placeholders, pulled-out notes, error states).

When you need a box:
- **Minimal hairline:** `border border-white/15 px-3 py-2.5 sm:px-4 sm:py-3`
- No background fill, no shadow, no rounded corners, no gradient accent.
- Full width by default — only add `max-w-*` if the content is genuinely text-heavy (>120 chars of body copy) and needs a reading-width constraint.

Banned:
- `bg-white/5` or `bg-[#0d0122]/70` or any tinted card background as a container — read as AI slop.
- `rounded-2xl` / `rounded-3xl` with a subtle border — classic template look.
- Boxed empty states. Prefer a single line of italic text.

## interactive elements

### Links (including see-all)

```tsx
<Link
  href={...}
  className="group inline-flex items-baseline gap-1 text-[0.7rem] font-medium text-accent transition-colors hover:text-white sm:text-xs"
>
  <span className="underline-offset-4 group-hover:underline">see all</span>
  <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
    →
  </span>
</Link>
```

Rules:
- Accent color at rest. White on hover.
- Underline appears on hover (via `group-hover:underline`), never at rest.
- Arrow slides 2px right on hover. That's the only motion.
- Use lowercase label: `"see all"`, `"view list"`, `"log in to view"`.

### Tabs (in `TabbedCarousel`)

Text links, not buttons. Active tab gets an accent underline. Layout is always `Heading | Tab1  Tab2  Tab3`.

```
Trending  |  Manhwa (KR)   Manga (JP)   Manhua (CN)
                ─────────
```

- No pill backgrounds, no borders, no count badges.
- Active: `text-white underline underline-offset-[5px] decoration-accent decoration-2` (mobile); `sm:underline-offset-[6px]`.
- Inactive: `text-surface-subtle hover:text-white`.
- Narrow viewports: the tab row scrolls horizontally (`overflow-x-auto scrollbar-none`). Don't wrap.

### Section header pattern (non-tabbed rails)

```tsx
<div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-4 sm:gap-3">
  <div className="flex min-w-0 items-baseline gap-1.5 sm:gap-3">
    <h2 className="truncate text-sm font-semibold text-white sm:text-base">{label}</h2>
    {note ? <span className="shrink-0 text-[0.7rem] italic text-surface-subtle sm:text-xs">({note})</span> : null}
  </div>
  {seeAllHref ? <Link ... /> : null}
</div>
```

Left-baseline heading, right-aligned see-all, both on one row. The note (e.g., "coming soon") sits beside the label in italic parens.

## placeholder / empty states

- Prefer a single line: `<p className="text-sm italic text-surface-subtle">No recent releases available right now.</p>`
- Missing data isn't a crisis — don't draw a big empty card around it.
- "Coming soon" placeholders for whole sections can use a minimal hairline box (above), but only when there's meaningful teaser copy.
- On logged-out states, skip the fake blurred carousel. Use a text link ("log in to view →") and a one-line italic note.

## text overflow

- Headings in flex/grid children: always add `truncate` + `min-w-0` to prevent overflow on narrow screens.
- Long unbreakable strings (URLs, tokens, hashes): use `break-all` so they wrap within the container instead of blowing it out. Example: dev-mode verification links in auth success messages.
- Body copy with natural word boundaries: prefer `break-words` over `break-all`.

## responsive

Mobile-first. Every meaningful size or gap should have a `sm:` (or `md:`) bump.

Pattern:
- Vertical spacing: ~20-25% tighter on mobile.
- Font sizes: step down one bucket on narrow screens (`text-sm → text-[0.8rem]`, `text-xs → text-[0.7rem]`).
- Gaps: `gap-2 sm:gap-4`.
- Use `truncate` + `min-w-0` on flex children that hold headings, to prevent tiny-screen overflow.
- `overflow-x-auto scrollbar-none` for tab rows and carousels on mobile.

Breakpoints in use: `sm` (640px), `md` (768px), `lg` (1024px). Avoid `xl`/`2xl` unless the layout genuinely splits further.

## do / don't

| Do | Don't |
|---|---|
| `text-sm font-semibold` heading | `text-xs uppercase tracking-[0.28em]` eyebrow |
| Text-link tabs with accent underline | Pill buttons with `rounded-full border bg-white/10` |
| `border border-white/15` hairline box | `rounded-2xl border bg-white/5` card |
| `italic text-surface-subtle` one-liner | Boxed empty state with centered CTA button |
| `text-accent` link + arrow | `bg-accent text-white rounded-md` pill button |
| Sentence case | ALL CAPS with letter-spacing |
| `(coming soon)` italic parens | Pill: `<span className="rounded-full border ... uppercase tracking-...">Coming soon</span>` |

## patterns to copy from the home page

- **Section header with see-all** — `src/app/page.tsx` `RailHeader`
- **Tabbed carousel with text-link tabs** — `src/components/manga/tabbed-carousel.tsx`
- **Minimal coming-soon box** — `src/app/page.tsx`, "Recent Community Reviews" section
- **Editorial footer** — `src/components/site-footer.tsx`

## when in doubt

Ask: "does this look like every other AI-generated SaaS landing page?" If the answer is even a little bit yes, strip more chrome. The design earns attention by restraint, not by stacking more effects.
