import {
  mergeRoadmapRecomposition,
  originAfterEdit,
  roadmapInPlaceForPrompt,
} from './roadmap-recomposition';

const devMilestoneId = '00000000-0000-4000-8000-0000000000d1';
const docMilestoneId = '00000000-0000-4000-8000-0000000000d2';
const devSubstepId = '00000000-0000-4000-8000-0000000000e1';
const docSubstepId = '00000000-0000-4000-8000-0000000000e2';

// A roadmap in place: one step the developer wrote, one the document gave
// whose inside holds one of each.
const inPlace = [
  {
    id: devMilestoneId,
    when: 'janvier',
    title: 'Cadrage',
    description: 'Signé avec le client.',
    substeps: [],
    origin: 'developer' as const,
  },
  {
    id: docMilestoneId,
    when: 'Q3 2026',
    title: 'Développement',
    description: null,
    substeps: [
      {
        id: docSubstepId,
        when: null,
        title: 'Feature 1',
        description: null,
        origin: 'document' as const,
      },
      {
        id: devSubstepId,
        when: 'juillet',
        title: 'Feature 2',
        description: 'Ajoutée à la main.',
        origin: 'developer' as const,
      },
    ],
    origin: 'document' as const,
  },
];

const step = { when: null, title: 'x', description: null };

describe('the roadmap in place, as the model reads it', () => {
  it('names every step by a short reference and says where it came from', () => {
    expect(roadmapInPlaceForPrompt(inPlace)).toEqual([
      {
        ref: 'M1',
        origin: 'developer',
        when: 'janvier',
        title: 'Cadrage',
        description: 'Signé avec le client.',
        substeps: [],
      },
      {
        ref: 'M2',
        origin: 'document',
        when: 'Q3 2026',
        title: 'Développement',
        description: null,
        substeps: [
          {
            ref: 'M2.S1',
            origin: 'document',
            when: null,
            title: 'Feature 1',
            description: null,
          },
          {
            ref: 'M2.S2',
            origin: 'developer',
            when: 'juillet',
            title: 'Feature 2',
            description: 'Ajoutée à la main.',
          },
        ],
      },
    ]);
  });

  // Ids never reach the model (45a13ac): the reference is what stands in for
  // them, and it is minted here rather than echoed back.
  it('never hands the model an id', () => {
    expect(JSON.stringify(roadmapInPlaceForPrompt(inPlace))).not.toContain(
      devMilestoneId,
    );
  });

  it('is empty on a first composition', () => {
    expect(roadmapInPlaceForPrompt(null)).toEqual([]);
  });
});

