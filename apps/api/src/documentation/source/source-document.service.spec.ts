import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { SourceDocument } from '@prisma/client';
import { NotionConnectionService } from '../../notion-connection/notion-connection.service';
import {
  NotionAccessError,
  NotionClient,
} from '../../notion-connection/notion.client';
import { ProjectAccessService } from '../../projects/project-access.service';
import {
  asPrismaService,
  createPrismaMock,
  PrismaMock,
} from '../../test/prisma-mock';
import { DocumentInputNormalizerService } from './document-input-normalizer.service';
import { ReferenceDocumentService } from '../reference/reference-document.service';
import { DocumentStorageClient } from './document-storage.client';
import { SourceDocumentService } from './source-document.service';

const projectId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';
const documentId = '00000000-0000-4000-8000-000000000003';

function sourceDocument(
  overrides: Partial<SourceDocument> = {},
): SourceDocument {
  return {
    id: documentId,
    projectId,
    kind: 'upload',
    status: 'incorporated',
    version: 1,
    title: 'Architecture',
    originalFileName: 'architecture.pdf',
    originalMimeType: 'application/pdf',
    originalSizeBytes: 13,
    storedObjectKey: `documentation/${projectId}/${documentId}/architecture.pdf`,
    externalUrl: null,
    notionPageId: null,
    contentSha256: 'a'.repeat(64),
    addedByUserId: userId,
    failureCode: null,
    processingStartedAt: null,
    removedAt: null,
    createdAt: new Date('2026-08-11T10:00:00.000Z'),
    updatedAt: new Date('2026-08-11T10:00:00.000Z'),
    ...overrides,
  };
}

