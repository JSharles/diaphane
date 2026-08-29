---
description: "Task list for The Documentary Feature, In One Place"
---

# Tasks: The Documentary Feature, In One Place

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

**Tests**: Required. New code ships with tests that keep the 80% gate green, written as part of the same change.

## Format: `[ID] [P?] Description`

- **[P]**: can run in parallel — different files, no dependency on incomplete work

---

## Slice 0 — Sequencing 🎯

- [~] T001 **Dropped 2026-08-29 at the user's call** — no branch split, no commit ceremony. 021 and 022 continue on `feat/project-settings-layout`; PR shape is his decision at the end.

## Slice 1 — The four places

**Goal**: one root, four addresses, the rail around all of them. States come in slice 2 — the rail is static here.

**Independently testable**: every step loads at its own URL with the rail beside it; `/documentation` lands a fresh project on step 1; a client is redirected from all five paths.

### The frame

- [x] T002 Create `documentation/layout.tsx` — contributor gate (redirect + the API's independent refusal already exists), then the rail beside `children`; at 390px the rail stacks above (FR-011)
- [x] T003 Create `features/documentation/components/documentation-rail.tsx` — four fixed numbered rows, names from i18n, active row from the pathname; no states yet
- [x] T004 Turn `documentation/page.tsx` into the root redirect: no document → sources; reference not `ready` → reference; else sections. `router.replace`, and nothing rendered

### The four steps

- [x] T005 Strip the reference-document section from `documentary-sources-page.tsx` — the sources page is now the document list and add/remove only
- [x] T006 Create `documentation/reference/page.tsx` rendering `ReferenceDocumentView` as the subject of its own screen — moved, not rebuilt; notes and the rewrite action travel with it
- [x] T007 Move the rubriques workspace to `documentation/sections/page.tsx` — `ClientContentPage` minus the header/back-link chrome the layout now owns
- [x] T008 Create `documentation/client/page.tsx` — `usePublicClientSections` + `ClientSectionView` in the same tab structure the client sees; empty state "Rien n'est publié"
- [x] T009 Repoint every internal link that targeted the old shapes: `DocumentationSummaryCard`, `StateBanner`'s `failedAction`, `documentary-sources-page`'s back link, `add-document-dialog`'s post-connect return

### Cover

- [x] T010 [P] Layout test: rail present on every step, client redirected, error branch retries
- [x] T011 [P] Root test: the three landing branches, and `replace` (not `push`)
- [x] T012 Update `documentary-sources-page.test.tsx` (reference section gone) and add `reference/page` + `client/page` tests

## Slice 2 — The rail speaks

**Goal**: each step carries its state; the landing rule and the displayed states come from one function.

**Independently testable**: week-one project reads "Rien pour l'instant / En attente d'un premier fichier / En attente de l'étape 2 / Rien n'est publié"; adding a document flips step 1 and 2 lines without touching the numbers.

- [x] T013 Create `features/documentation/step-states.ts` — `stepStates(summary, workspace)` → four `{tone, line}` pairs; exhaustive unit tests: empty project, writing, failed, ready with open points, rubriques owed a refresh, pending review, published & current, previous version still visible, and a summary that failed to load reading as unknown (021's FR-009 rule carried over)
- [x] T014 Wire the rail to `stepStates`; wire the root redirect to the same call
- [x] T015 Step 4's frame: since when the current release is live, and `previous_version_visible` said in words above the mirror
- [x] T016 [P] All strings in both locales; the four step names are the decided wording from the spec's table
- [x] T017 Verified at 390px on the real app (headless Chromium, 2026-08-29): the rail stacks above the panel, nothing scrolls sideways

## Slice 3 — The 021 revision

**Goal**: setup holds connections only; the documents live at step 1.

- [x] T018 Remove the documents block from the setup screen; delete `DocumentarySourceRow`; `NotionConnectionCard` becomes its own `SetupBlock` whose consequence line feeds "vos fichiers et pages Notion"
- [x] T019 Reword `ProjectSetupRow`: setup state is board + Notion connection; files no longer counted there (the documentation card above it already carries them)
- [x] T020 [P] Update both locales; delete the strings this orphans; update `check-i18n-orphans.mjs` dynamic keys if any pattern died
- [x] T021 Update the affected tests: setup page, setup-row, and 021's `tasks.md` gets a note pointing at this revision

## Before it ships

- [~] T022 **Verified up to the credit wall (2026-08-29).** Driven live with a minted session and a real .docx: fresh project lands on step 1; upload → `incorporated`; the reference write fires on its own; the root lands on `/reference` once a document exists and on `/sources` when none does; all four steps render their real states. The write itself failed with `ANTHROPIC_CREDIT_EXHAUSTED` — the app's API key has no credits — so compose → approve → mirror could not run. The failure path behaved exactly as designed (step 2 in red, retry offered, nothing else moved). **Found and fixed on the way:** a failed reference write also turned step 3 red ("1 rédaction échouée") on a project with no rubrique — `failedOperationCount` aggregates every operation kind; `stepStates` now keeps a failure that is the reference's own off the rubriques row (+2 tests). Remaining once credits are topped up: click "Réécrire" on the project *Vérification 022 — parcours réel*, then walk compose → approve → mirror.
- [ ] T023 (blocked by the same missing credits — needs a published state first) The week-six check: with a document added after publication, the rail reads as a table of contents with states — numbers unmoved, nothing renumbered, step 3 saying "à rafraîchir"
- [x] T024 Run the gate: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:cov`, `pnpm knip`, `pnpm i18n:orphans`

## Dependencies

T001 before everything. T002–T003 before T004–T008. T013 before T014–T015. Slice 3 is independent of slice 2 once slice 1 lands.

## Not in this slice

Any API change. The creation-time flow. Composition, derivation, notes, atomic release — untouched (FR-008). Deep-linking the board's feeds line to step 4 (noted in the plan).
