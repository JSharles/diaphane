# Feature Specification: Setting a Project Up

**Feature Branch**: `feat/project-settings-layout`

**Created**: 2026-08-28

**Status**: Built, then revised — the `/setup` route was retired on 2026-08-29 once specs/022 moved the documents into the documentation (see tasks.md § Revised by specs/022). The consequence-line blocks and the vocabulary survive on the project page.

**Input**: "En tant que développeur je viens de créer un nouveau projet. J'arrive sur le projet pour la première fois ; je ne sais pas ce que je dois faire comme première étape, ce qui est important, ce qui l'est moins. […] Je voudrais vraiment une étape d'initialisation du projet, on y branche son board et sa base documentaire. […] En tous cas je veux séparer mise en place du projet (connexion des outils et des sources documentaires) de l'utilisation du produit."

## The need

A developer who has just created a project lands on seven rows that look identical — Documents, Board, Notion, Réunions, Fuseau horaire, Format de date, Langue — each with the same typography, the same grey state line, the same button on the right. Six of the seven say some variant of "aucun". Nothing on the page distinguishes the one whose absence stops the product working from the three that change nothing at all.

The page is not badly drawn. It is sorted by **what kind of thing each row is** — a source, a tool, a preference — which is a filing system. Someone arriving for the first time is not looking for where things are filed. They are looking for what to do.

## The idea worth naming

**Setting a project up and using it are two different jobs, so they get two different addresses.**

Connecting a board and handing over the documents happens once, at the start, and is revisited only when something changes. Reading the reference document, defining rubriques, reviewing them, publishing, moving where the project stands — that is the work, and it happens every week. Today both live on the same page, and the single surface that is actual work (the documentation card) sits on top of a settings list.

Splitting them is not a rearrangement. `apps/web/app/[locale]/(protected)/projects/[id]/page.tsx` currently *is* the settings page: spec 012 planned `/projects/[id]/settings`, and it ended up folded into the project page. This feature undoes that fold.

## What an empty block says

**A block states what stays blocked, not that it is empty.**

Every row today announces a void — "aucun board connecté", "aucune intégration Notion connectée". A void is a state; it carries no priority. The same row saying what it feeds does:

> Alimente **ce que lit votre client** · `En attente`

That single line replaces the whole hierarchy problem. The developer does not have to be told which block matters first, because only one of them is between them and a client who can see something. When the block is filled, the same line stays in place and changes state — dashed rule to solid, grey to periwinkle, "En attente" to "En service". The screen does not become useless once configured; it becomes a status board.

No hint sentence, no numbered step, no "start here" badge. The consequence is the hierarchy.

## What it is not

**Not an onboarding wizard.** Offering the setup as a flow at project creation is a real idea and it is deliberately held back to a second slice — see *Out of scope*. It also depends on this screen existing, since the flow would be this screen shown once in a dialog.

**Not a checklist or a stepper.** Numbered steps would lie about the shape: the board and the documents are two independent inputs, neither blocking the other, and the meeting link blocks nothing at all. A developer following steps 1-2-3 would end up with a board they never connected and no idea it was skipped.

**Not a change to the documentation feature.** The rubriques, the reference document, the sources list at `/projects/[id]/documentation/sources` — none of their behaviour changes. This feature moves where things are reached from, and what an empty state says.

## Where each thing goes

| Today, on `/projects/[id]` | After |
|---|---|
| Documentation client (card) | stays — it is the work |
| Équipe (summary) | stays — access |
| **Sources** → Documents du projet | moves to `/setup` |
| **Outils** → Board | moves to `/setup` |
| **Outils** → Notion | moves to `/setup`, *inside* the documents block |
| Réunions (meeting link) | moves to `/setup`, quieter than the two inputs |
| **Préférences** → Fuseau, Format, Langue | moves to `/setup`, kept as-is (see below) |
| Project title, join-meeting shortcut | stays |

