import { randomUUID } from 'node:crypto';

// Recomposing a roadmap keeps the developer's retouches (docs/PRODUCT.md « La
// roadmap »): the model receives the roadmap in place next to the reference
// document and proposes additions or corrections, and every step of origin
// `developer` comes through exactly as it was.
//
// The model names a step it keeps or corrects by a short reference — "M2",
// "M2.S1" — minted here from the step's position, never by its id. Ids never
// reach the model (45a13ac), and a reference that names nothing is caught
// before anything is written rather than becoming a step the developer has
// to notice is wrong.

export type MilestoneOrigin = 'document' | 'developer';

export interface SubstepInPlace {
  id: string;
  when: string | null;
  title: string;
  description: string | null;
  origin: MilestoneOrigin;
}

export interface MilestoneInPlace {
  id: string;
  when: string | null;
  title: string;
  description: string | null;
  substeps: SubstepInPlace[];
  origin: MilestoneOrigin;
}

export interface SubstepProposed {
  ref: string | null;
  when: string | null;
  title: string;
  description: string | null;
}

export interface MilestoneProposed extends SubstepProposed {
  substeps: SubstepProposed[];
}

// The roadmap as the model reads it: no ids, a reference and an origin on
// every step.
export interface SubstepInPlaceForPrompt {
  ref: string;
  origin: MilestoneOrigin;
  when: string | null;
  title: string;
  description: string | null;
}

export interface MilestoneInPlaceForPrompt extends SubstepInPlaceForPrompt {
  substeps: SubstepInPlaceForPrompt[];
}

function milestoneRef(index: number): string {
  return `M${index + 1}`;
}

function substepRef(milestoneIndex: number, index: number): string {
  return `${milestoneRef(milestoneIndex)}.S${index + 1}`;
}

// The milestones a roadmap proposal holds, read back from its JSON column.
export function milestonesInPlace(
  structuredContent: unknown,
): MilestoneInPlace[] {
  const milestones = (structuredContent ?? []) as (Omit<
    MilestoneInPlace,
    'substeps'
  > & { substeps?: SubstepInPlace[] })[];
  return milestones.map((milestone) => ({
    ...milestone,
    substeps: milestone.substeps ?? [],
  }));
}

// Free text the way the roadmap stores it: trimmed, and absent rather than
// blank when nothing was written.
export function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function requiredText(value: string): string {
  return value.trim();
}

// Where a step stands after the developer sent it back from the editor: kept
// as read when its words are the ones that were read, theirs when they changed
// one, and theirs outright when no step in place stood behind it. A step the
// developer wrote or retouched is theirs from then on (CONTEXT.md « Étape »):
// the next recomposition hands it back untouched rather than letting the
// model revert the correction. Reordering alone is not a retouch.
export function originAfterEdit(
  kept:
    | Pick<SubstepInPlace, 'when' | 'title' | 'description' | 'origin'>
    | undefined,
  edited: Pick<SubstepInPlace, 'when' | 'title' | 'description'>,
): MilestoneOrigin {
  if (!kept) return 'developer';
  if (kept.origin === 'developer') return 'developer';
  const retouched =
    kept.when !== edited.when ||
    kept.title !== edited.title ||
    kept.description !== edited.description;
  return retouched ? 'developer' : 'document';
}

// The roadmap as the model reads it: every step under a reference and its
// origin, so the prompt can say which ones are the developer's and the model
// can name what it keeps.
export function roadmapInPlaceForPrompt(
  structuredContent: unknown,
): MilestoneInPlaceForPrompt[] {
  return milestonesInPlace(structuredContent).map((milestone, index) => ({
    ref: milestoneRef(index),
    origin: milestone.origin,
    when: milestone.when,
    title: milestone.title,
    description: milestone.description,
    substeps: milestone.substeps.map((substep, substepIndex) => ({
      ref: substepRef(index, substepIndex),
      origin: substep.origin,
      when: substep.when,
      title: substep.title,
      description: substep.description,
    })),
  }));
}

