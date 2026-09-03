import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SourceDocument } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { NotionConnectionService } from '../../notion-connection/notion-connection.service';
import {
  NotionAccessError,
  NotionClient,
  type NotionPageContent,
} from '../../notion-connection/notion.client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectAccessService } from '../../projects/project-access.service';
import { ReferenceDocumentService } from '../reference/reference-document.service';
import { DocumentStorageClient } from './document-storage.client';
import {
  DocumentInputNormalizerService,
  type UploadDocumentInput,
} from './document-input-normalizer.service';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;
const HIDDEN_NOT_FOUND = { code: 'NOT_FOUND' } as const;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

export interface SourceDocumentSummary {
  id: string;
  kind: 'upload' | 'notion';
  status: 'received' | 'incorporated' | 'failed' | 'removed';
  version: number;
  title: string;
  failureCode: string | null;
  createdAt: string;
}

export interface SourceDocumentDetail extends SourceDocumentSummary {
  originalFileName: string | null;
  originalMimeType: string | null;
  originalSizeBytes: number | null;
  originalDownloadUrl: string | null;
  externalUrl: string | null;
}

export interface SourceDocumentAcknowledgement {
  document: SourceDocumentSummary;
}

// What « Mettre à jour » did: the racines whose content had changed, replaced
// as they now read, and how many read the same as before.
export interface NotionRootsUpdate {
  replaced: SourceDocumentSummary[];
  unchanged: number;
  // False when a racine was replaced but the rewrite could not run now (one
  // already running); the project stays owed it and the screen offers it.
  referenceRewritten: boolean;
}

// A page the developer ticked in Notion, and the document it already is for
// this project when it is one of its racines.
export interface NotionRootCandidate {
  id: string;
  title: string;
  url: string;
  rootDocumentId: string | null;
}

