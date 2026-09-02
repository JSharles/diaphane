import { Injectable } from '@nestjs/common';

const NOTION_API_URL = 'https://api.notion.com/v1';
// Pinned per Notion's API versioning scheme — an explicit version avoids
// silently picking up a breaking response-shape change.
const NOTION_VERSION = '2022-06-28';

// Thrown for a non-2xx from the Notion API. The status travels with it: a
// 401 is the one NotionConnectionService.withToken answers by refreshing the
// pair; the rest (a page not shared, a rate limit) reach the caller as is.
export class NotionAccessError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface NotionRichText {
  plain_text: string;
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

interface ListBlockChildrenResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

interface NotionPageProperty {
  type: string;
  title?: NotionRichText[];
}

interface NotionPageResponse {
  url: string;
  properties: Record<string, NotionPageProperty>;
}

export interface NotionPageContent {
  title: string;
  url: string;
  content: string;
}

// A page the developer ticked in Notion's page picker: one candidate racine.
export interface NotionSharedPage {
  id: string;
  title: string;
  url: string;
  // The page it sits under, when that is a page: what says a candidate is
  // already read as part of a racine chosen above it.
  parentPageId: string | null;
}

interface NotionSearchResult {
  object: string;
  id: string;
  url: string;
  archived?: boolean;
  in_trash?: boolean;
  parent?: { type: string; page_id?: string };
  properties: Record<string, NotionPageProperty>;
}

interface SearchResponse {
  results: NotionSearchResult[];
  has_more: boolean;
  next_cursor: string | null;
}

// specs/011-project-resources research.md Decision 5: Notion content is
// fetched as plain text only — no image blocks are forwarded to Claude's
// vision input for v1 (Notion's own image URLs are short-lived presigned
// links, real fetch-timing complexity for a P2 path). Block children are
// fetched recursively so nested content (toggles, nested lists) is included.
@Injectable()
export class NotionClient {
  async fetchPage(token: string, pageId: string): Promise<NotionPageContent> {
    const { title, url } = await this.fetchPageHead(token, pageId);
    const blocks = await this.fetchBlockChildren(token, pageId);
    const content = (await this.flattenBlocks(token, blocks)).join('\n\n');

    return { title, url, content };
  }

  // The pages shared with the connection — what the developer ticked, plus
  // what a ticked parent gives access to. `POST /v1/search` without a query
  // returns exactly that set, 100 per page; pages directly shared are
  // guaranteed to be there, though not always the second after the OAuth
  // return (Notion indexes them shortly after).
  async listSharedPages(token: string): Promise<NotionSharedPage[]> {
    const pages: NotionSharedPage[] = [];
    let cursor: string | undefined;
    do {
      const res = await this.request(token, '/search', {
        method: 'POST',
        body: JSON.stringify({
          filter: { property: 'object', value: 'page' },
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      });
      const data = (await res.json()) as SearchResponse;
      for (const result of data.results) {
        if (result.object !== 'page' || result.archived || result.in_trash) {
          continue;
        }
        pages.push({
          id: result.id,
          title: titleOf(result.properties),
          url: result.url,
          parentPageId:
            result.parent?.type === 'page_id'
              ? (result.parent.page_id ?? null)
              : null,
        });
      }
      cursor = data.has_more ? (data.next_cursor ?? undefined) : undefined;
    } while (cursor);
    return pages;
  }

  private async fetchPageHead(
    token: string,
    pageId: string,
  ): Promise<{ title: string; url: string }> {
    const res = await this.request(token, `/pages/${pageId}`);
    const data = (await res.json()) as NotionPageResponse;
    return { title: titleOf(data.properties), url: data.url };
  }

  private async fetchBlockChildren(
    token: string,
    blockId: string,
  ): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    do {
      const query = cursor
        ? `?page_size=100&start_cursor=${cursor}`
        : '?page_size=100';
      const res = await this.request(
        token,
        `/blocks/${blockId}/children${query}`,
      );
      const data = (await res.json()) as ListBlockChildrenResponse;
      blocks.push(...data.results);
      cursor = data.has_more ? (data.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return blocks;
  }

  private async flattenBlocks(
    token: string,
    blocks: NotionBlock[],
  ): Promise<string[]> {
    const parts: string[] = [];

    for (const block of blocks) {
      const text = extractBlockText(block);
      if (text) {
        parts.push(text);
      }

      if (block.has_children) {
        const children = await this.fetchBlockChildren(token, block.id);
        parts.push(...(await this.flattenBlocks(token, children)));
      }
    }

    return parts;
  }

  private async request(
    token: string,
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const res = await fetch(`${NOTION_API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new NotionAccessError(
        `Unable to access this Notion page (status ${res.status})`,
        res.status,
      );
    }

    return res;
  }
}

// The title property's key varies by page (e.g. "title" for a plain page,
// but a database row names it after its own title column) — find it by type
// instead of by key.
function titleOf(properties: Record<string, NotionPageProperty>): string {
  const titleProperty = Object.values(properties ?? {}).find(
    (property) => property.type === 'title',
  );
  const title = (titleProperty?.title ?? []).map((t) => t.plain_text).join('');
  return title.trim() || 'Untitled Notion page';
}

function extractBlockText(block: NotionBlock): string | null {
  const body = block[block.type] as
    { rich_text?: NotionRichText[] } | undefined;
  const richText = body?.rich_text;
  if (!richText || richText.length === 0) {
    return null;
  }
  return richText.map((t) => t.plain_text).join('');
}
