import { createEffect, onMount } from "solid-js";
import { useAppStore } from "./state.tsx";
import { useTheme } from "./theme.tsx";
import { useAppKeyboard } from "./keys.ts";
import { Layout } from "./layout.tsx";
import { fetchStoryIds, fetchStories, fetchItem, fetchCommentTree, fetchUser } from "../api/read.ts";
import { upvote as apiUpvote } from "../api/write.ts";
import { getStoredCookie, getStoredUsername } from "../auth/session.ts";
import { filterVisibleComments } from "./utils.ts";
import type { FeedType } from "./types.ts";

const STORIES_PER_PAGE = 30;
const FEED_ORDER: FeedType[] = ["top", "new", "best", "show", "ask", "jobs"];

interface AppProps {
  onQuit: () => void;
}

export function App(props: AppProps) {
  const { store, setStore, helpers } = useAppStore();
  const theme = useTheme();

  let storyListScrollRef: any = null;
  let commentScrollRef: any = null;

  // Restore session on mount + fetch karma
  onMount(() => {
    getStoredUsername().then(async (user) => {
      if (user) {
        helpers.setLoggedInUser(user);
        const profile = await fetchUser(user).catch(() => null);
        if (profile) helpers.setUserKarma(profile.karma);
      }
    }).catch(() => {});
  });

  // Load feed reactively (fires on mount + when feed changes)
  createEffect(() => {
    const feed = store.feed;
    loadFeed(feed).catch(() => {});
  });

  // Auto-scroll to matched comment when filter is applied or n/N changes
  createEffect(() => {
    const filter = store.commentFilter;
    const matchIdx = store.commentFilterMatchIndex;
    if (filter && store.commentFilterMatchIds.length > 0) {
      void matchIdx; // track changes from n/N
      setTimeout(() => scrollCommentIntoView(store.highlightedCommentIndex), 50);
    }
  });

  let loadFeedGen = 0;

  async function loadFeed(feed: FeedType) {
    const gen = ++loadFeedGen;
    helpers.setLoading(true);
    setStore("loadedStoryIds", []);
    setStore("stories", {});
    try {
      const ids = await fetchStoryIds(feed);
      if (gen !== loadFeedGen) return; // superseded by newer load

      setStore("allStoryIds", ids);
      const pageIds = ids.slice(0, STORIES_PER_PAGE);
      const stories = await fetchStories(pageIds);
      if (gen !== loadFeedGen) return;

      const storiesMap: Record<number, (typeof stories)[0]> = {};
      for (const s of stories) storiesMap[s.id] = s;

      setStore("stories", storiesMap);
      setStore("loadedStoryIds", pageIds.filter((id) => storiesMap[id]));
    } catch (e: any) {
      if (gen !== loadFeedGen) return;
      helpers.showToast(`Failed to load: ${e.message}`, "error");
    } finally {
      if (gen === loadFeedGen) helpers.setLoading(false);
    }
  }

  async function loadMoreStories() {
    if (store.loadingMoreStories) return;
    const currentCount = store.loadedStoryIds.length;
    const allIds = store.allStoryIds;
    if (currentCount >= allIds.length) return;

    setStore("loadingMoreStories", true);
    try {
      const nextBatch = allIds.slice(currentCount, currentCount + STORIES_PER_PAGE);
      const stories = await fetchStories(nextBatch);

      for (const s of stories) {
        setStore("stories", s.id, s);
      }

      const newIds = nextBatch.filter((id) => store.stories[id]);
      setStore("loadedStoryIds", [...store.loadedStoryIds, ...newIds]);
    } catch (e: any) {
      helpers.showToast(`Failed to load more: ${e.message}`, "error");
    } finally {
      setStore("loadingMoreStories", false);
    }
  }

  async function loadComments(storyId: number) {
    helpers.setLoadingComments(true);
    setStore("comments", []);
    try {
      const fresh = await fetchItem(storyId);
      if (!fresh?.kids?.length) {
        return;
      }
      const comments = await fetchCommentTree(fresh.kids);
      for (const c of comments) {
        if (c.kids?.length) c.collapsed = true;
      }
      setStore("comments", comments);
    } catch (e: any) {
      helpers.showToast(`Comments error: ${e.message}`, "error");
    } finally {
      helpers.setLoadingComments(false);
    }
  }

  function scrollStoryIntoView(idx: number) {
    const stories = store.loadedStoryIds;
    const storyId = stories[idx];
    if (storyId && storyListScrollRef) {
      storyListScrollRef.scrollChildIntoView?.(`story-${storyId}`);
    }
  }

  function scrollCommentIntoView(idx: number) {
    const comments = getVisibleComments();
    const comment = comments[idx];
    if (comment && commentScrollRef) {
      commentScrollRef.scrollChildIntoView?.(`comment-${comment.id}`);
    }
  }

  function getVisibleComments() {
    return filterVisibleComments(store.comments);
  }

  useAppKeyboard({
    onQuit: props.onQuit,

    onNavigateStories(dir) {
      const max = store.loadedStoryIds.length - 1;
      const next = Math.max(0, Math.min(max, store.highlightedStoryIndex + dir));
      helpers.setHighlightedStory(next);
      scrollStoryIntoView(next);
      if (next >= store.loadedStoryIds.length - 5) loadMoreStories().catch(() => {});
    },

    onNavigateComments(dir) {
      const visible = getVisibleComments();
      const max = visible.length - 1;
      // When at top and pressing up, scroll to story body top
      if (dir === -1 && store.highlightedCommentIndex === 0 && commentScrollRef) {
        commentScrollRef.scrollTop = 0;
        return;
      }
      const next = Math.max(0, Math.min(max, store.highlightedCommentIndex + dir));
      helpers.setHighlightedComment(next);
      scrollCommentIntoView(next);
    },

    onJumpStoriesTop() {
      helpers.setHighlightedStory(0);
      scrollStoryIntoView(0);
    },

    onJumpStoriesBottom() {
      const last = store.loadedStoryIds.length - 1;
      helpers.setHighlightedStory(last);
      scrollStoryIntoView(last);
      loadMoreStories().catch(() => {});
    },

    onJumpCommentsTop() {
      helpers.setHighlightedComment(0);
      if (commentScrollRef) commentScrollRef.scrollTop = 0;
    },

    onJumpCommentsBottom() {
      const visible = getVisibleComments();
      const last = visible.length - 1;
      helpers.setHighlightedComment(last);
      scrollCommentIntoView(last);
    },

    onOpenStory() {
      const storyId = store.loadedStoryIds[store.highlightedStoryIndex];
      if (!storyId) return;
      helpers.openStory(storyId);
    },

    onBackToStories() {
      helpers.selectStory(null);
      setStore("comments", []);
    },

    onUpvote() {
      const id =
        store.focusZone === "stories"
          ? store.loadedStoryIds[store.highlightedStoryIndex]
          : getVisibleComments()[store.highlightedCommentIndex]?.id;
      if (!id) return;

      if (!store.loggedInUser) {
        helpers.showToast("Login first (press L)", "error");
        return;
      }

      helpers.toggleUpvoted(id);
      getStoredCookie().then((cookie) => {
        if (cookie) apiUpvote(cookie, id).catch(() => {});
      }).catch(() => {});
    },

    onReply() {
      if (!store.selectedStoryId) return;
      if (!store.loggedInUser) {
        helpers.showToast("Login first (press L)", "error");
        return;
      }
      const visible = getVisibleComments();
      const comment = visible[store.highlightedCommentIndex];
      if (!comment) return;
      helpers.setReplyTarget(comment.id);
      helpers.setMode("insert");
      helpers.setFocusZone("input");
    },

    onComment() {
      if (!store.selectedStoryId) {
        helpers.showToast("Open a story first", "error");
        return;
      }
      if (!store.loggedInUser) {
        helpers.showToast("Login first (press L)", "error");
        return;
      }
      helpers.setReplyTarget(store.selectedStoryId);
      helpers.setMode("insert");
      helpers.setFocusZone("input");
    },

    onCollapseToggle() {
      const visible = getVisibleComments();
      const comment = visible[store.highlightedCommentIndex];
      if (!comment) return;

      const idx = store.comments.findIndex((c) => c.id === comment.id);
      if (idx === -1) return;
      setStore("comments", idx, "collapsed", !comment.collapsed);
    },

    onOpenUrl() {
      const storyId =
        store.focusZone === "stories"
          ? store.loadedStoryIds[store.highlightedStoryIndex]
          : store.selectedStoryId;
      if (!storyId) return;
      const story = store.stories[storyId];
      const url = story?.url ?? `https://news.ycombinator.com/item?id=${storyId}`;
      const browser = process.env.BROWSER;
      const cmd = browser?.includes("qutebrowser")
        ? `${browser} --target tab "${url}"`
        : `${browser ?? "open"} "${url}"`;
      import("child_process").then(({ exec }) => exec(cmd));
    },

    onNextFeed() {
      const idx = FEED_ORDER.indexOf(store.feed);
      const next = FEED_ORDER[(idx + 1) % FEED_ORDER.length]!;
      helpers.setFeed(next);
    },

    onPrevFeed() {
      const idx = FEED_ORDER.indexOf(store.feed);
      const next = FEED_ORDER[(idx - 1 + FEED_ORDER.length) % FEED_ORDER.length]!;
      helpers.setFeed(next);
    },

    onPageDown() {
      if (store.focusZone === "stories") {
        const step = 10;
        const max = store.loadedStoryIds.length - 1;
        const next = Math.min(max, store.highlightedStoryIndex + step);
        helpers.setHighlightedStory(next);
        scrollStoryIntoView(next);
        if (next >= store.loadedStoryIds.length - 5) loadMoreStories().catch(() => {});
      } else if (store.focusZone === "comments") {
        const step = 10;
        const visible = getVisibleComments();
        const max = visible.length - 1;
        const next = Math.min(max, store.highlightedCommentIndex + step);
        helpers.setHighlightedComment(next);
        scrollCommentIntoView(next);
      }
    },

    onPageUp() {
      if (store.focusZone === "stories") {
        const step = 10;
        const next = Math.max(0, store.highlightedStoryIndex - step);
        helpers.setHighlightedStory(next);
        scrollStoryIntoView(next);
      } else if (store.focusZone === "comments") {
        const step = 10;
        const next = Math.max(0, store.highlightedCommentIndex - step);
        helpers.setHighlightedComment(next);
        scrollCommentIntoView(next);
      }
    },

    onRefresh() {
      helpers.showToast("Refreshing…", "info", 2000);
      loadFeed(store.feed).catch(() => {});
      if (store.selectedStoryId) {
        loadComments(store.selectedStoryId).catch(() => {});
      }
    },

    onScrollToCommentMatch() {
      scrollCommentIntoView(store.highlightedCommentIndex);
    },

    onViewProfile() {
      let userId: string | null = null;
      if (store.focusZone === "stories") {
        const storyId = store.loadedStoryIds[store.highlightedStoryIndex];
        if (storyId) userId = store.stories[storyId]?.by ?? null;
      } else if (store.focusZone === "comments") {
        const visible = getVisibleComments();
        const comment = visible[store.highlightedCommentIndex];
        if (comment) userId = comment.by;
      }
      if (!userId) {
        if (store.loggedInUser) userId = store.loggedInUser;
        else return;
      }
      helpers.setOverlay({ type: "user", userId });
    },

    onViewOwnProfile() {
      if (!store.loggedInUser) {
        helpers.showToast("Login first (press L)", "error");
        return;
      }
      helpers.setOverlay({ type: "user", userId: store.loggedInUser });
    },
  });

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor={theme.bg}
    >
      <Layout
        storyListScrollRef={(el: any) => (storyListScrollRef = el)}
        commentScrollRef={(el: any) => (commentScrollRef = el)}
      />
    </box>
  );
}
