# Feature Specification: The Documentary Feature, In One Place

**Feature Branch**: `feat/documentation-in-one-place`

**Created**: 2026-08-29

**Status**: Built — 2026-08-29

**Input**: "La partie documentaire devrait être une seule feature je crois. […] Je souhaite que la feature documentaire apparaisse évidente ! Étape 1 : fais cela, étape 2… Bref qu'il y ait un découpage conceptuel évident et pas tout en vrac. Un stepper, des tabs, un menu avec les catégories… j'en sais rien. Juste appliquer au flux une UI/UX correspondante et évidente."

## The need

The documentary part of Diaphane is the product. It is also spread across four addresses with no visible relationship between them:

| Where | What |
|---|---|
| `/projects/[id]` | a card that is the door |
| `/projects/[id]/documentation` | the rubriques |
| `/projects/[id]/documentation/sources` | the documents **and** the reference document |
| `/projects/[id]/documentation/sources/[documentId]` | one document |

A developer arriving cannot see that these are one thing, in what order they relate, or where they are in it. And the arrangement buries the wrong object: **the reference document — the centre of the whole product — sits at the bottom of a page titled "Mes documents", under the least important list on the screen.**

Nothing is broken. `docs/DOCUMENTARY-FLOW.md` documents a chain that works. It is simply invisible.

## The idea worth naming

**The mechanism becomes the navigation.**

The code already has exactly four moments, with clean boundaries and distinct triggers: documents come in, the reference document is written, rubriques are composed, publication reaches the client. Those four boundaries become the four places the developer stands in. The interface cannot then drift from the mechanism, because it *is* the mechanism.

And they are permanently on screen. Not tabs — tabs show you the one you are in and hide the rest, which is precisely the problem. A rail down the left showing all four with their states is what turns a heap into a sequence you can see without being told.

## The second idea, which is what makes it survive

**The numbers never move.**

The chain loops: adding a document in week six rewrites the reference document, which marks every rubrique as owed a refresh. A stepper that re-opened step 2 and renumbered from there would lie about the shape and lose the developer.

So the steps are not progress. They are **places**, permanently numbered 1 to 4, each carrying its own state. Week one reads as *step 1, then step 2, then step 3*. Week six, the same rail reads as *5 fichiers · à jour · 1 à rafraîchir · publié le 24 août* — a table of contents with statuses. Same four rows, same numbers, no renumbering, ever.

That is the whole answer to the loop objection: the loop becomes a state carried by a step, not a movement between steps.

## What it is not

**Not a wizard.** Every step is reachable at any time. A step with nothing in it says what it is waiting for instead of refusing — the rule specs/019 already set for the rubriques screen ("the screen says so as a first step rather than refusing").

**Not a change to how any of it works.** The chain, the automatic write, the notes replayed on every write, the composition reading only the reference document, the atomic publication — untouched. This feature moves surfaces; `docs/DOCUMENTARY-FLOW.md` stays accurate to the letter.

**Not a triage step.** There is no place here to sort, clean or select parts of a document. specs/018 removed that deliberately; a document is read whole, every time. What the model cannot use, it names in the reference document — which the developer reads at step 2.

## The four steps

| # | Name | Holds | Empty, it says | In routine use |
|---|---|---|---|---|
| 1 | **Vos fichiers et pages Notion** | the document list, add and remove | Rien pour l'instant | 5 fichiers · 1 page Notion |
| 2 | **Ce que Diaphane en a compris** | the reference document, its open points, the notes | En attente d'un premier fichier | Réécrit hier · à jour |
| 3 | **Vos rubriques** | the rubriques, their state, review and approval | En attente de l'étape 2 | 1 à rafraîchir · 1 à relire |
| 4 | **Ce que lit votre client** | what is published, and since when | Rien n'est publié | 3 rubriques · depuis le 24 août |

Step 2 is the one that gains the most: it stops being a section at the foot of the documents page and becomes a place. Open points are already rendered inline in the prose (`reference-document-view.tsx:139`, `gap` blocks) with the correction offered in place — that behaviour moves as-is.

## Where each address goes

| Today | After |
|---|---|
| `/documentation` | the feature root — lands on a step, see *Decisions* |
| `/documentation/sources` | step 1 |
| `/documentation/sources/[documentId]` | one document, reached from step 1 |
| the reference document, on `/documentation/sources` | **step 2**, its own place |
| `/documentation` (rubriques) | step 3 |
| — | **step 4**, new surface |

## What stays outside, and why

**The Notion connection stays outside the documentation.** Connecting the integration is done once and revisited only if it breaks; choosing a page to bring in is done for as long as the project lives. Branching the pipe is not pouring into it. *(It first stayed on the setup screen; the same day, that route was retired and the connections moved to the foot of the project page — the separation this paragraph argues for is unchanged.)*

