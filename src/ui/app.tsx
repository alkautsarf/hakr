import { createEffect, onMount } from "solid-js";
import { useAppStore } from "./state.tsx";
import { useTheme } from "./theme.tsx";
import { useAppKeyboard } from "./keys.ts";
import { Layout } from "./layout.tsx";
import { fetchStoryIds, fetchStories, fetchCommentTree, fetchUser } from "../api/read.ts";
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
  onMount(async () => {
    const user = await getStoredUsername();
    if (user) {
      helpers.setLoggedInUser(user);
      const profile = await fetchUser(user);
      if (profile) helpers.setUserKarma(profile.karma);
    }
  });

  // Load feed reactively (fires on mount + when feed changes)
  createEffect(() => {
    const feed = store.feed;
    loadFeed(feed);
  });

  async function loadFeed(feed: FeedType) {
    helpers.setLoading(true);
    try {
      const ids = await fetchStoryIds(feed);
      const pageIds = ids.slice(0, STORIES_PER_PAGE);
      const stories = await fetchStories(pageIds);

      const storiesMap: Record<number, (typeof stories)[0]> = {};
      for (const s of stories) storiesMap[s.id] = s;

      setStore("stories", storiesMap);
      setStore("loadedStoryIds", pageIds.filter((id) => storiesMap[id]));
    } catch (e: any) {
      helpers.showToast(`Failed to load: ${e.message}`, "error");
    } finally {
      helpers.setLoading(false);
    }
  }

  async function loadComments(storyId: number) {
    helpers.setLoadingComments(true);
    try {
      const story = store.stories[storyId];
      if (!story?.kids?.length) {
        setStore("comments", []);
        return;
      }
      const comments = await fetchCommentTree(story.kids);
      setStore("comments", comments);
    } catch (e: any) {
      helpers.showToast(`Failed to load comments: ${e.message}`, "error");
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
    },

    onNavigateComments(dir) {
      const visible = getVisibleComments();
      const max = visible.length - 1;
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
    },

    onJumpCommentsTop() {
      helpers.setHighlightedComment(0);
      scrollCommentIntoView(0);
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
      helpers.selectStory(storyId);
      loadComments(storyId);
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
      // Fire and forget — optimistic UI
      getStoredCookie().then((cookie) => {
        if (cookie) apiUpvote(cookie, id);
      });
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
      loadFeed(store.feed);
      if (store.selectedStoryId) {
        loadComments(store.selectedStoryId);
      }
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
