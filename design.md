# Amiro Design System Notes

## Reference Direction

- Visual reference: user-provided `Image #1`.
- Target vibe: modern SaaS marketing layout with calm personality, clean hierarchy, and soft depth.
- Explicitly avoided: exaggerated neon color intensity and heavy brutalist treatment.

## Theme Strategy

- Core accent family is now a muted sage green across both light and dark modes.
- All landing and auth visuals use CSS tokens in `apps/web/src/index.css`.
- No component-level hardcoded hex/rgb values for the new design work.

### Key Token Groups

- App tokens: `--primary`, `--accent`, `--ring` (updated to align with green theme).
- Landing tokens:
  - Surface/background: `--landing-bg`, `--landing-surface`, `--landing-panel`
  - Text: `--landing-ink`, `--landing-subtle-ink`
  - Interaction: `--landing-accent`, `--landing-accent-foreground`
  - Structure: `--landing-border`, `--landing-grid`, `--landing-glow-a`, `--landing-glow-b`

## Component Architecture

### Shared Shell

- `apps/web/src/components/landing/landing-shell.tsx`
  - Shared marketing-style shell with themed canvas + nav.
  - Reused by landing page and dashboard states for visual consistency.

### Navigation and CTA Primitives

- `apps/web/src/components/landing/landing-nav.tsx`
  - Brand, section links, auth links, and theme switcher.
- `apps/web/src/components/landing/landing-button-link.tsx`
  - Reusable token-driven CTA/button link.

### Landing Sections

- `apps/web/src/components/landing/landing-section.tsx`
  - Reusable section frame (eyebrow/title/description/body).
- `apps/web/src/components/landing/landing-sections.tsx`
  - What We Do
  - How It Works
  - Pricing
  - FAQ
  - Bottom CTA
- `apps/web/src/components/landing/landing-hero.tsx`
  - Hero and value panel.

### Auth Experience

- `apps/web/src/components/sign-in-form.tsx`
- `apps/web/src/components/sign-up-form.tsx`
  - Both use shadcn card/input/button primitives with the same shell/theme context.

## Page Composition

- `apps/web/src/app/page.tsx`
  - Composes hero + all marketing sections in order.
- `apps/web/src/app/dashboard/page.tsx`
  - Uses the same shell for:
    - unauthenticated auth forms
    - authenticated dashboard summary card

## Guidelines for Future Updates

- Keep sections modular and data-driven (`landing-sections.tsx`) unless complexity requires splitting per section file.
- Preserve token-first styling; if a new color is needed, add a token first.
- Reuse `LandingShell` and `LandingButtonLink` for new marketing/auth pages.
- Keep copy concise and product-specific (Amiro = summarize, organize, reflect).
