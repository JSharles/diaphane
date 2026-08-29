# Plan: setting a project up

**Branch**: `feat/project-settings-layout` | **Date**: 2026-08-28 | **Spec**: [spec.md](spec.md)

## The shape of the change

This is a move, not a build. Every control the setup screen needs already exists and already fetches its own state — `BoardConnectionCard`, `NotionConnectionCard`, `DocumentarySourceRow`, `MeetingLinkCard`, `ProjectPreferences`. What changes is **where they live** and **what an empty one says**.

```
/projects/[id]                          /projects/[id]            /projects/[id]/setup
├── DocumentationSummaryCard            ├── DocumentationSummary   ├── Fichiers et pages Notion
├── TeamSummaryCard                     ├── Avancement             │     └── + Notion, folded in
├── "Sources"    → documents      ──▶   ├── TeamSummary            ├── Votre board
├── "Outils"     → board, notion        └── → Mise en place        ├── Lien de réunion
├── MeetingLinkCard                                                └── Préférences
└── "Préférences"→ 3 réglages
```

The only genuinely new code is the block shell that carries the consequence line, and the row that leads back to this screen from the project page.

## Decisions

**No new API for the setup screen.** The spec's FR-008 reads as though a setup state has to be assembled server-side. It does not: `GET /board-connections` returns `boardTitle` and `needsReconnect`, `GET /notion-connection` returns `{connected, workspaceName}`, and `useReferenceSummary` returns `documentCount` and the document status. The three cards already call these on today's project page, so moving them to `/setup` adds **zero** requests. Assembling the same facts a second time inside the project detail would create two sources of truth for one state — the failure `9b1e...`-era category work already paid for once.

**~~One narrow field is added, and only for the project page.~~ Dropped 2026-08-28, while writing slice 3.** The plan was for `ProjectDetailSchema` to gain a compact `setup` object so the project page's way-back row would not fire three requests to draw one line. Two things killed it.

Constitution III forbids `ProjectsService` reading the source-document and board-connection tables, and routing through those modules' own services means `ProjectsModule` importing `DocumentationModule` — which already imports `ProjectsModule`. A dependency cycle is not a problem to work around with `forwardRef`; it is the architecture saying the field is in the wrong module.

And the premise was wrong anyway: it is not three requests, it is **one**. `useReferenceSummary` is already in flight on the project page for `DocumentationSummaryCard`, so React Query serves the row from the same fetch; only `useBoardConnection` is new. One request is not worth an API field, a schema change and a cycle.

So `ProjectSetupRow` reads both hooks client-side. It lives beside the route rather than in a feature — the composition shape `client-main-tabs.tsx` already established, and the only one Constitution III allows: a feature may not import another feature, but a route may compose several.

**The consequence line is a shared shell, not a prop on five cards.** A `SetupBlock` takes a title, what it holds, what it feeds, a state, and the control. It lives in `shared/components/` beside `SettingsRow`, because the three features that need it are forbidden from importing each other (Constitution III).

*Revised while building slice 2:* this said the cards would "keep their own logic and get wrapped". They cannot be wrapped — each already renders its own `SettingsRow` with its own title, so a wrapper produced a title above a title, which is the exact duplication the spec set out to remove. The two inputs render `SetupBlock` themselves instead. Same shell, same shared home, one title each.

**`SettingsRow` stays for the tail.** The meeting link and the three preferences are rows, not inputs: they feed nothing and carry no state. Wrapping them in `SetupBlock` with an empty `feeds` would be the shell pretending they are the same kind of thing. The visible weight difference the spec asks for (FR-005) falls out of using the row component that already exists.

**Notion is folded in by composition, not by rewriting it.** `NotionConnectionCard` renders inside the documents block instead of as a sibling. Its own connect/disconnect logic is untouched. `AddDocumentDialog` already links to `/projects/[id]#project-tools` when Notion is unconnected — that anchor moves to the setup route.

**The OAuth callback follows the control.** `auth.controller.ts:191` redirects to `${projectUrl}?connectBoard=1`; it becomes the setup route. The `connectBoard` search param and the `Suspense` boundary that `BoardConnectionCard` needs for `useSearchParams` move with it.

## API

| Method | Route | Change |
|---|---|---|
| `GET` | `/auth/github/callback` | board flow returns to `…/setup?connectBoard=1` |

**That is the whole API change** — one redirect target. No new route, no new controller, no new service, no schema change.

## Prisma

**No migration.** Not one field changes — not in the database, and (see above) not in the API schemas either. The three preference columns stay exactly as they are (spec § The three preferences).

## Slices

1. **The move.** Route `/projects/[id]/setup`, contributor-only with the redirect and the independent API check `DocumentarySourcesPage` already models. The five controls relocate; the project page loses every heading and every control. The OAuth callback follows. French and English strings. At this point the feature is complete and ugly — nothing says what anything feeds.

2. **What each block says.** `SetupBlock` in `shared/components/`, the two inputs wrapped in it with their consequence line and state, Notion folded into the documents block, the meeting link and preferences left as rows. The empty-state wording from the spec's vocabulary table lands here. Verify at 390px.

3. **The way back.** The *Mise en place* row on the project page, reading both inputs client-side and naming what is missing rather than counting it.

Each slice is shippable on its own: after 1 the setup screen works, after 2 it reads, after 3 the project page tells you whether to go there.

## Risks

**A developer who never finds the setup screen.** The move is only safe if the way back is obvious, and slice 3 is what makes it so — a project page that shows empty features with no visible route to fix them is strictly worse than today's wall of rows. Slices 1 and 3 ship together or the branch does not merge.

**The consequence line carrying nothing.** The spec bets that "Alimente ce que lit votre client · En attente" produces hierarchy without an accent colour or a badge (Decision 4). It might not. This is cheap to test on the real screen and cheap to reverse — but the test has to actually happen before the branch is called done, not be assumed.

**`useSearchParams` outside a Suspense boundary.** Next 16 requires it, and `BoardConnectionCard` reads `connectBoard`. The boundary exists on the project page today (`page.tsx:104`) and must travel with the card, or the new route fails to build rather than failing at runtime.

## Noticed on the way, not in scope

**Prompt caching is never requested.** `anthropic-generation.provider.ts` reads `cache_read_input_tokens` and `cache_creation_input_tokens` off every response, but no request ever sets `cache_control` — so those counters are structurally zero and every reference-document rewrite re-bills the full corpus at list price. Real, pre-existing, and unrelated to this feature; worth its own change.
