# Plan: the documentary feature, in one place

**Branch**: `feat/documentation-in-one-place` | **Date**: 2026-08-29 | **Spec**: [spec.md](spec.md)

## The shape of the change

Frontend only. The API is untouched — every state the rail shows and everything each step renders is already served, and the mirror's endpoint (`GET …/documentation/public-sections`) already admits contributors, since it requires *member*, not *client*. The work is cutting two overloaded pages into four places and hanging them off one shared rail.

```
documentation/
├── layout.tsx        ← the rail, wrapping every step
├── page.tsx          ← the root: redirects to a step, renders nothing
├── sources/          ← step 1  (existing page, minus the reference document)
│   └── [documentId]/ ← one document (unchanged)
├── reference/        ← step 2  (ReferenceDocumentView, moved — not rebuilt)
├── sections/         ← step 3  (the rubriques workspace, moved)
└── client/           ← step 4  (new: ClientSectionView over public-sections)
```

Paths are language-neutral like every existing route; the four names live in i18n.

## Decisions

**The rail is a layout, not a component each page remembers to include.** `documentation/layout.tsx` renders it around `children`, so a step cannot exist without the rail and the four steps cannot drift apart. It reads `useReferenceSummary` and `useDocumentationWorkspace` — both already called by the pages it wraps, so React Query serves the rail from the same two fetches (FR-005: zero new requests, zero new endpoints).

**The root page owns the landing rule and renders nothing.** `/documentation` reads the same two hooks and replaces itself: no document → step 1; reference not ready → step 2; otherwise step 3. `router.replace`, so the back button never lands on an empty root.

**Step 2 is a move, not a build.** `ReferenceDocumentView` already renders the prose with open points inline, correction in place, the notes and the rewrite action. It leaves the foot of the sources page and becomes the whole of `/reference`. The sources page keeps the list and add/remove only.

**Step 4 is `ClientSectionView` over `usePublicClientSections` — the mirror is free.** specs/020 (T024b) made the developer's preview and the client's page the same shared component precisely so they cannot drift. Step 4 reuses both the hook and the component; what it adds is the frame: since when this is live (`ClientContentRelease`), and `clientVisibility === "previous_version_visible"` said in words — the atomic publication made legible.

**The rail's per-step state lines are derived, in one file.** A `stepStates(summary, workspace)` helper maps the two payloads onto four `{state, line}` pairs, unit-tested exhaustively. The rail renders it; the root's redirect reads the same helper, so the landing rule and the displayed states can never disagree.

**specs/021 is revised where the two overlap, not reworked.** The setup screen loses the documents block: `DocumentarySourceRow` (the 021 `SetupBlock`) is deleted and `NotionConnectionCard` becomes its own block again, its consequence line now feeding "vos fichiers et pages Notion". `ProjectSetupRow` on the project page stops mentioning files — setup is board + Notion connection + meeting + preferences, and the documentation card directly above it already carries the documentary state. `AddDocumentDialog`'s "connect Notion first" link keeps pointing at `/setup`, which is still where the connection lives.

## Sequencing — one thing before any code

Nothing from 021 is committed. 022 rewrites parts of what 021 built, so the order is: commit 021 on `feat/project-settings-layout` as it stands, branch `feat/documentation-in-one-place` from it, and let the 021 revision be visible 022 diff — not history rewritten inside one mixed branch.

## API

None. No new route, no changed route, no schema change, no migration.

## Slices

1. **The four places.** The layout with a static rail (names and numbers, no states yet), the root redirect, the four routes: sources stripped of the reference document, `/reference` receiving `ReferenceDocumentView`, the rubriques workspace moved to `/sections`, `/client` rendering the mirror. Old paths redirect. Contributor-only on every step.

2. **The rail speaks.** The `stepStates` helper and its tests, states and lines on the rail, the landing rule wired to the same helper, empty states per step ("En attente d'un premier fichier", "En attente de l'étape 2", "Rien n'est publié"), step 4's frame (since when · previous version still visible). Both locales. 390px: the rail stacks above the panel.

3. **The 021 revision.** Documents leave the setup screen, Notion connection stands alone there, `ProjectSetupRow` reworded, `DocumentationSummaryCard` points at the root. Dead strings removed.

## Risks

**The move breaks muscle memory and links.** `/documentation` stops being the rubriques. Old deep links must land somewhere sane — the root redirect covers `/documentation`; `/documentation/sources` still exists as step 1.

**Two pages become five files and the shared state logic is subtle.** The `stepStates` helper is the mitigation: one pure function, exhaustively tested, both consumers.

**Polling collisions.** `useDocumentationWorkspace` polls; with the rail mounted on every step it must stay a single subscription (same query key), or four steps poll four times. React Query handles this if the hook is called identically — verify, don't assume.

## Noticed on the way, not in scope

The board's `feeds` line on setup says it feeds "l'avancement affiché au client" — after 022 lands, step 4 exists and that line could deep-link to it. Cosmetic, later.
