import { Injectable } from '@nestjs/common';

// GitHub Projects v2 has no REST equivalent — it's GraphQL-only.
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

// GitHub caps a connection at 100 nodes per request; every list here is
// read page by page until GitHub says there is no next page, so a developer
// with more boards or a board with more items than one page holds is read
// whole.
const PAGE_SIZE = 100;

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface Connection<T> {
  nodes: T[];
  pageInfo?: PageInfo;
}

export type GithubOwnerType = 'User' | 'Organization';

// Thrown specifically for a 401/403 GitHub response — see query() below.
export class GithubAuthError extends Error {}

export interface AvailableBoard {
  ownerLogin: string;
  ownerType: GithubOwnerType;
  number: number;
  title: string;
  url: string;
}

interface GithubProjectsV2Node {
  number: number;
  title: string;
  url: string;
  owner: { __typename: GithubOwnerType; login: string };
}

interface ListBoardsResponse {
  viewer: { projectsV2: Connection<GithubProjectsV2Node> };
}

// The ProjectV2Item's own node id — its identity as "this content's
// placement on this specific board", used by task-vulgarization to key
// persisted rows. Not part of the public CurrentTaskItemSchema
// (packages/schemas) — that shape has no `id`, since the frontend never
// needs one. No `url` either — the client is never sent to GitHub, so this
// feature doesn't carry it any further than this fetch.
//
// boardStartDate/boardTargetDate/boardEstimateValue: the board's own custom
// fields, when present and validly typed — null otherwise (field absent,
// empty, or the wrong field type).
export interface InProgressItem {
  id: string;
  title: string;
  description: string | null;
  boardStartDate: string | null;
  boardTargetDate: string | null;
  boardEstimateValue: number | null;
}

type GithubItemContentType = 'Issue' | 'PullRequest' | 'DraftIssue';

interface GithubItemContent {
  __typename: GithubItemContentType;
  title: string;
  body?: string;
}

interface GithubItemNode {
  id: string;
  content: GithubItemContent | null;
  status: { name: string } | null;
  startDate: { date: string } | null;
  targetDate: { date: string } | null;
  estimate: { number: number } | null;
}

interface FetchItemsResponse {
  user?: { projectV2: { items: Connection<GithubItemNode> } | null } | null;
  organization?: {
    projectV2: { items: Connection<GithubItemNode> } | null;
  } | null;
}