This revises `specs/021`, built and not yet merged: its `SetupBlock` titled *Fichiers et pages Notion* joins those two acts in one block. After this feature, the setup screen holds the Notion **connection** only, and the documents move here. Spec 021 stands otherwise — the board, the meeting link and the preferences keep their screen.

## User Scenarios *(mandatory)*

### User Story 1 - Arrive for the first time (P1)

1. **Given** a project with no documents, **When** the developer opens the documentation, **Then** four numbered steps are visible at once and only the first offers an action.
2. **Given** that screen, **When** they read steps 2 to 4, **Then** each says what it is waiting for rather than appearing broken or empty.
3. **Given** they add a first file, **When** the write completes, **Then** step 1 reads as done and step 2 becomes the one to go to.

### User Story 2 - Read what Diaphane understood (P1)

1. **Given** a ready reference document, **When** the developer opens step 2, **Then** the text is the subject of the screen, not a section under a list.
2. **Given** open points in the text, **When** they read it, **Then** each is marked where it applies and can be answered in place.
3. **Given** they answer one, **When** they ask for a rewrite, **Then** every note accumulated is taken into account — unchanged from today.

### User Story 3 - Come back in week six (P1)

1. **Given** a project running for weeks, **When** the developer opens the documentation, **Then** the four steps carry states rather than a sense of progress, and none has been renumbered.
2. **Given** a document added since the last publication, **When** they look at step 3, **Then** the affected rubriques read as owed a refresh, and nothing has been republished without them.
3. **Given** everything is up to date, **When** they look at the rail, **Then** it says so on all four rows and there is nothing to act on.

### User Story 4 - See what the client has (P1)

1. **Given** published rubriques, **When** the developer opens step 4, **Then** they see what is live and since when.
2. **Given** a rubrique approved but not yet derived, **When** they open step 4, **Then** it says the client is still reading the previous version — the atomic publication made legible.

### User Story 5 - A client never reaches any of it (P1)

1. **Given** a member whose role is `client`, **When** they open any step, **Then** they are redirected and the API refuses independently.

## Functional Requirements

- **FR-001** The documentary feature has one root address; the four steps are sub-paths of it, each linkable and surviving a reload.
- **FR-002** The four steps are visible from every step, with their name, number and state.
- **FR-003** Step numbers are fixed. No state, at any point in a project's life, renumbers or reorders them.
- **FR-004** Every step is navigable at any time. A step with nothing in it states what it is waiting for; it never refuses.
- **FR-005** Each step's state line is derived from data the API already returns; no new endpoint is added to draw the rail.
- **FR-006** Step 2 renders the reference document as the subject of its own screen, with open points inline and correction in place, exactly as `ReferenceDocumentView` does today.
- **FR-007** Step 4 renders what the client currently reads with the same shared component his own page uses, framed by publication metadata: since when, and whether a newer version is approved but not yet live.
- **FR-008** No behaviour of the chain changes: triggers, notes replayed on every write, composition reading only the reference document, and atomic publication are untouched.
- **FR-009** Contributor-only, enforced in the UI and independently by the API.
- **FR-010** The document list, one document's detail, and removal keep working, reached from step 1.
- **FR-011** Every surface holds at 390px, where the rail stacks above the panel rather than beside it.

## Decisions taken, worth confirming

1. **A rail, not tabs.** Tabs show the step you are in and hide the other three — the exact failure this feature exists to fix. The rail costs horizontal space and earns the structure being visible without explanation.
2. **The root lands on the first step that is not done, and on step 3 once everything is.** Confirmed 2026-08-29. The landing varies with state, so no habit forms — accepted, because the rail is always on screen: wherever you land, the other three steps and their states are one glance away. The rail pays for this decision as well as for its own.
3. **Step 4 is the mirror: the client's actual screen, tabs included.** Reversed 2026-08-29 — the objection this spec first recorded ("two renderings to keep in step") was wrong on the facts: `ClientSectionView` lives in `shared/components/` and already renders both the client's page and the developer's proposal review, a decision specs/020 made precisely so the preview cannot drift from the thing (T024b). A step named "ce que lit votre client" shows what he reads, not a paragraph about it. Publication metadata (since when, what is approved but not yet live) frames the mirror rather than replacing it.
4. **The single-document page stays a page**, not a dialog. It is reached rarely and holds a document's own history; a dialog would cap what can ever go on it.

## Out of scope

Any change to composition, derivation, notes, or the atomic release. The creation-time flow from specs/021. Wiring `project.language`. A triage or cleaning step over documents — see *What it is not*.
