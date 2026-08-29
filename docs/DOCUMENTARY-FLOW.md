# The documentary flow, as built

What actually happens between a developer dropping a file and their client
reading a sentence. Written from the code on 2026-08-29, because the behaviour
was spread across `specs/016` through `specs/020` and nowhere in one piece.

Product rationale lives in [PRODUCT.md](PRODUCT.md); this file is the mechanism.

## The shape in one line

```
documents ──▶ reference document ──▶ rubriques ──▶ what the client reads
   (you)          (written for you)     (you name)      (derived, published)
              ▲                     ▲
              └── notes ────────────┘
                  (replayed on every write)
```

Three objects, not three steps: they all exist at once, for the whole life of
the project. Two of the four arrows fire **by themselves**.

---

## 1. The developer hands over material

| Route | What it takes |
|---|---|
| `POST /projects/:id/documents` | a file — PDF, DOCX, PNG, JPEG, 25 MB max |
| `POST /projects/:id/documents/notion` | a Notion page URL (needs a connected Notion integration) |

On arrival the document is read **once**, to check it can be read at all, then
stored — the file in R2, a Notion page as an immutable JSON snapshot. Its status
goes `received` → `incorporated`. A duplicate is caught by `contentSha256`.

Nothing is extracted, indexed, chunked or classified. `SourceDocumentStatus` is
the whole lifecycle: `received`, `incorporated`, `failed`, `removed`.

> **There is no triage step, and that is deliberate.** specs/018 deleted the
> fact base that used to sit here — extraction, consolidation, information
> items, per-sentence provenance — because two documents produced a hundred
> statements of which two asked anything of anyone. Every write starts from the
> original documents again.

## 2. The reference document writes itself

Nobody asks for it. `SourceDocumentService` calls `reference.write(...)` at the
end of an add (`source-document.service.ts:315`) and `DocumentRemovalService`
does the same on a removal (`document-removal.service.ts:93`).

`write()` gathers **every** `incorporated` document and **every** un-archived
note, then queues one generation operation and creates a `ReferenceDocument` in
status `writing`, both inside one transaction.

It refuses in two cases:

| Code | When |
|---|---|
| `NO_DOCUMENTS` | the project has no incorporated document |
| `REFERENCE_WRITING` | a write is already in flight — a deliberate rewrite is not a concurrent one |

The work is **asynchronous**: `GenerationWorkerService` leases the operation,
calls the model, and applies the result. Statuses run `writing` → `ready` or
`failed`; the previous document becomes `superseded`.

The outcome is either `written` or `nothing_usable` — documents that hold
nothing usable produce a document that *says so*, rather than an empty one the
developer has to interpret. A document with nothing to do with the project is
**named** in the text rather than woven into it.

The result is continuous prose in named parts, plus the points the model could
not settle.

## 3. The developer corrects — notes

| Route | What it does |
|---|---|
| `GET /projects/:id/reference-document` | read it, parts and open points |
| `POST /projects/:id/reference-document/notes` | add a note |
| `DELETE /projects/:id/reference-document/notes/:noteId` | drop one |
| `POST /projects/:id/reference-document` | rewrite now, taking every note into account |

**An answer and a correction are the same object.** Answering an open point and
fixing a wrong passage both record a `Note`, carrying a frozen copy of what was
on screen — because the next write remakes the document and the paragraph that
prompted the correction will not exist.

**Every note is replayed on every write.** That is why a note is *stored* rather
than applied once, and why the note has to stand on its own.

## 4. The developer decides what to tell the client — rubriques

`POST /projects/:id/sections` — the developer names the rubrique, says what it
should cover, and picks its register: length, pedagogy, technical familiarity,
tone. Or picks *roadmap*, which has no brief and no register — only a name.

**Creating one composes it immediately** (`client-section.service.ts:137`), and
so does editing it (`:207`). Composition reads **the reference document only**,
never the raw documents.

| Route | What it does |
|---|---|
| `POST /projects/:id/sections` | create, and compose |
| `PATCH /projects/:id/sections/:sectionId` | rename / re-brief, and recompose |
| `POST /projects/:id/sections/:sectionId/composition` | recompose as-is |
| `POST /projects/:id/sections/order` | reorder the client's tabs |
| `DELETE /projects/:id/sections/:sectionId` | archive |

A project holds one roadmap, and no two live rubriques share a name.

## 5. Review, then approve

| Route | What it does |
|---|---|
| `GET /projects/:id/sections/:sectionId/proposal` | read what was composed |
| `PUT …/proposal/milestones` | roadmap only — correct milestones in place |
| `PUT …/current-milestone` | move where the project stands |
| `POST …/proposal/approve` | approve |

**Approving is the only act that reaches the client.** Everything before it is
private.

Where the project stands on a roadmap is the exception: it is a column on the
rubrique, not part of what was published, so it moves without composing,
approving or publishing anything, and the client sees it at once.

## 6. Publication

Approval queues a **derivation**: the rubrique is rewritten in the client's own
language, under its tone. Derivation must preserve structure exactly — the same
milestones in the same order, the same count of sub-steps under each — or the
operation fails rather than publishing something shorter.

**Publication is atomic.** The client keeps reading the current version until
the new one is complete in full. Provider outages, exhausted credits, invalid
output or a manual retry delay publication without overwriting what was already
validated.

An empty roadmap is refused: a composition that found no sequence is a starting
point, not something to approve.

## The loop nobody draws

This is the part a linear diagram gets wrong.

Adding or removing a document in week six rewrites the reference document, which
marks **every** rubrique as owed a refresh (`needsRewrite`) — and leaves them
alone. Nothing is republished behind the developer's back. They come back,
recompose what they want, review, approve.

So the flow is not a pipeline that completes. It is a loop that a project runs
for as long as it lives:

```
        ┌──────────────────────────────────────────┐
        ▼                                          │
   add a document ──▶ reference rewritten ──▶ rubriques flagged
        ▲                    │                     │
        │                    ▼                     ▼
        └──── note ◀──── read it            recompose ▶ approve ▶ publish
```

**What the developer does themselves is what starts work.** Adding or removing a
document writes the reference document; defining or revising a rubrique writes
that rubrique. What they did not touch waits, and says so.

## Where the pieces live today

| Surface | Route |
|---|---|
| The door, on the project page | `/projects/[id]` |
| Rubriques — define, review, approve | `/projects/[id]/documentation` |
| Documents **and** the reference document | `/projects/[id]/documentation/sources` |
| One document | `/projects/[id]/documentation/sources/[documentId]` |
| The Notion connection | `/projects/[id]/setup` |

Four addresses for one feature — recorded here as a fact, not a defence.