// `viewer` resolves to whichever identity the token belongs to — this
// returns exactly the boards the developer needs to pick from, and doubles
// as the access check for a specific board: a board that doesn't appear
// here is not accessible.
const LIST_BOARDS_QUERY = `
  query($after: String) {
    viewer {
      projectsV2(first: ${PAGE_SIZE}, after: $after) {
        nodes {
          number
          title
          url
          owner {
            __typename
            ... on User { login }
            ... on Organization { login }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

// GitHub's Status single-select field, looked up by its exact default name —
// a board that renamed/removed it simply yields no matches. GraphQL has no
// dynamic root field, so `user`/`organization` is chosen by string-building
// the query, not by a variable.
//
// startDate/targetDate/estimate: the same board-item custom fields the
// user's own GitHub Projects v2 board template already provides, looked up
// by exact name the same way Status is — aliased since fieldValueByName
// can't be called more than once per node without one. A field of the wrong
// underlying type (or absent entirely) simply doesn't match its fragment,
// yielding null with no extra handling needed.
function itemsQuery(ownerType: GithubOwnerType): string {
  const rootField = ownerType === 'User' ? 'user' : 'organization';

  return `
    query($login: String!, $number: Int!, $after: String) {
      ${rootField}(login: $login) {
        projectV2(number: $number) {
          items(first: ${PAGE_SIZE}, after: $after) {
            nodes {
              id
              content {
                __typename
                ... on Issue { title body }
                ... on PullRequest { title body }
                ... on DraftIssue { title body }
              }
              status: fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              startDate: fieldValueByName(name: "Start date") {
                ... on ProjectV2ItemFieldDateValue { date }
              }
              targetDate: fieldValueByName(name: "Target date") {
                ... on ProjectV2ItemFieldDateValue { date }
              }
              estimate: fieldValueByName(name: "Estimate") {
                ... on ProjectV2ItemFieldNumberValue { number }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }
  `;
}

// Board-wide task counts (docs/PRODUCT.md "progress_percentage: computed
// from tasks?", resolved 2026-08-09) — `total` only counts items actually
// triaged into the board's Status workflow (a fresh backlog item with no
// Status yet would otherwise drag the percentage down for reasons outside
// the client's view), `done` is the same case-insensitive substring match
// pattern already used for "in progress", against "done" instead.
export interface TaskCounts {
  total: number;
  done: number;
}

@Injectable()
export class GithubProjectsClient {
  async listAccessibleBoards(token: string): Promise<AvailableBoard[]> {
    const nodes = await this.collectPages(async (after) => {
      const data = await this.query<ListBoardsResponse>(
        token,
        LIST_BOARDS_QUERY,
        { after },
      );
      return data.viewer.projectsV2;
    });

    return nodes.map((node) => ({
      ownerLogin: node.owner.login,
      ownerType: node.owner.__typename,
      number: node.number,
      title: node.title,
      url: node.url,
    }));
  }

  async verifyBoardAccess(
    token: string,
    ownerLogin: string,
    ownerType: GithubOwnerType,
    number: number,
  ): Promise<AvailableBoard | null> {
    const boards = await this.listAccessibleBoards(token);

    return (
      boards.find(
        (board) =>
          board.ownerLogin === ownerLogin &&
          board.ownerType === ownerType &&
          board.number === number,
      ) ?? null
    );
  }

  // Matches items whose Status value (case-insensitive substring) contains
  // "in progress" — the field name itself is matched exactly ("Status"),
  // per the product decision. Content with no matching fragment (e.g. a
  // redacted item) is skipped rather than erroring.
  async fetchInProgressItems(
    token: string,
    ownerLogin: string,
    ownerType: GithubOwnerType,
    number: number,
  ): Promise<InProgressItem[]> {
    const nodes = await this.fetchAllItems(
      token,
      ownerLogin,
      ownerType,
      number,
    );

    const items: InProgressItem[] = [];
    for (const node of nodes) {
      const status = node.status?.name;
      if (!status || !status.toLowerCase().includes('in progress')) continue;
      if (!node.content) continue;

      items.push({
        id: node.id,
        title: node.content.title,
        description: node.content.body ?? null,
        boardStartDate: node.startDate?.date ?? null,
        boardTargetDate: node.targetDate?.date ?? null,
        boardEstimateValue: node.estimate?.number ?? null,
      });
    }

    return items;
  }

  // The sweep calls this right after fetchInProgressItems on the same board,
  // so the same pages are read twice. Kept as its own read rather than one
  // fetch both derive from: the in-progress path feeds the client-facing
  // current-task card and stays untouched, and the doubled read is cheap for
  // a sweep that runs every five minutes.
  async fetchTaskCounts(
    token: string,
    ownerLogin: string,
    ownerType: GithubOwnerType,
    number: number,
  ): Promise<TaskCounts> {
    const nodes = await this.fetchAllItems(
      token,
      ownerLogin,
      ownerType,
      number,
    );

    let total = 0;
    let done = 0;
    for (const node of nodes) {
      if (!node.content) continue;
      const status = node.status?.name;
      if (!status) continue;
      total++;
      if (status.toLowerCase().includes('done')) done++;
    }

    return { total, done };
  }

  // Every item of the board, across pages. A board GitHub no longer resolves
  // (deleted, or the owner renamed) reads as empty, not as an error.
  private fetchAllItems(
    token: string,
    ownerLogin: string,
    ownerType: GithubOwnerType,
    number: number,
  ): Promise<GithubItemNode[]> {
    return this.collectPages(async (after) => {
      const data = await this.query<FetchItemsResponse>(
        token,
        itemsQuery(ownerType),
        { login: ownerLogin, number, after },
      );
      const owner = ownerType === 'User' ? data.user : data.organization;
      return owner?.projectV2?.items ?? { nodes: [] };
    });
  }

  // Walks a GraphQL connection to its end. A page with no pageInfo, or one
  // that says "next page" without a cursor to reach it, is the last one.
  private async collectPages<T>(
    fetchPage: (after: string | null) => Promise<Connection<T>>,
  ): Promise<T[]> {
    const nodes: T[] = [];
    let after: string | null = null;
    for (;;) {
      const page = await fetchPage(after);
      nodes.push(...page.nodes);
      const pageInfo = page.pageInfo;
      if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return nodes;
      after = pageInfo.endCursor;
    }
  }

  private async query<T>(
    token: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    // Never surface the raw GitHub response (or the token) in a thrown error.
    // 401/403 specifically means the stored token was revoked or is
    // otherwise invalid — distinguished from other failures (5xx, network)
    // so the background sweep can tell "needs reconnecting" apart from
    // "transient, will retry".
    if (res.status === 401 || res.status === 403) {
      throw new GithubAuthError(
        `GitHub API request failed with status ${res.status}`,
      );
    }
    if (!res.ok) {
      throw new Error(`GitHub API request failed with status ${res.status}`);
    }

    const body = (await res.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    if (body.errors && body.errors.length > 0) {
      throw new Error('GitHub API returned an error');
    }
    if (!body.data) {
      throw new Error('GitHub API returned no data');
    }

    return body.data;
  }
}
