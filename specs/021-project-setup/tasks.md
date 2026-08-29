---
description: "Task list for Setting a Project Up"
---

# Tasks: Setting a Project Up

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

**Tests**: Required. New code ships with tests that keep the 80% gate green, written as part of the same change.

## Format: `[ID] [P?] Description`

- **[P]**: can run in parallel — different files, no dependency on incomplete work

---

## Slice 1 — The move 🎯

**Goal**: the setup screen exists and holds everything that used to be configuration; the project page holds none of it. Complete and deliberately ugly — nothing yet says what anything feeds.

**Independently testable**: a contributor reaches `/projects/[id]/setup`, connects a board, and is returned there rather than to the project page; a client who types the URL is sent away.

### The route

- [x] T001 Create `apps/web/app/[locale]/(protected)/projects/[id]/setup/page.tsx` — contributor-only, with the same three branches `[id]/page.tsx` already uses: pending skeleton, load error with a retry, and the `role === "client"` redirect
- [x] T002 Compose the five existing controls onto it in the order the spec fixes — documents, board, Notion, meeting link, preferences — carrying over the `Suspense` boundary `BoardConnectionCard` needs for `useSearchParams`
- [x] T003 Strip every `SettingsSectionHeading` and every control from `[id]/page.tsx`; the contributor branch keeps the title, the join-meeting shortcut, `DocumentationSummaryCard` and `TeamSummaryCard`

### The return paths

- [x] T004 Point the board OAuth callback at the setup route in `apps/api/src/auth/auth.controller.ts:191`, and update `auth.controller.spec.ts` — both the success redirect and the `boardConnectError` one
- [x] T005 [P] Repoint `add-document-dialog.tsx`'s `configureNotion` link: `/projects/[id]#project-tools` no longer exists

### Strings and cover

- [x] T006 [P] Shell strings in `fr.json` and `en.json` — page title, lead, back link, load error, retry
- [x] T007 Cover the new route: a contributor sees the controls, a client is redirected, the error branch retries
- [x] T008 Update `[id]/page.test.tsx` — assert the project page no longer renders any of the five controls

---

## Slice 2 — What each block says

**Goal**: an empty input names what stays blocked, and a filled one names what is live. This is the design idea; slice 1 is only its container.

**Independently testable**: on an empty project the documents block reads `Alimente ce que lit votre client · En attente`; after one upload the same line reads `En service`.

### The shell

- [x] T009 Create `apps/web/shared/components/setup-block.tsx` — title, what it is, what it feeds, a state of `waiting | live | unknown`, and the control. Lives in `shared/` because three features that may not import each other all need it (Constitution III)
- [x] T010 [P] Cover it in `setup-block.test.tsx`: the waiting state, the live state, a block with no `feeds` rendering no line at all, and `unknown` reading as unknown rather than as absent (FR-009)

### The two inputs

- [x] T011 Wrap the documentary base in `SetupBlock`, with `NotionConnectionCard` rendered inside it rather than as a sibling — the block is *Fichiers et pages Notion*, so Notion cannot be a top-level row
- [x] T012 Wrap the board in `SetupBlock`, keeping `BoardConnectionCard`'s own reconnect branch intact
- [x] T013 Leave the meeting link and the three preferences as `SettingsRow` under their own headings — they feed nothing, and using the lighter component is what makes them lighter (FR-005)

### Words and width

- [x] T014 [P] The vocabulary table from the spec, verbatim, in both locales
- [ ] T015 Verify at 390px — the consequence line wraps under the control rather than pushing the block sideways

---

## Slice 3 — The way back

**Goal**: the project page says whether setup is done and how to get there. Ships with slice 1 or the branch does not merge — see the plan's first risk.

**Independently testable**: a project with no board and no documents shows *2 branchements en attente* on the project page; a configured one shows *tout est branché*.

### The field

- [~] T016 **Withdrawn.** The field would have required `ProjectsService` to read another module's tables (Constitution III), and going through their services makes `ProjectsModule` import `DocumentationModule`, which already imports it. See plan § Decisions.
- [~] T017 **Withdrawn with T016.** The four states it would have covered are covered client-side instead, in `setup-row.test.tsx`.

### The row

- [x] T018 Add the *Mise en place* row (`setup-row.tsx`, beside the route — it reads two features, which only a route may compose). It **names** what is missing rather than counting it: "2 branchements en attente" makes the developer open the screen to find out which two.
- [~] T019 **Not done, deliberately.** Re-routing `DocumentationSummaryCard` by state would make one link lead to two different places depending on data — less predictable than one extra click. The row directly below it already names what is missing and leads there in one.
- [x] T020 [P] Strings in both locales — five named states rather than a plural count (see T018)
- [x] T021 Cover the row in `[id]/page.test.tsx`: fully connected, one waiting, two waiting, board needing a reconnect

---

## Before it ships

- [ ] T022 Verify end to end on a real project: create one, land on it, follow the only route out, connect a board through the real GitHub round-trip, confirm the return lands on setup, add a document, watch both lines flip to `En service`
- [ ] T023 Confirm the bet: does the consequence line alone carry the hierarchy, with no accent colour and no badge? If it does not, say so here rather than quietly adding decoration — the spec's Decision 4 is what is being tested
- [ ] T024 Run the gate: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:cov`, `pnpm knip`, `pnpm i18n:orphans`

## Dependencies

T001 blocks everything in slice 1. T003 depends on T002 — move the controls before removing them, so no commit exists with neither. T009 blocks T011 and T012. T016 blocks T017, which blocks T018. Slice 2 and slice 3 are independent of each other once slice 1 lands.

## Revised by specs/022 (2026-08-29)

The documents block left the setup screen: the documents live at the
documentation's own step 1, and `DocumentarySourceRow` was deleted. The Notion
connection stands alone — the pipe, not what pours through it.

**Later the same day, the route itself was retired** at the user's call: with
the documents gone, `/setup` held four quiet rows — more address than content —
so the connections returned to the foot of the project page, under the work,
and the OAuth callback follows them back. What survives of this feature is its
substance: the `SetupBlock` consequence line ("Alimente… · En attente/En
service"), the vocabulary, the deleted dead headings, and the rule that the
callback lands wherever `BoardConnectionCard` renders.

## Not in this slice

The creation flow with its *Plus tard* exit. Wiring `project.language` into composition. Retiring the timezone and date-format fields. Any change to the reference document, the rubriques, or the sources list.