@Injectable()
export class SourceDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DocumentStorageClient,
    private readonly normalizer: DocumentInputNormalizerService,
    private readonly access: ProjectAccessService,
    private readonly notionClient: NotionClient,
    private readonly notionConnection: NotionConnectionService,
    private readonly reference: ReferenceDocumentService,
  ) {}

  async addUpload(
    userId: string,
    projectId: string,
    file: Express.Multer.File,
    locale: string | null = null,
  ): Promise<SourceDocumentAcknowledgement> {
    await this.access.requireDeveloper(userId, projectId);
    this.validateUpload(file);

    const documentId = randomUUID();
    const objectKey = this.uploadObjectKey(
      projectId,
      documentId,
      file.originalname,
    );
    const contentSha256 = sha256(file.buffer);

    // Read once, here, so an unreadable file is refused at the door rather than
    // failing the whole reference write later — one bad upload must not be able
    // to take the project's document down with it.
    try {
      await this.normalizer.normalizeUpload({
        bytes: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype as UploadDocumentInput['mimeType'],
      });
    } catch {
      throw new BadRequestException(
        'This file could not be read. Check that it opens, then try again.',
      );
    }

    await this.storage.put(objectKey, file.buffer, file.mimetype);

    let document: SourceDocument | null = null;
    try {
      document = await this.prisma.sourceDocument.create({
        data: {
          id: documentId,
          projectId,
          kind: 'upload',
          status: 'incorporated',
          title: stripExtension(file.originalname),
          originalFileName: file.originalname,
          originalMimeType: file.mimetype,
          originalSizeBytes: file.size,
          storedObjectKey: objectKey,
          contentSha256,
          addedByUserId: userId,
        },
      });
      await this.writeReference(userId, projectId, locale);
      return { document: this.summary(document) };
    } catch (error) {
      await this.compensateCreate(document?.id, objectKey);
      throw error;
    }
  }

  // The pages the developer ticked in Notion — the racines this project may
  // choose — with, for each, the document it already is here.
  async listNotionPages(
    userId: string,
    projectId: string,
  ): Promise<{ pages: NotionRootCandidate[] }> {
    await this.access.requireDeveloper(userId, projectId);
    const shared = await this.readFromNotion(
      userId,
      (token) => this.notionClient.listSharedPages(token),
      'Unable to list your Notion pages with your Notion connection.',
    );
    const roots = await this.prisma.sourceDocument.findMany({
      where: { projectId, kind: 'notion', status: { not: 'removed' } },
      select: { id: true, notionPageId: true },
    });
    const documentByPage = new Map(
      roots.map((root) => [root.notionPageId, root.id]),
    );
    // A racine reads its whole subtree, so a page beneath one is already read
    // by that document: offering it again would put the same content twice
    // in the reference document.
    const parentOf = new Map(
      shared.map((page) => [page.id, page.parentPageId]),
    );
    const readBy = (pageId: string): string | null => {
      let current: string | null | undefined = pageId;
      const seen = new Set<string>();
      while (current && !seen.has(current)) {
        const document = documentByPage.get(current);
        if (document) return document;
        seen.add(current);
        current = parentOf.get(current);
      }
      return null;
    };
    return {
      pages: shared.map(({ parentPageId: _parent, ...page }) => ({
        ...page,
        rootDocumentId: readBy(page.id),
      })),
    };
  }

  // A racine Notion: the page and its whole subtree, flattened into one
  // document source, stored as it was read. Taking it back out is the
  // ordinary document removal.
  async addNotionRoot(
    userId: string,
    projectId: string,
    pageId: string,
    locale: string | null = null,
  ): Promise<SourceDocumentAcknowledgement> {
    await this.access.requireDeveloper(userId, projectId);
    const existing = await this.prisma.sourceDocument.findFirst({
      where: { projectId, notionPageId: pageId, status: { not: 'removed' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'NOTION_ROOT_EXISTS',
        message: 'This page is already a root of this project.',
      });
    }

    const page = await this.readFromNotion(
      userId,
      (token) => this.notionClient.fetchPage(token, pageId),
      'Unable to read this Notion page with your Notion connection.',
    );

    const documentId = randomUUID();
    const snapshot = notionSnapshot(pageId, page);
    const objectKey = `documentation/${projectId}/${documentId}/notion-snapshot.json`;
    await this.storage.put(objectKey, snapshot, 'application/json');

    let document: SourceDocument | null = null;
    try {
      document = await this.prisma.sourceDocument.create({
        data: {
          id: documentId,
          projectId,
          kind: 'notion',
          status: 'incorporated',
          title: page.title,
          originalMimeType: 'application/json',
          originalSizeBytes: snapshot.length,
          storedObjectKey: objectKey,
          externalUrl: page.url,
          notionPageId: pageId,
          contentSha256: notionFingerprint(page),
          addedByUserId: userId,
        },
      });
      await this.writeReference(userId, projectId, locale);
      return { document: this.summary(document) };
    } catch (error) {
      await this.compensateCreate(document?.id, objectKey);
      throw error;
    }
  }

  // « Mettre à jour »: every racine of the project is re-read, those whose
  // content changed are replaced by what they now read, and the reference
  // document is rewritten once if at least one changed. Every racine is read
  // before any is replaced: a page Notion refuses (no longer shared, say)
  // stops the update with the project as it was, and the message names the
  // racine so the developer knows which one to take out or share again.
  async updateNotionRoots(
    userId: string,
    projectId: string,
    locale: string | null = null,
  ): Promise<NotionRootsUpdate> {
    await this.access.requireDeveloper(userId, projectId);
    const roots = await this.prisma.sourceDocument.findMany({
      where: {
        projectId,
        kind: 'notion',
        status: { not: 'removed' },
        notionPageId: { not: null },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const changed: { root: SourceDocument; page: NotionPageContent }[] = [];
    for (const root of roots) {
      const pageId = root.notionPageId as string;
      const page = await this.readFromNotion(
        userId,
        (token) => this.notionClient.fetchPage(token, pageId),
        `Unable to read the Notion page « ${root.title} » with your Notion connection.`,
      );
      if (notionFingerprint(page) !== root.contentSha256) {
        changed.push({ root, page });
      }
    }

    if (changed.length === 0) {
      return {
        replaced: [],
        unchanged: roots.length,
        referenceRewritten: false,
      };
    }

    // Owed before the first snapshot moves: a replacement that stops halfway
    // must not leave the reference document silently behind its documents.
    await this.oweReference(projectId);
    const replaced: SourceDocumentSummary[] = [];
    for (const { root, page } of changed) {
      const snapshot = notionSnapshot(root.notionPageId as string, page);
      const objectKey =
        root.storedObjectKey ??
        `documentation/${projectId}/${root.id}/notion-snapshot.json`;
      await this.storage.put(objectKey, snapshot, 'application/json');
      const document = await this.prisma.sourceDocument.update({
        where: { id: root.id },
        data: {
          title: page.title,
          externalUrl: page.url,
          originalSizeBytes: snapshot.length,
          storedObjectKey: objectKey,
          contentSha256: notionFingerprint(page),
          version: { increment: 1 },
        },
      });
      replaced.push(this.summary(document));
    }

    const referenceRewritten = await this.writeOwedReference(
      userId,
      projectId,
      locale,
    );
    return {
      replaced,
      unchanged: roots.length - replaced.length,
      referenceRewritten,
    };
  }

  async list(
    userId: string,
    projectId: string,
    cursor?: string,
  ): Promise<{
    items: SourceDocumentSummary[];
    total: number;
    nextCursor: string | null;
  }> {
    await this.access.requireDeveloper(userId, projectId);
    const pageSize = 50;
    const total = await this.prisma.sourceDocument.count({
      where: { projectId, status: { not: 'removed' } },
    });
    const documents = await this.prisma.sourceDocument.findMany({
      where: { projectId, status: { not: 'removed' } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = documents.length > pageSize;
    const page = documents.slice(0, pageSize);
    return {
      items: page.map((document) => this.summary(document)),
      total,
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async detail(
    userId: string,
    projectId: string,
    documentId: string,
  ): Promise<SourceDocumentDetail> {
    await this.access.requireDeveloper(userId, projectId);
    const document = await this.prisma.sourceDocument.findFirst({
      where: { id: documentId, projectId },
    });
    if (!document) {
      throw new NotFoundException(HIDDEN_NOT_FOUND);
    }
    const originalDownloadUrl =
      document.storedObjectKey && document.status !== 'removed'
        ? await this.storage.getDownloadUrl(
            document.storedObjectKey,
            DOWNLOAD_URL_TTL_SECONDS,
          )
        : null;
    return {
      ...this.summary(document),
      originalFileName: document.originalFileName,
      originalMimeType: document.originalMimeType,
      originalSizeBytes: document.originalSizeBytes,
      originalDownloadUrl,
      externalUrl: document.externalUrl,
    };
  }

  // Every Notion read goes through the developer's own connection, refreshed
  // on use. A refusal from Notion (a page no longer shared, a rate limit)
  // reaches the developer as a named 400; a missing or revoked connection is
  // already one, raised by withToken.
  private async readFromNotion<T>(
    userId: string,
    read: (token: string) => Promise<T>,
    refusalMessage: string,
  ): Promise<T> {
    try {
      return await this.notionConnection.withToken(userId, read);
    } catch (error) {
      if (error instanceof NotionAccessError) {
        // A limit the client could not wait out is not a page refused: the
        // advice is to try again, not to share the page again.
        throw new BadRequestException(
          error.status === 429
            ? 'Notion is limiting reads right now. Try again in a moment.'
            : refusalMessage,
        );
      }
      throw error;
    }
  }

  private validateUpload(file: Express.Multer.File): void {
    if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported file type. Accepted formats: PDF, Word (.docx), PNG, JPEG.',
      );
    }
    if (file.size <= 0 || file.buffer.length === 0) {
      throw new BadRequestException('The uploaded document is empty.');
    }
    if (
      file.size > MAX_FILE_SIZE_BYTES ||
      file.buffer.length > MAX_FILE_SIZE_BYTES
    ) {
      throw new BadRequestException('File is too large. Maximum size: 25 MB.');
    }
  }

  private summary(document: SourceDocument): SourceDocumentSummary {
    return {
      id: document.id,
      kind: document.kind,
      status: document.status,
      version: document.version,
      title: document.title,
      failureCode: document.failureCode,
      createdAt: document.createdAt.toISOString(),
    };
  }

  private async compensateCreate(
    documentId: string | undefined,
    objectKey: string,
  ): Promise<void> {
    const operations: Promise<unknown>[] = [this.storage.delete(objectKey)];
    if (documentId) {
      operations.unshift(
        this.prisma.sourceDocument.deleteMany({
          where: { id: documentId },
        }),
      );
    }
    await Promise.allSettled(operations);
  }

  // A document is added to be read, so adding one writes the reference document
  // — the developer does not have to ask for what they just asked for. Their own
  // notes are the other half of this rule and behave differently on purpose:
  // they accumulate behind a button, because answering five points in a row
  // would otherwise pay for five writes and move the document while it is being
  // read.
  private async writeReference(
    userId: string,
    projectId: string,
    locale: string | null,
  ): Promise<void> {
    await this.oweReference(projectId);
    await this.writeOwedReference(userId, projectId, locale);
  }

  private async oweReference(projectId: string): Promise<void> {
    await this.prisma.project.update({
      where: { id: projectId },
      data: { referenceNeedsRewrite: true },
    });
  }

  // Whether the write ran. A write already running has this document's
  // arrival behind it, and one still being read is not a reason to refuse
  // the upload: the project stays owed a rewrite and the screen offers it —
  // the document is in either way.
  private async writeOwedReference(
    userId: string,
    projectId: string,
    locale: string | null,
  ): Promise<boolean> {
    try {
      await this.reference.write(userId, projectId, locale);
      return true;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        return false;
      }
      throw error;
    }
  }

  private uploadObjectKey(
    projectId: string,
    documentId: string,
    originalName: string,
  ): string {
    const safeName = originalName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 180);
    return `documentation/${projectId}/${documentId}/${safeName || 'original'}`;
  }
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

// A racine Notion, stored as it was read: the page and its whole subtree
// flattened, with when it was captured.
function notionSnapshot(pageId: string, page: NotionPageContent): Buffer {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      capturedAt: new Date().toISOString(),
      pageId,
      pageUrl: page.url,
      title: page.title,
      content: page.content,
    }),
    'utf8',
  );
}

// What « Mettre à jour » compares: the content as read, title included, and
// nothing about when — the snapshot carries its capture time, so its own hash
// would call every re-read a change.
function notionFingerprint(page: NotionPageContent): string {
  return sha256(Buffer.from(`${page.title}\n${page.content}`, 'utf8'));
}

function stripExtension(fileName: string): string {
  const stripped = fileName.replace(/\.[^.]+$/u, '').trim();
  return stripped || 'Untitled document';
}
