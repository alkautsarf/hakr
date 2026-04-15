import type { StoryItem, CommentItem, HNUser, FeedType } from "../ui/types.ts";

const BASE = "https://hacker-news.firebaseio.com/v0";

const FEED_ENDPOINTS: Record<FeedType, string> = {
  top: "topstories",
  new: "newstories",
  best: "beststories",
  show: "showstories",
  ask: "askstories",
  jobs: "jobstories",
};

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}.json`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchStoryIds(feed: FeedType): Promise<number[]> {
  return fetchJSON<number[]>(FEED_ENDPOINTS[feed]);
}

export async function fetchItem(id: number): Promise<StoryItem | null> {
  const item = await fetchJSON<any>(`item/${id}`);
  if (!item || item.deleted) return null;
  return {
    id: item.id,
    type: item.type ?? "story",
    by: item.by ?? "[deleted]",
    time: item.time ?? 0,
    title: item.title ?? "",
    url: item.url,
    text: item.text,
    score: item.score ?? 0,
    descendants: item.descendants ?? 0,
    kids: item.kids,
    dead: item.dead,
    deleted: item.deleted,
  };
}

export async function fetchStories(ids: number[]): Promise<StoryItem[]> {
  const results = await Promise.all(ids.map(fetchItem));
  return results.filter((s): s is StoryItem => s !== null);
}

export async function fetchCommentTree(
  rootKids: number[],
  maxDepth = 10,
): Promise<CommentItem[]> {
  const flat: CommentItem[] = [];

  async function fetchOne(id: number, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    let item: any;
    try {
      item = await fetchJSON<any>(`item/${id}`);
    } catch {
      return;
    }
    if (!item || item.deleted || item.type !== "comment") return;

    const comment: CommentItem = {
      id: item.id,
      by: item.by ?? "[deleted]",
      time: item.time ?? 0,
      text: item.text ?? "",
      kids: item.kids,
      parent: item.parent,
      dead: item.dead,
      deleted: item.deleted,
      depth,
      collapsed: false,
    };

    flat.push(comment);

    // Fetch children in parallel
    if (item.kids?.length) {
      await Promise.all(item.kids.map((kid: number) => fetchOne(kid, depth + 1)));
    }
  }

  // Fetch all root-level comments in parallel
  await Promise.all(rootKids.map((id) => fetchOne(id, 0)));

  // Sort by tree order: group by root thread, preserve depth-first order
  // Since parallel fetching scrambles insertion order, we need to rebuild tree order
  const itemMap = new Map<number, CommentItem>();
  for (const c of flat) itemMap.set(c.id, c);

  const ordered: CommentItem[] = [];

  function addInOrder(id: number) {
    const item = itemMap.get(id);
    if (!item) return;
    ordered.push(item);
    if (item.kids) {
      for (const kid of item.kids) addInOrder(kid);
    }
  }

  for (const rootId of rootKids) addInOrder(rootId);
  return ordered;
}

export async function fetchUser(id: string): Promise<HNUser | null> {
  try {
    const user = await fetchJSON<any>(`user/${id}`);
    if (!user) return null;
    return {
      id: user.id,
      created: user.created,
      karma: user.karma,
      about: user.about,
      submitted: user.submitted,
    };
  } catch {
    return null;
  }
}
