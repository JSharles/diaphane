---
name: Diaphane
description: Track your project's progress with total transparency.
colors:
  background-black: "#080A0B"
  elevated-surface: "#0E1113"
  soft-surface: "#14181A"
  recessed-black: "#0B0D0F"
  primary-text: "#F1F5F6"
  secondary-text: "#949DA1"
  pure-white: "#FFFFFF"
  optical-light: "#C8EBFD"
  halo-blue: "#577DB8"
  cold-halo: "rgba(135, 175, 235, 0.20)"
  subtle-border: "rgba(220, 240, 248, 0.10)"
  input-border: "rgba(220, 240, 248, 0.16)"
  gradient-from: "#080A0B"
  gradient-via: "#090C0D"
  gradient-to: "#080B0C"
  destructive: "oklch(0.65 0.22 27.325)"
  success: "#16a34a"
  iris-pink: "oklch(0.68 0.04 240)"
  iris-yellow: "oklch(0.74 0.03 220)"
  iris-blue: "oklch(0.62 0.05 232)"
typography:
  display:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "normal"
  headline:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.08em"
  caption:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.025em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.primary-text}"
    textColor: "{colors.background-black}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0 1rem"
  button-primary-hover:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.background-black}"
  button-secondary:
    backgroundColor: "{colors.soft-surface}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0 1rem"
  card:
    backgroundColor: "{colors.elevated-surface}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.elevated-surface}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0.25rem 0.75rem"
---

# Design System: Diaphane

## Overview

**Creative North Star: "Optical memory"**

A contemporary, premium, editorial brand — with the faint memory of a very good screen. The CRT reference is a **texture, not a theme**: what it contributes is a slightly cold white, real depth in the blacks, and a barely-there optical diffusion around the few elements allowed to emit. Nothing on the page should be identifiable as "a CRT effect"; the viewer should *sense* a particular texture, never name a filter.

**The fundamental rule: BRAND DESIGN FIRST, optical effects second.** Roughly 90% contemporary editorial design, 10% optical memory. Every composition must be strong with all effects disabled — if removing an effect weakens the design, the design leaned on the effect.

Register: contemporary, editorial, precise, quiet, optical, luminous, technical, institutional, sophisticated, minimal. Explicitly **not**: retro, cyber, terminal, arcade, sci-fi UI, neon, glitch.

**Key Characteristics:**
- Single dark theme. The ground is `#080A0B` with felt-not-seen depth (an unnameable cold diffusion, a soft vignette, grain at ~1.5%). No scanlines, no screen frame, no device that makes the viewport read as a physical screen.
- The brand language is **BLACK + WHITE + LIGHT**, not black + blue. Blue is (almost) never a text color or a fill; it lives inside the light around white — the glow tokens — and nowhere else.
- **Matte by default.** 5–10% of elements may seem to emit slightly; that rarity is the sophistication.
- Hierarchy comes from size, weight, rhythm, composition, and contrast — never from effects. No outline type, no tracked-out titles.
- Urbanist for everything read; Geist Mono, sparingly, for small editorial-scientific labels.

## Colors

### The Palette (2026-08-31 — Optical memory)

Confirmed binding at the product-truth level (`docs/PRODUCT.md` § Brand Commitments).

| Name | Value | Role |
|---|---|---|
| **Background Black** | `#080A0B` | The page ground |
| **Elevated Surface** | `#0E1113` | Cards, popovers |
| **Soft Surface** | `#14181A` | Secondary controls, hover surfaces |
| **Recessed Black** | `#0B0D0F` | Recessed strips, quiet badge grounds |
| **Primary Text** | `#F1F5F6` | Text and the interactive voice — a slightly cold white |
| **Secondary Text** | `#949DA1` | Metadata, supporting copy (≈7:1 on the ground) |
| **Pure White** | `#FFFFFF` | The brightest step: one emphasized run in a headline, primary-button hover |
| **Optical Light** | `#C8EBFD` | **The signature light** — sampled from the brand moodboard's film-credit frame (letter core `#C8EBFD`, halo falloff toward `#577DB8`): emphasized words in headlines, focus rings, the light family. Never long runs of copy, never a fill |
| **Cold Halo** | `rgba(150,215,245,0.18)` | Exists only inside the glow tokens |
| **Subtle Border** | `rgba(220,240,248,0.10)` | Hairlines; hover may raise them *slightly* |
| **Input Border** | `rgba(220,240,248,0.16)` | Form-field strokes |

### The Glow Scale

Deliberately small, defined once (`--glow-subtle/medium/strong`), consumed via `glow-*` / `text-glow-*` utilities:

- **`glow-subtle`** — the house order of magnitude: `0 0 1px rgba(255,255,255,.35), 0 0 12px rgba(170,220,245,.08)`. The hero headline, the wordmark's diffusion, a hover bloom.
- **`glow-medium`** — a slightly fuller hover bloom. Never permanent.
- **`glow-strong`** — the single sanctioned highlight moment of a page.

### Named Rules

**The Localized-Light Rule.** Optical effects are never global. Sanctioned placements: a slight diffusion around the logo; a faint halo on a *selected* element; a hover bloom; a diffuse light behind one section; an optical texture inside an illustration or media panel. Never: page-wide overlays that read as a device, permanent halos on containers, glow on body text.

**The Effect-Removal Test.** For every effect: remove it — the design must still be strong. If not, redesign the composition, don't strengthen the effect.

**The No Second Accent Rule.** No hue accent at all — neither warm nor blue. Status colors (Success `#16a34a`, Destructive) are functional semantics only.

### Background

Never flat `#000`, never a nameable gradient: barely-stepped wash stops, a cold diffusion ≤3% mix, a soft vignette, static grain at ~1.5%. Depth you feel, not see.