describe('SourceDocumentService', () => {
  let prisma: PrismaMock;
  let storage: jest.Mocked<DocumentStorageClient>;
  let normalizer: jest.Mocked<
    Pick<DocumentInputNormalizerService, 'normalizeUpload'>
  >;
  let access: jest.Mocked<Pick<ProjectAccessService, 'requireDeveloper'>>;
  let notionClient: jest.Mocked<
    Pick<NotionClient, 'fetchPage' | 'listSharedPages'>
  >;
  let notionConnection: jest.Mocked<Pick<NotionConnectionService, 'withToken'>>;
  let reference: jest.Mocked<Pick<ReferenceDocumentService, 'write'>>;
  let service: SourceDocumentService;

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = {
      put: jest.fn(),
      delete: jest.fn(),
      getDownloadUrl: jest.fn(),
    } as unknown as jest.Mocked<DocumentStorageClient>;
    normalizer = {
      normalizeUpload: jest.fn().mockResolvedValue({ parts: [] }),
    };
    access = { requireDeveloper: jest.fn().mockResolvedValue({}) };
    notionClient = { fetchPage: jest.fn(), listSharedPages: jest.fn() };
    notionConnection = {
      // Runs the call with a token, the way the real service does.
      withToken: jest.fn(
        (_userId: string, call: (t: string) => Promise<unknown>) =>
          call('secret-token'),
      ) as unknown as jest.MockedFunction<NotionConnectionService['withToken']>,
    };
    reference = { write: jest.fn().mockResolvedValue({ documentId: 'ref-1' }) };
    service = new SourceDocumentService(
      asPrismaService(prisma),
      storage,
      normalizer as unknown as DocumentInputNormalizerService,
      access as unknown as ProjectAccessService,
      notionClient as unknown as NotionClient,
      notionConnection as unknown as NotionConnectionService,
      reference as unknown as ReferenceDocumentService,
    );
    prisma.sourceDocument.create.mockResolvedValue(sourceDocument());
    prisma.project.update.mockResolvedValue({ id: projectId });
  });

  it('validates supported MIME types and the 25 MB limit before storage', async () => {
    await expect(
      service.addUpload(userId, projectId, {
        buffer: Buffer.from('x'),
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
        size: 1,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.addUpload(userId, projectId, {
        buffer: Buffer.alloc(1),
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 25 * 1024 * 1024 + 1,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects empty content and a buffer that exceeds the limit independently of metadata', async () => {
    await expect(
      service.addUpload(userId, projectId, {
        buffer: Buffer.alloc(0),
        originalname: 'empty.pdf',
        mimetype: 'application/pdf',
        size: 0,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.addUpload(userId, projectId, {
        buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 1,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('preserves the original and takes the document into the corpus at once', async () => {
    const original = Buffer.from('%PDF-original');
    const result = await service.addUpload(userId, projectId, {
      buffer: original,
      originalname: 'architecture.pdf',
      mimetype: 'application/pdf',
      size: original.length,
    } as Express.Multer.File);

    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `^documentation/${projectId}/[0-9a-f-]+/architecture\\.pdf$`,
        ),
      ),
      original,
      'application/pdf',
    );
    expect(result).toMatchObject({
      document: { id: documentId, status: 'incorporated' },
    });
  });

  // A document is added to be read, so adding one writes the reference
  // document: the developer does not have to ask for what they just asked for.
  it('writes the reference document from the document just added', async () => {
    await service.addUpload(
      userId,
      projectId,
      {
        buffer: Buffer.from('%PDF'),
        originalname: 'a.pdf',
        mimetype: 'application/pdf',
        size: 4,
      } as Express.Multer.File,
      'fr',
    );

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { referenceNeedsRewrite: true } }),
    );
    expect(reference.write).toHaveBeenCalledWith(userId, projectId, 'fr');
  });

  // A write already running has this document's arrival behind it, and one
  // still being read is not a reason to refuse the upload.
  it('keeps the document when a write is already running', async () => {
    reference.write.mockRejectedValue(
      new ConflictException({ code: 'REFERENCE_WRITING' }),
    );

    await expect(
      service.addUpload(userId, projectId, {
        buffer: Buffer.from('%PDF'),
        originalname: 'a.pdf',
        mimetype: 'application/pdf',
        size: 4,
      } as Express.Multer.File),
    ).resolves.toMatchObject({ document: { id: documentId } });
    expect(prisma.sourceDocument.deleteMany).not.toHaveBeenCalled();
  });

  // Read once, at the door. An unreadable file that got in would fail the whole
  // reference write later and take the project's document down with it.
  it('refuses a file it cannot read, before storing anything', async () => {
    normalizer.normalizeUpload.mockRejectedValue(new Error('corrupt pdf'));

    await expect(
      service.addUpload(userId, projectId, {
        buffer: Buffer.from('not really a pdf'),
        originalname: 'broken.pdf',
        mimetype: 'application/pdf',
        size: 16,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
    expect(prisma.sourceDocument.create).not.toHaveBeenCalled();
  });

  it('compensates R2 and the document row when the row cannot be finished', async () => {
    prisma.project.update.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.addUpload(userId, projectId, {
        buffer: Buffer.from('%PDF'),
        originalname: 'a.pdf',
        mimetype: 'application/pdf',
        size: 4,
      } as Express.Multer.File),
    ).rejects.toThrow('database unavailable');

    expect(prisma.sourceDocument.deleteMany).toHaveBeenCalledWith({
      where: { id: documentId },
    });
    expect(storage.delete).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^documentation/${projectId}/`)),
    );
  });

  it('compensates storage without deleting a row when database creation fails', async () => {
    prisma.sourceDocument.create.mockRejectedValue(new Error('insert failed'));
    await expect(
      service.addUpload(userId, projectId, {
        buffer: Buffer.from('%PDF'),
        originalname: '.pdf',
        mimetype: 'application/pdf',
        size: 4,
      } as Express.Multer.File),
    ).rejects.toThrow('insert failed');
    expect(prisma.sourceDocument.deleteMany).not.toHaveBeenCalled();
    expect(storage.delete).toHaveBeenCalled();
  });

  it('adds a racine Notion: the page and its subtree, stored as read, remembered by page id', async () => {
    prisma.sourceDocument.findFirst.mockResolvedValue(null);
    notionClient.fetchPage.mockResolvedValue({
      title: 'Cadrage',
      url: 'https://notion.so/Cadrage-page1',
      content: 'Le lancement est en avril.',
    });
    prisma.sourceDocument.create.mockResolvedValue(
      sourceDocument({
        kind: 'notion',
        title: 'Cadrage',
        originalFileName: null,
        originalMimeType: 'application/json',
        externalUrl: 'https://notion.so/Cadrage-page1',
      }),
    );

    const result = await service.addNotionRoot(userId, projectId, 'page-1');

    expect(notionClient.fetchPage).toHaveBeenCalledWith(
      'secret-token',
      'page-1',
    );
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringContaining('/notion-snapshot.json'),
      expect.any(Buffer),
      'application/json',
    );
    const snapshot = JSON.parse(
      storage.put.mock.calls[0][1].toString('utf8'),
    ) as Record<string, unknown>;
    expect(snapshot).toMatchObject({
      pageId: 'page-1',
      pageUrl: 'https://notion.so/Cadrage-page1',
      title: 'Cadrage',
      content: 'Le lancement est en avril.',
    });
    expect(prisma.sourceDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: 'notion',
        notionPageId: 'page-1',
        externalUrl: 'https://notion.so/Cadrage-page1',
      }),
    });
    expect(reference.write).toHaveBeenCalled();
    expect(result.document.kind).toBe('notion');
  });

  it('refuses a page that is already a racine of this project', async () => {
    prisma.sourceDocument.findFirst.mockResolvedValue({ id: 'doc-1' });

    await expect(
      service.addNotionRoot(userId, projectId, 'page-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(notionClient.fetchPage).not.toHaveBeenCalled();
  });

  it('rejects a disconnected developer and an inaccessible page, lets other faults through', async () => {
    prisma.sourceDocument.findFirst.mockResolvedValue(null);

    notionConnection.withToken.mockRejectedValueOnce(
      new BadRequestException({ code: 'NOTION_NOT_CONNECTED' }),
    );
    await expect(
      service.addNotionRoot(userId, projectId, 'page-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    notionClient.fetchPage.mockRejectedValueOnce(
      new NotionAccessError('forbidden', 403),
    );
    await expect(
      service.addNotionRoot(userId, projectId, 'page-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    notionClient.fetchPage.mockRejectedValueOnce(new Error('network'));
    await expect(
      service.addNotionRoot(userId, projectId, 'page-1'),
    ).rejects.toThrow('network');
  });

  describe('Mettre à jour', () => {
    const pageOne = {
      title: 'Cadrage',
      url: 'https://notion.so/Cadrage-page1',
      content: 'Le lancement est en avril.',
    };
    const pageTwo = {
      title: 'Budget',
      url: 'https://notion.so/Budget-page2',
      content: 'Dix jours.',
    };

    // The fingerprint a racine was stored with is what its own addition
    // computed, so a re-read of the same content compares equal to it.
    async function storedFingerprint(page: typeof pageOne): Promise<string> {
      prisma.sourceDocument.findFirst.mockResolvedValueOnce(null);
      notionClient.fetchPage.mockResolvedValueOnce(page);
      await service.addNotionRoot(userId, projectId, 'page-x');
      const call = prisma.sourceDocument.create.mock.calls.at(-1)?.[0] as {
        data: { contentSha256: string };
      };
      prisma.sourceDocument.create.mockClear();
      notionClient.fetchPage.mockClear();
      storage.put.mockClear();
      reference.write.mockClear();
      prisma.project.update.mockClear();
      return call.data.contentSha256;
    }

    function root(
      id: string,
      pageId: string,
      contentSha256: string,
    ): SourceDocument {
      return sourceDocument({
        id,
        kind: 'notion',
        title: 'Old title',
        originalFileName: null,
        originalMimeType: 'application/json',
        storedObjectKey: `documentation/${projectId}/${id}/notion-snapshot.json`,
        externalUrl: 'https://notion.so/old',
        notionPageId: pageId,
        contentSha256,
      });
    }

    it('re-reads every racine, replaces the ones whose content changed, rewrites the reference once', async () => {
      const unchanged = root(
        'doc-1',
        'page-1',
        await storedFingerprint(pageOne),
      );
      const changed = root('doc-2', 'page-2', 'b'.repeat(64));
      prisma.sourceDocument.findMany.mockResolvedValue([unchanged, changed]);
      notionClient.fetchPage
        .mockResolvedValueOnce(pageOne)
        .mockResolvedValueOnce(pageTwo);
      prisma.sourceDocument.update.mockResolvedValue({
        ...changed,
        title: 'Budget',
        version: 2,
      });

      const result = await service.updateNotionRoots(userId, projectId, 'fr');

      expect(notionClient.fetchPage).toHaveBeenCalledTimes(2);
      expect(storage.put).toHaveBeenCalledTimes(1);
      expect(storage.put).toHaveBeenCalledWith(
        changed.storedObjectKey,
        expect.any(Buffer),
        'application/json',
      );
      expect(
        JSON.parse(storage.put.mock.calls[0][1].toString('utf8')),
      ).toMatchObject({
        pageId: 'page-2',
        title: 'Budget',
        content: 'Dix jours.',
      });
      expect(prisma.sourceDocument.update).toHaveBeenCalledTimes(1);
      expect(prisma.sourceDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-2' },
        data: expect.objectContaining({
          title: 'Budget',
          externalUrl: 'https://notion.so/Budget-page2',
          contentSha256: expect.not.stringMatching(/^b+$/u),
          version: { increment: 1 },
        }),
      });
      expect(reference.write).toHaveBeenCalledTimes(1);
      expect(reference.write).toHaveBeenCalledWith(userId, projectId, 'fr');
      expect(result).toEqual({
        replaced: [
          expect.objectContaining({ id: 'doc-2', title: 'Budget', version: 2 }),
        ],
        unchanged: 1,
        referenceRewritten: true,
      });
    });

    it('owes the rewrite before the first snapshot moves, and says so when the write could not run now', async () => {
      const changed = root('doc-2', 'page-2', 'b'.repeat(64));
      prisma.sourceDocument.findMany.mockResolvedValue([changed]);
      notionClient.fetchPage.mockResolvedValue(pageTwo);
      prisma.sourceDocument.update.mockResolvedValue({
        ...changed,
        version: 2,
      });
      reference.write.mockRejectedValue(
        new ConflictException({ code: 'REFERENCE_WRITING' }),
      );

      const result = await service.updateNotionRoots(userId, projectId, 'fr');

      expect(result.referenceRewritten).toBe(false);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { referenceNeedsRewrite: true },
      });
      expect(prisma.project.update.mock.invocationCallOrder[0]).toBeLessThan(
        storage.put.mock.invocationCallOrder[0],
      );
    });

    it('reports a rate limit the client could not wait out as such, not as a page refused', async () => {
      prisma.sourceDocument.findMany.mockResolvedValue([
        root('doc-1', 'page-1', 'b'.repeat(64)),
      ]);
      notionClient.fetchPage.mockRejectedValue(
        new NotionAccessError('rate limited', 429),
      );

      await expect(
        service.updateNotionRoots(userId, projectId, 'fr'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringContaining('Try again'),
        }),
      });
    });

    it('says nothing new when no racine changed, and rewrites nothing', async () => {
      const fingerprint = await storedFingerprint(pageOne);
      prisma.sourceDocument.findMany.mockResolvedValue([
        root('doc-1', 'page-1', fingerprint),
        root('doc-2', 'page-2', fingerprint),
      ]);
      notionClient.fetchPage.mockResolvedValue(pageOne);

      const result = await service.updateNotionRoots(userId, projectId, 'fr');

      expect(result).toEqual({
        replaced: [],
        unchanged: 2,
        referenceRewritten: false,
      });
      expect(storage.put).not.toHaveBeenCalled();
      expect(prisma.sourceDocument.update).not.toHaveBeenCalled();
      expect(prisma.project.update).not.toHaveBeenCalled();
      expect(reference.write).not.toHaveBeenCalled();
    });

    it('reads every racine before replacing any: a page Notion refuses leaves the project as it was', async () => {
      prisma.sourceDocument.findMany.mockResolvedValue([
        root('doc-1', 'page-1', 'b'.repeat(64)),
        root('doc-2', 'page-2', 'b'.repeat(64)),
      ]);
      notionClient.fetchPage
        .mockResolvedValueOnce(pageOne)
        .mockRejectedValueOnce(new NotionAccessError('forbidden', 403));

      await expect(
        service.updateNotionRoots(userId, projectId, 'fr'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringContaining('Old title'),
        }),
      });
      expect(storage.put).not.toHaveBeenCalled();
      expect(prisma.sourceDocument.update).not.toHaveBeenCalled();
      expect(reference.write).not.toHaveBeenCalled();
    });

    it('has nothing to read on a project without racines', async () => {
      prisma.sourceDocument.findMany.mockResolvedValue([]);

      const result = await service.updateNotionRoots(userId, projectId, 'fr');

      expect(result).toEqual({
        replaced: [],
        unchanged: 0,
        referenceRewritten: false,
      });
      expect(notionConnection.withToken).not.toHaveBeenCalled();
    });
  });

  it('lists the pages the developer ticked, marking those already read by a racine here', async () => {
    notionClient.listSharedPages.mockResolvedValue([
      {
        id: 'page-1',
        title: 'Cadrage',
        url: 'https://notion.so/p1',
        parentPageId: null,
      },
      {
        id: 'page-2',
        title: 'Roadmap',
        url: 'https://notion.so/p2',
        parentPageId: null,
      },
      {
        id: 'page-3',
        title: 'Budget',
        url: 'https://notion.so/p3',
        parentPageId: 'page-1',
      },
      {
        id: 'page-4',
        title: 'Detail',
        url: 'https://notion.so/p4',
        parentPageId: 'page-3',
      },
    ]);
    prisma.sourceDocument.findMany.mockResolvedValue([
      { id: 'doc-1', notionPageId: 'page-1' },
    ]);

    await expect(service.listNotionPages(userId, projectId)).resolves.toEqual({
      pages: [
        {
          id: 'page-1',
          title: 'Cadrage',
          url: 'https://notion.so/p1',
          rootDocumentId: 'doc-1',
        },
        {
          id: 'page-2',
          title: 'Roadmap',
          url: 'https://notion.so/p2',
          rootDocumentId: null,
        },
        // Beneath Cadrage, so already read by its document — both the child
        // and the grandchild.
        {
          id: 'page-3',
          title: 'Budget',
          url: 'https://notion.so/p3',
          rootDocumentId: 'doc-1',
        },
        {
          id: 'page-4',
          title: 'Detail',
          url: 'https://notion.so/p4',
          rootDocumentId: 'doc-1',
        },
      ],
    });
    expect(prisma.sourceDocument.findMany).toHaveBeenCalledWith({
      where: { projectId, kind: 'notion', status: { not: 'removed' } },
      select: { id: true, notionPageId: true },
    });
  });

  it('turns a Notion refusal on the page list into a 400', async () => {
    notionClient.listSharedPages.mockRejectedValue(
      new NotionAccessError('rate limited', 429),
    );

    await expect(
      service.listNotionPages(userId, projectId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns contributor-only list/detail state and a fresh short-lived original URL', async () => {
    prisma.sourceDocument.findMany.mockResolvedValue([sourceDocument()]);
    prisma.sourceDocument.count.mockResolvedValue(1);
    prisma.sourceDocument.findFirst.mockResolvedValue(sourceDocument());
    storage.getDownloadUrl.mockResolvedValue('https://signed.example/file');

    await expect(service.list(userId, projectId)).resolves.toEqual({
      items: [
        expect.objectContaining({ id: documentId, status: 'incorporated' }),
      ],
      total: 1,
      nextCursor: null,
    });
    expect(prisma.sourceDocument.count).toHaveBeenCalledWith({
      where: { projectId, status: { not: 'removed' } },
    });
    expect(prisma.sourceDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId, status: { not: 'removed' } },
      }),
    );
    await expect(
      service.detail(userId, projectId, documentId),
    ).resolves.toEqual(
      expect.objectContaining({
        id: documentId,
        originalDownloadUrl: 'https://signed.example/file',
      }),
    );
    expect(access.requireDeveloper).toHaveBeenCalledTimes(2);
    expect(storage.getDownloadUrl).toHaveBeenCalledWith(
      expect.any(String),
      900,
    );
  });

  it('paginates deterministically and never signs a removed original', async () => {
    const documents = Array.from({ length: 51 }, (_, index) =>
      sourceDocument({ id: `document-${index}`, title: `Document ${index}` }),
    );
    prisma.sourceDocument.findMany.mockResolvedValue(documents);
    prisma.sourceDocument.count.mockResolvedValue(51);
    const page = await service.list(userId, projectId, 'cursor-1');
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toBe('document-49');
    expect(prisma.sourceDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'cursor-1' }, skip: 1 }),
    );

    prisma.sourceDocument.findFirst.mockResolvedValue({
      ...sourceDocument({ status: 'removed', storedObjectKey: null }),
      observations: [{}],
    });
    await expect(
      service.detail(userId, projectId, documentId),
    ).resolves.toMatchObject({
      originalDownloadUrl: null,
    });
    expect(storage.getDownloadUrl).not.toHaveBeenCalled();
  });

  it('uses the same hidden 404 for a missing document after authorization', async () => {
    prisma.sourceDocument.findFirst.mockResolvedValue(null);

    await expect(service.detail(userId, projectId, documentId)).rejects.toEqual(
      new NotFoundException({ code: 'NOT_FOUND' }),
    );
  });
});