**Notion stops being a peer of the board.** It is a way of getting a document in, exactly like uploading a file — `SourceDocumentKind` has two values, `upload` and `notion`, and both produce the same row in the same list. The board is a different input feeding a different output. Listing Notion beside the board, as "Outils" does today, files a channel next to a source and is part of why the page does not read.

## The vocabulary

Three sets were prototyped and the third chosen. Every string below is the decided wording; deviations need a reason.

| Where | String |
|---|---|
| Page title | **Mise en place** |
| Page lead | Ce que vous fournissez à Diaphane. Une fois pour toutes, sauf si ça change. |
| Documents block | **Fichiers et pages Notion** |
| Documents block, what it is | Cahier des charges, comptes rendus, notes — tout ce qui décrit le projet. |
| Documents block, what it feeds | Alimente **ce que lit votre client** |
| Board block | **Votre board** |
| Board block, what it is | Vos tâches, là où vous les gérez déjà. Diaphane n'en crée aucune. |
| Board block, what it feeds | Alimente **l'avancement affiché au client** et **la tâche en cours** |
| State, empty | En attente |
| State, connected | En service |
| On the project page, the section above the features | Ce que votre client a sous les yeux |
| On the project page, the way back | Mise en place |

**The words are the fix, not the decoration.** The corpus a developer feeds in is currently called four things across two screens — "Sources", "Documents du projet", "Mes documents", "Vos documents" — while the word *document* carries three different objects: `Documents du projet` (input), `Document de référence` (intermediate), `Documentation client` (output). Naming the input by what it literally is (files and Notion pages) and the output by who reads it (ce que lit votre client) removes the collision. The intermediate keeps its name: **Document de référence** is only ever seen inside the documentation, where it cannot be mistaken for an input.

## The three preferences

Fuseau horaire, format de date and langue **stay on the screen, unchanged**, at the bottom, under their own heading — decided 2026-08-28.

Recorded for whoever reads this later: no code reads these three columns. `projects.service.ts:140-142` writes them and nothing else in either app mentions them. The "Langue" label promises "la langue dans laquelle ce client voit le contenu du projet", while the actual language of composition comes from the `X-Interface-Locale` header — the developer's own browser (`reference-document.controller.ts:64`), falling back to `user.locale`. Wiring that up is its own feature and is out of scope here.

## What the API has to say

**Nothing new — revised 2026-08-28, during implementation.**

This section originally required a **setup state** on the project detail response: for each input, whether it is connected. Building it proved the requirement wrong on two counts.

It was **unnecessary**. Every input already answers for itself, and the screens that need those answers already ask: `useReferenceSummary` returns `documentCount`, `useBoardConnection` returns the board and its `needsReconnect` flag. The setup screen adds no request at all by moving the controls, and the project page's way-back row costs exactly one — `useReferenceSummary` is in flight there anyway for `DocumentationSummaryCard`, so React Query serves both from one fetch.

It was also **not allowed**. Computing it in `ProjectsService` means reading the source-document and board-connection tables, which Constitution III forbids; going through those modules' services instead means `ProjectsModule` importing `DocumentationModule`, which already imports `ProjectsModule`. The cycle is the signal that the field was in the wrong place.

What survives is the constraint that motivated it: **a source that fails to answer renders as unknown, never as absent.** A Notion outage must not tell a developer their pages are gone. That is now enforced in the components (FR-009).

## User Scenarios *(mandatory)*

### User Story 1 - Land on a project that has nothing (P1)

A developer creates a project and opens it for the first time.

1. **Given** a project with no documents and no board, **When** the developer opens it, **Then** the project page shows what the client would receive — and each of those says it is waiting on something.
2. **Given** that page, **When** they look for what to do, **Then** exactly one route leads out of the empty state, and it is named **Mise en place**.
3. **Given** the setup screen, **When** it renders, **Then** the two inputs each state what they feed and carry the state `En attente`.

### User Story 2 - Hand over the documents (P1)

