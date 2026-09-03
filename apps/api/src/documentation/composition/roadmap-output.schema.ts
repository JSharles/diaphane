import { z } from 'zod';

export const ROADMAP_COMPOSITION_PROMPT_VERSION = 'roadmap-composition-v4';
export const ROADMAP_COMPOSITION_OUTPUT_CONTRACT = 'roadmap-composition-v4';

// How the model names a step of the roadmap in place it keeps or corrects:
// "M2" for a milestone, "M2.S1" for what sits inside one. Null on a step it
// adds. The reference stands in for the id, which never reaches the model
// (45a13ac); it is short enough to copy right and checked against the roadmap
// in place before anything is written (roadmap-recomposition.ts).
const RoadmapRefSchema = z
  .string()
  .regex(/^M[1-9]\d*(\.S[1-9]\d*)?$/)
  .nullable();

// What sits inside a long milestone, as the model returns it. Its "when" may be
// null: a feature inside a phase often has no date of its own, and a model
// asked for one would supply one.
//
// It carries no `substeps` of its own — the roadmap is two levels deep, and a
// contract that cannot express a third level is worth more than a rule saying
// not to produce one.
export const RoadmapSubstepOutputSchema = z
  .object({
    ref: RoadmapRefSchema,
    when: z.string().trim().min(1).max(120).nullable(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2_000).nullable(),
  })
  .strict();

// A milestone as the model returns it: which step in place it is, if any,
// when, what, optionally why it matters, and optionally what sits inside it.
// No id — ids are minted server-side and never asked of the model, which is the
// rule 45a13ac established after echoed identifiers killed three stages by
// getting a character wrong.
export const RoadmapMilestoneOutputSchema = z
  .object({
    ref: RoadmapRefSchema,
    when: z.string().trim().min(1).max(120).nullable(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2_000).nullable(),
    substeps: z.array(RoadmapSubstepOutputSchema),
  })
  .strict();

export const RoadmapCompositionOutputSchema = z
  .object({
    promptVersion: z.literal(ROADMAP_COMPOSITION_PROMPT_VERSION),
    outcome: z.enum(['composed', 'nothing_matched']),
    milestones: z.array(RoadmapMilestoneOutputSchema),
    changeSummary: z.string().trim().min(1).max(2_000),
  })
  .strict()
  .superRefine((output, context) => {
    // A roadmap is the shape a model most wants to invent, so "nothing matched"
    // has to hold in both directions or it becomes a label attached to content
    // it did produce anyway.
    if (output.outcome === 'nothing_matched' && output.milestones.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['milestones'],
        message: 'A composition that matched nothing cannot carry milestones.',
      });
    }
    if (output.outcome === 'composed' && output.milestones.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['outcome'],
        message:
          'A composition with no milestones must report nothing_matched.',
      });
    }
  });

export const ROADMAP_COMPOSITION_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['promptVersion', 'outcome', 'milestones', 'changeSummary'],
  properties: {
    promptVersion: { const: ROADMAP_COMPOSITION_PROMPT_VERSION },
    outcome: { enum: ['composed', 'nothing_matched'] },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ref', 'when', 'title', 'description', 'substeps'],
        properties: {
          ref: { type: ['string', 'null'] },
          when: { type: ['string', 'null'] },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          substeps: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['ref', 'when', 'title', 'description'],
              properties: {
                ref: { type: ['string', 'null'] },
                when: { type: ['string', 'null'] },
                title: { type: 'string' },
                description: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    changeSummary: { type: 'string' },
  },
};