// What the model proposed, folded into the roadmap in place. Throws on a
// proposal that names a step it cannot name (ROADMAP_REF_UNKNOWN), names one
// where it cannot sit (ROADMAP_REF_MISUSED: twice, under another step, inside
// a new step) or touches one it may not (ROADMAP_DEVELOPER_STEP_DROPPED,
// ROADMAP_DEVELOPER_STEP_MOVED). The attempt fails and the generation tries
// again, which is the right answer to a model that did not follow the
// contract.
export function mergeRoadmapRecomposition(
  structuredContent: unknown,
  proposed: MilestoneProposed[],
): MilestoneInPlace[] {
  const inPlace = milestonesInPlace(structuredContent);
  const seen = new Set<string>();
  // Developer steps in the order the model returned them, per level: the
  // milestones together, and the sub-steps inside each document step. Checked
  // at the end against the order they had, because "untouched" includes "not
  // moved past one another" while the model may still slot new steps between.
  const returnedOrder = new Map<string, string[]>();

  function claim(ref: string, parent: string, origin: MilestoneOrigin) {
    if (seen.has(ref)) throw new Error(`ROADMAP_REF_MISUSED:${ref}`);
    seen.add(ref);
    if (origin !== 'developer') return;
    returnedOrder.set(parent, [...(returnedOrder.get(parent) ?? []), ref]);
  }

  function added(step: SubstepProposed): SubstepInPlace {
    return {
      id: randomUUID(),
      when: optionalText(step.when),
      title: requiredText(step.title),
      description: optionalText(step.description),
      origin: 'document',
    };
  }

  const milestones = proposed.map((milestone): MilestoneInPlace => {
    if (milestone.ref === null) {
      // Nothing inside a new step can be a step already in place.
      for (const substep of milestone.substeps) {
        if (substep.ref !== null) {
          throw new Error(`ROADMAP_REF_MISUSED:${substep.ref}`);
        }
      }
      return { ...added(milestone), substeps: milestone.substeps.map(added) };
    }

    const milestoneIndex = inPlace.findIndex(
      (_, index) => milestoneRef(index) === milestone.ref,
    );
    if (milestoneIndex < 0) {
      throw new Error(`ROADMAP_REF_UNKNOWN:${milestone.ref}`);
    }
    const kept = inPlace[milestoneIndex];
    const parentRef = milestone.ref;
    claim(parentRef, '', kept.origin);

    // A sub-step reference only resolves inside the step it sits in: a step
    // moved elsewhere is a step the model could not have kept.
    const substeps = milestone.substeps.map((substep): SubstepInPlace => {
      if (substep.ref === null) return added(substep);
      const substepIndex = kept.substeps.findIndex(
        (_, index) => substepRef(milestoneIndex, index) === substep.ref,
      );
      if (substepIndex < 0) {
        const anywhere = inPlace.some((other, otherIndex) =>
          other.substeps.some(
            (_, index) => substepRef(otherIndex, index) === substep.ref,
          ),
        );
        throw new Error(
          `${anywhere ? 'ROADMAP_REF_MISUSED' : 'ROADMAP_REF_UNKNOWN'}:${substep.ref}`,
        );
      }
      const keptSubstep = kept.substeps[substepIndex];
      claim(substep.ref, parentRef, keptSubstep.origin);
      if (keptSubstep.origin === 'developer') return keptSubstep;
      return { ...added(substep), id: keptSubstep.id };
    });

    // The developer's step, whole: what the model wrote for it is discarded,
    // and so is anything it tried to put inside. Everything it holds is kept
    // with it, listed by the model or not.
    if (kept.origin === 'developer') {
      kept.substeps.forEach((_, index) =>
        seen.add(substepRef(milestoneIndex, index)),
      );
      return kept;
    }

    return {
      id: kept.id,
      when: optionalText(milestone.when),
      title: requiredText(milestone.title),
      description: optionalText(milestone.description),
      substeps,
      origin: 'document',
    };
  });

  // "Left untouched" includes "not removed" and "not moved past one another",
  // at both levels.
  const orderInPlace = new Map<string, string[]>();
  function expect(ref: string, parent: string) {
    if (!seen.has(ref))
      throw new Error(`ROADMAP_DEVELOPER_STEP_DROPPED:${ref}`);
    orderInPlace.set(parent, [...(orderInPlace.get(parent) ?? []), ref]);
  }
  inPlace.forEach((milestone, index) => {
    const ref = milestoneRef(index);
    if (milestone.origin === 'developer') {
      expect(ref, '');
      return;
    }
    milestone.substeps.forEach((substep, substepIndex) => {
      if (substep.origin === 'developer') {
        expect(substepRef(index, substepIndex), ref);
      }
    });
  });
  orderInPlace.forEach((refs, parent) => {
    refs.forEach((ref, index) => {
      if (returnedOrder.get(parent)?.[index] !== ref) {
        throw new Error(`ROADMAP_DEVELOPER_STEP_MOVED:${ref}`);
      }
    });
  });

  return milestones;
}