describe('merging what the model proposes into the roadmap in place', () => {
  it('keeps a developer step exactly as it was, whatever the model wrote for it', () => {
    const merged = mergeRoadmapRecomposition(inPlace, [
      {
        ref: 'M1',
        when: 'février',
        title: 'Cadrage revu',
        description: null,
        substeps: [{ ref: null, ...step, title: 'Sneaked in' }],
      },
      { ref: 'M2', ...step, substeps: [{ ref: 'M2.S2', ...step }] },
    ]);

    expect(merged[0]).toEqual(inPlace[0]);
  });

  it('keeps everything inside a developer step, listed by the model or not', () => {
    const withInside = [
      { ...inPlace[0], substeps: [inPlace[1].substeps[1]] },
      { ...inPlace[1], substeps: [inPlace[1].substeps[0]] },
    ];

    const merged = mergeRoadmapRecomposition(withInside, [
      { ref: 'M1', ...step, substeps: [] },
      { ref: 'M2', ...step, substeps: [] },
    ]);

    expect(merged[0]).toEqual(withInside[0]);
  });

  it('corrects a document step in place, keeping its id and origin', () => {
    const merged = mergeRoadmapRecomposition(inPlace, [
      { ref: 'M1', ...step, substeps: [] },
      {
        ref: 'M2',
        when: 'Q4 2026',
        title: 'Développement',
        description: 'Décalé d’un trimestre.',
        substeps: [
          {
            ref: 'M2.S1',
            when: null,
            title: 'Feature 1 bis',
            description: null,
          },
          { ref: 'M2.S2', ...step },
        ],
      },
    ]);

    expect(merged[1]).toMatchObject({
      id: docMilestoneId,
      when: 'Q4 2026',
      description: 'Décalé d’un trimestre.',
      origin: 'document',
    });
    expect(merged[1].substeps[0]).toMatchObject({
      id: docSubstepId,
      title: 'Feature 1 bis',
      origin: 'document',
    });
  });

  // The sub-step inside a document step that the developer added by hand is theirs
  // as much as a whole step of their own would be.
  it('keeps a developer sub-step as it was, inside a corrected document step', () => {
    const merged = mergeRoadmapRecomposition(inPlace, [
      { ref: 'M1', ...step, substeps: [] },
      {
        ref: 'M2',
        ...step,
        substeps: [
          {
            ref: 'M2.S2',
            when: 'août',
            title: 'Feature 2 revue',
            description: null,
          },
        ],
      },
    ]);

    expect(merged[1].substeps).toEqual([inPlace[1].substeps[1]]);
  });

  it('adds a new step with a fresh id, read from the document', () => {
    const merged = mergeRoadmapRecomposition(inPlace, [
      { ref: 'M1', ...step, substeps: [] },
      {
        ref: null,
        when: 'mars',
        title: 'Maquettes',
        description: null,
        substeps: [
          { ref: null, when: null, title: 'Écran 1', description: null },
        ],
      },
      { ref: 'M2', ...step, substeps: [{ ref: 'M2.S2', ...step }] },
    ]);

    expect(merged).toHaveLength(3);
    expect(merged[1]).toMatchObject({ title: 'Maquettes', origin: 'document' });
    expect(merged[1].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(merged[1].substeps[0]).toMatchObject({
      title: 'Écran 1',
      origin: 'document',
    });
    expect(merged[1].substeps[0].id).not.toBe(merged[1].id);
  });

  it('lets the model remove a document step, and a document sub-step', () => {
    const withoutDeveloperInside = [
      inPlace[0],
      { ...inPlace[1], substeps: [inPlace[1].substeps[0]] },
    ];

    expect(
      mergeRoadmapRecomposition(withoutDeveloperInside, [
        { ref: 'M1', ...step, substeps: [] },
      ]),
    ).toEqual([inPlace[0]]);
    expect(
      mergeRoadmapRecomposition(withoutDeveloperInside, [
        { ref: 'M1', ...step, substeps: [] },
        { ref: 'M2', ...step, substeps: [] },
      ])[1].substeps,
    ).toEqual([]);
  });

  it('reorders around the developer step, in the order the model returns', () => {
    const merged = mergeRoadmapRecomposition(inPlace, [
      { ref: 'M2', ...step, substeps: [{ ref: 'M2.S2', ...step }] },
      { ref: 'M1', ...step, substeps: [] },
    ]);

    expect(merged.map((milestone) => milestone.id)).toEqual([
      docMilestoneId,
      devMilestoneId,
    ]);
  });

  // "Left untouched" includes "not removed": a proposal that drops what the
  // developer wrote is refused rather than reviewed, and the model tries again.
  describe('refuses a proposal that', () => {
    it('drops a developer step', () => {
      expect(() =>
        mergeRoadmapRecomposition(inPlace, [
          { ref: 'M2', ...step, substeps: [{ ref: 'M2.S2', ...step }] },
        ]),
      ).toThrow('ROADMAP_DEVELOPER_STEP_DROPPED');
    });

    it('drops a developer sub-step', () => {
      expect(() =>
        mergeRoadmapRecomposition(inPlace, [
          { ref: 'M1', ...step, substeps: [] },
          { ref: 'M2', ...step, substeps: [] },
        ]),
      ).toThrow('ROADMAP_DEVELOPER_STEP_DROPPED');
    });

    it('drops the document step a developer sub-step sits in', () => {
      expect(() =>
        mergeRoadmapRecomposition(inPlace, [
          { ref: 'M1', ...step, substeps: [] },
        ]),
      ).toThrow('ROADMAP_DEVELOPER_STEP_DROPPED');
    });

    it('names a step twice', () => {
      expect(() =>
        mergeRoadmapRecomposition(inPlace, [
          { ref: 'M1', ...step, substeps: [] },
          { ref: 'M1', ...step, substeps: [] },
          { ref: 'M2', ...step, substeps: [{ ref: 'M2.S2', ...step }] },
        ]),
      ).toThrow('ROADMAP_REF_MISUSED');
    });

    it('names a step that is not there', () => {
      expect(() =>
        mergeRoadmapRecomposition(inPlace, [
          { ref: 'M1', ...step, substeps: [] },
          { ref: 'M2', ...step, substeps: [{ ref: 'M2.S2', ...step }] },
          { ref: 'M9', ...step, substeps: [] },
        ]),
      ).toThrow('ROADMAP_REF_UNKNOWN');
    });

    it('moves a sub-step under another step', () => {
      expect(() =>
        mergeRoadmapRecomposition(inPlace, [
          { ref: 'M1', ...step, substeps: [{ ref: 'M2.S2', ...step }] },
          { ref: 'M2', ...step, substeps: [] },
        ]),
      ).toThrow('ROADMAP_REF_MISUSED');
    });

    it('names a sub-step that is not there', () => {
      expect(() =>
        mergeRoadmapRecomposition(inPlace, [
          { ref: 'M1', ...step, substeps: [] },
          {
            ref: 'M2',
            ...step,
            substeps: [
              { ref: 'M2.S2', ...step },
              { ref: 'M2.S9', ...step },
            ],
          },
        ]),
      ).toThrow('ROADMAP_REF_UNKNOWN');
    });

    it('nests a sub-step it names under a new step', () => {
      expect(() =>
        mergeRoadmapRecomposition(inPlace, [
          { ref: 'M1', ...step, substeps: [] },
          { ref: 'M2', ...step, substeps: [{ ref: 'M2.S2', ...step }] },
          { ref: null, ...step, substeps: [{ ref: 'M2.S1', ...step }] },
        ]),
      ).toThrow('ROADMAP_REF_MISUSED');
    });

    // Ordered steps left untouched keep their order: a new step may slot in
    // between two developer steps, but they do not swap places.
    it('moves developer steps past one another', () => {
      const twoDeveloperSteps = [
        inPlace[0],
        {
          ...inPlace[0],
          id: '00000000-0000-4000-8000-0000000000d3',
          title: 'Recette',
        },
      ];
      expect(() =>
        mergeRoadmapRecomposition(twoDeveloperSteps, [
          { ref: 'M2', ...step, substeps: [] },
          { ref: 'M1', ...step, substeps: [] },
        ]),
      ).toThrow('ROADMAP_DEVELOPER_STEP_MOVED');
      expect(
        mergeRoadmapRecomposition(twoDeveloperSteps, [
          { ref: 'M1', ...step, substeps: [] },
          { ref: null, ...step, title: 'Maquettes', substeps: [] },
          { ref: 'M2', ...step, substeps: [] },
        ]).map((milestone) => milestone.title),
      ).toEqual(['Cadrage', 'Maquettes', 'Recette']);
    });

    it('moves developer sub-steps past one another', () => {
      const twoInside = [
        {
          ...inPlace[1],
          substeps: [
            inPlace[1].substeps[1],
            {
              ...inPlace[1].substeps[1],
              id: '00000000-0000-4000-8000-0000000000e3',
            },
          ],
        },
      ];
      expect(() =>
        mergeRoadmapRecomposition(twoInside, [
          {
            ref: 'M1',
            ...step,
            substeps: [
              { ref: 'M1.S2', ...step },
              { ref: 'M1.S1', ...step },
            ],
          },
        ]),
      ).toThrow('ROADMAP_DEVELOPER_STEP_MOVED');
    });
  });

  it('reads a roadmap stored without sub-steps', () => {
    const merged = mergeRoadmapRecomposition(
      [{ ...inPlace[0], substeps: undefined }],
      [{ ref: 'M1', ...step, substeps: [] }],
    );

    expect(merged[0].substeps).toEqual([]);
  });

  it('composes from nothing on a first composition', () => {
    const merged = mergeRoadmapRecomposition(null, [
      {
        ref: null,
        when: 'Q3 2026',
        title: 'Recette',
        description: null,
        substeps: [],
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ title: 'Recette', origin: 'document' });
  });

  it('trims what the model wrote and keeps blanks as absent', () => {
    const merged = mergeRoadmapRecomposition(null, [
      {
        ref: null,
        when: '  ',
        title: ' Recette ',
        description: '',
        substeps: [],
      },
    ]);

    expect(merged[0]).toMatchObject({
      when: null,
      title: 'Recette',
      description: null,
    });
  });
});

// A step the developer wrote or retouched is theirs from then on; one they only
// moved, or sent back word for word, is still the document's to correct.
describe('who owns a step after the developer edited it', () => {
  const read = {
    when: 'Q3 2026',
    title: 'Recette',
    description: null,
    origin: 'document' as const,
  };

  it('is the developer’s when nothing stood behind it', () => {
    expect(originAfterEdit(undefined, read)).toBe('developer');
  });

  it('stays the developer’s once it is', () => {
    expect(originAfterEdit({ ...read, origin: 'developer' }, read)).toBe(
      'developer',
    );
  });

  it('stays the document’s when sent back word for word', () => {
    expect(originAfterEdit(read, read)).toBe('document');
  });

  it('becomes the developer’s when a word changed', () => {
    expect(originAfterEdit(read, { ...read, when: 'mi-octobre' })).toBe(
      'developer',
    );
    expect(originAfterEdit(read, { ...read, description: 'Ajout.' })).toBe(
      'developer',
    );
  });
});