1. **Given** the setup screen, **When** the developer opens the documents block, **Then** they can add a file or connect Notion without leaving for another screen first.
2. **Given** a first document is in, **When** the block re-renders, **Then** its line reads `En service` and names what it now feeds.
3. **Given** documents are already in, **When** the developer returns, **Then** the block summarises what it holds rather than repeating how to add one.

### User Story 3 - Connect the board (P1)

1. **Given** the setup screen, **When** the developer connects a GitHub board, **Then** the OAuth round-trip returns them to the setup screen, not to the project page.
2. **Given** the board is connected, **When** the block re-renders, **Then** it names the connected board and reads `En service`.
3. **Given** a revoked GitHub authorisation, **When** the screen renders, **Then** the block says so and offers to reconnect, as `BoardConnectionCard` already does.

### User Story 4 - Come back six months later (P1)

1. **Given** a fully configured project, **When** the developer opens it, **Then** the project page carries no configuration and no empty states.
2. **Given** they need to change the board, **When** they look for it, **Then** **Mise en place** is reachable from the project page in one click.
3. **Given** the setup screen on a configured project, **When** it renders, **Then** it is a status board — every block filled, every consequence line `En service`.

### User Story 5 - A client opens the project (P1)

1. **Given** a project member whose role is `client`, **When** they open the project, **Then** nothing about setup is visible to them.
2. **Given** a client who reaches `/projects/[id]/setup` directly, **When** the page loads, **Then** they are redirected to the project page and the API refuses independently — the rule `DocumentarySourcesPage` already applies.

## Functional Requirements

- **FR-001** A contributor's project page carries no configuration controls. Its content is what the client receives, plus access.
- **FR-002** Setup lives at `/projects/[id]/setup` and is reachable from the project page in one click.
- **FR-003** The setup screen holds exactly two inputs — the documentary base, and the board — plus the meeting link and the project preferences, in that order of weight.
- **FR-004** Each input states what it feeds, and its state, in one line. An empty input names what stays blocked; a filled one names what is live.
- **FR-005** The meeting link is visibly lighter than the two inputs: it blocks nothing.
- **FR-006** Adding a file and connecting Notion are both actions of the documents block. Notion is not a top-level row.
- **FR-007** The board's OAuth callback returns to the setup screen.
- **FR-008** ~~The project detail response carries the connection state and a one-line summary for each input.~~ **Withdrawn 2026-08-28** — see § What the API has to say. Each input answers for itself through the endpoint that owns it; the project page reads those directly. No new API.
- **FR-009** A source whose state cannot be read renders as unknown, never as absent.
- **FR-010** The setup screen is contributor-only, enforced in the UI and independently by the API.
- **FR-011** Nothing about the reference document, the rubriques, or the sources list changes behaviour. Managing the document list stays at `/projects/[id]/documentation/sources`.
- **FR-012** The three project preferences are carried over unchanged, at the foot of the setup screen.
- **FR-013** Every surface holds at 390px with no sideways scroll.

## Decisions taken, worth confirming

1. **Setup is a route, not a mode.** The alternative — one page that switches between a setup face and a usage face depending on whether it is configured — separates the moments without separating the places, and leaves setup with no address once it has been passed. Rejected.
2. **The setup screen survives being finished.** It is designed to be worth opening on a configured project, which is what makes it a place rather than a gate.
3. **The existing sources page is kept.** The setup screen shows state and the way in; the list, the reference document and the removal flow stay where they are. Absorbing them would make this feature a rewrite of specs/018's surfaces.
4. **The consequence line is the only hierarchy.** No accent colour on the first block, no "commencez ici" badge, no step numbers. If the line does not carry it on its own, that is worth knowing before adding decoration on top.

## Out of scope

The creation flow with a "Plus tard" exit — the second slice, and the reason FR-002 puts setup on its own route rather than in a dialog. Wiring `project.language` into composition. Retiring the timezone and date-format fields. Anything about the client's own view of the project.