### Iridescent Glass (Signature Card only)

The cold near-monochrome iris trio (chroma ≤0.05, 220–240°), blurred behind the Signature Card's frosted panel only. Not a general pattern.

*Revision note (2026-08-31):* supersedes the literal "phosphor/CRT" pass of 2026-08-30, which read as a theme — screen frame around the viewport, visible scanlines, outline hero type, framed sci-fi CTAs, tracked-out labels. All of it removed. What survives: the dark ground with optical depth, the cold-white voice, the glow vocabulary (an order of magnitude smaller), the mono label register (tracking cut to 0.08em), and the matte-by-default discipline. **Known remnant:** the logo assets still carry the old periwinkle mark baked into the image.

## Typography

**Display/Body Font:** Urbanist — contemporary, full letterforms, hierarchy by size and weight (900 display / 600 titles / 400 body). No outline treatment, no futurist styling, no exaggerated tracking on titles.
**Label Font:** Geist Mono — small editorial-scientific labels (eyebrows), `0.08em` tracking at most, muted color, used sparingly. It should evoke a nomenclature, not a terminal.

### Hierarchy

- **Display** (900, `clamp`, 1.05): the landing hero only. Sharp letters, no text-shadow: the hero's light is the scene light behind the title (Hero Rays), never a glow on the glyphs (halo removed 2026-09-04).
- **Headline** (600, 1.5rem) / **Title** (600, 1.125rem) / **Body** (400, 0.875–1rem, 1.5).
- **Label** (Geist Mono 500, 0.75rem, 0.08em, uppercase): eyebrows — labels, never headings.

### Named Rules

**The Emphasis-By-Light Rule (2026-08-31).** An emphasized run inside a headline is **Optical Light `#C8EBFD`** against `#F1F5F6` — the signature light appearing as text, the one place the hue is allowed to carry words. Full letterforms, no outline, no added halo; reserved for the few words where the sentence turns.

**The Eyebrow Rule.** Any uppercase label is a *label*, never a heading — and its tracking stays ≤0.08em.

## Layout

Generous negative space — the hero especially: a very strong headline in a controlled measure, a discreet subhead, one simple CTA, and nothing gratuitous. Tailwind default spacing; responsive card grids (1 → 2 → 3); marketing copy at `max-w-3xl` / `max-w-xl`; container padding `px-4` → `px-6`.

## Elevation & Depth

Flat by default. Elevation is the Background → Elevated → Soft surface steps plus the Subtle Border hairline; `shadow-sm` at rest on cards and inputs. Hover on clickable cards: the border rises slightly — no halos around containers.

## Shapes

Base radius `0.625rem`, stepped `0.375/0.5rem` for controls, `0.875rem` for large containers — moderate everywhere. `rounded-full` only for genuinely circular elements.

## Components

### Buttons

- **Primary:** Primary Text fill (`#F1F5F6`), Background Black text (≈17:1), `rounded-md`. Hover: Pure White + a *tiny* bloom (`glow-subtle`) — the bloom is never permanent. No gradients, no heavy shadows.
- **Secondary:** Soft Surface fill, Primary Text. **Outline variant:** transparent, `1px` border at `rgba(241,245,246,.35)`, Primary Text.
- **Focus:** 3px `ring/50` in Optical Light.

### Cards

`rounded-xl`, Elevated Surface, Subtle Border, `shadow-sm`. Hover on clickable cards: border slightly more visible. No colored cards, no glowing borders.

#### Signature Card (scoped exception)

The one or two surfaces carrying the product's core differentiation (today: the Current Task card): iris trio behind the frosted panel, rotating progress ring, pulsing Success dot.

### Inputs / Fields

Elevated Surface fill, Input Border stroke, `rounded-md`. Focus: border toward Optical Light + ring.

### Navigation

Transparent top nav. The wordmark is plain readable text in Primary Text with the *slightest* diffusion (`text-glow-subtle`) — one of the page's few permanent optical details. **Known mismatch:** the emblem PNG still carries the old periwinkle mark.

### Hero Rays (scoped, landing only)

The diffuse light behind the hero: `SideRays` (vendored from the React Bits registry, dep `ogl`; wrapped by `features/landing/components/hero-rays.tsx`), cold-white tones, slow, low opacity, masked out by mid-page — an atmosphere, not a beam show. Hidden under `prefers-reduced-motion` and below `sm`. No second animated background.

## Animation

Slow and near-imperceptible: progressive reveals, hover transitions ≥200ms, at most one slow luminous breathing per page. Honors `prefers-reduced-motion`; the page is complete without any of it.

## Do's and Don'ts

### Do:
- **Do** design matte-first: compositions that stand with every effect off, then at most 2–3 subtle optical details per viewport.
- **Do** keep hierarchy in size, weight, rhythm and composition; emphasis by a luminosity or weight step in full letterforms.
- **Do** keep blue inside the light — halos and focus — never as text or fills.
- **Do** keep borders as quiet hairlines that rise only slightly on hover.
- **Do** keep mono labels sparse, lightly tracked (≤0.08em), editorial.

### Don't:
- **Don't** reintroduce any screen-identifiable device: no scanlines, no viewport frame, no terminal grids, no glitch, no neon.
- **Don't** use outline type, tracked-out titles, or framed glowing CTAs.
- **Don't** make any glow permanent on a container, or put one on body text.
- **Don't** use nameable gradients — depth, not decor.
- **Don't** apply the Signature Card treatment to ordinary cards, or use Success for anything actionable.
- **Don't** reach for `brand-logo.png` (full lockup) — emblem plus CSS text label.
