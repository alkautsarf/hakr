import { createContext, useContext } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import type { AppStore, AppStoreHelpers, AppMode, FocusZone, FeedType, OverlayType } from "./types.ts";
import { fetchItem, fetchCommentTree } from "../api/read.ts";

const INITIAL_STORE: AppStore = {
  feed: "top",
  stories: {},
  loadedStoryIds: [],
  comments: [],
  selectedStoryId: null,
  highlightedStoryIndex: 0,
  highlightedCommentIndex: 0,
  mode: "normal",
  focusZone: "stories",
  overlay: null,
  toast: null,
  loading: true,
  loadingComments: false,
  loggedInUser: null,
  userKarma: null,
  upvotedIds: new Set(),
  replyTargetId: null,
  helpScrollOffset: 0,
};

interface AppStoreContext {
  store: AppStore;
  setStore: SetStoreFunction<AppStore>;
  helpers: AppStoreHelpers;
}

const StoreContext = createContext<AppStoreContext>();

export function createAppStore(): [AppStore, SetStoreFunction<AppStore>, AppStoreHelpers] {
  const [store, setStore] = createStore<AppStore>({ ...INITIAL_STORE });

  const helpers: AppStoreHelpers = {
    setMode(mode: AppMode) {
      setStore("mode", mode);
    },
    setFocusZone(zone: FocusZone) {
      setStore("focusZone", zone);
    },
    setOverlay(overlay: OverlayType | null) {
      setStore("overlay", overlay);
      if (overlay) {
        setStore("mode", "search");
      } else {
        setStore("mode", "normal");
      }
    },
    showToast(message: string, level: "info" | "error" | "success" = "info", durationMs = 4000) {
      const expiresAt = Date.now() + durationMs;
      setStore("toast", { message, level, expiresAt });
      setTimeout(() => {
        if (store.toast && store.toast.expiresAt <= Date.now()) {
          setStore("toast", null);
        }
      }, durationMs + 50);
    },
    setFeed(feed: FeedType) {
      setStore("feed", feed);
      setStore("highlightedStoryIndex", 0);
      setStore("selectedStoryId", null);
      setStore("comments", []);
    },
    selectStory(id: number | null) {
      setStore("selectedStoryId", id);
      setStore("highlightedCommentIndex", 0);
      if (id !== null) {
        setStore("focusZone", "comments");
      }
    },
    openStory(id: number) {
      setStore("selectedStoryId", id);
      setStore("highlightedCommentIndex", 0);
      setStore("focusZone", "comments");
      setStore("loadingComments", true);
      setStore("comments", []);
      fetchItem(id).then((fresh) => {
        if (!fresh?.kids?.length) {
          setStore("loadingComments", false);
          return;
        }
        fetchCommentTree(fresh.kids).then((comments) => {
          setStore("comments", comments);
          setStore("loadingComments", false);
        }).catch(() => setStore("loadingComments", false));
      }).catch(() => setStore("loadingComments", false));
    },
    setHighlightedStory(index: number) {
      setStore("highlightedStoryIndex", index);
    },
    setHighlightedComment(index: number) {
      setStore("highlightedCommentIndex", index);
    },
    setLoading(v: boolean) {
      setStore("loading", v);
    },
    setLoadingComments(v: boolean) {
      setStore("loadingComments", v);
    },
    setLoggedInUser(user: string | null) {
      setStore("loggedInUser", user);
    },
    setUserKarma(karma: number | null) {
      setStore("userKarma", karma);
    },
    setReplyTarget(id: number | null) {
      setStore("replyTargetId", id);
    },
    toggleUpvoted(id: number) {
      const next = new Set(store.upvotedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setStore("upvotedIds", next);
    },
  };

  return [store, setStore, helpers];
}

export function AppStoreProvider(props: {
  store: AppStore;
  setStore: SetStoreFunction<AppStore>;
  helpers: AppStoreHelpers;
  children: any;
}) {
  return (
    <StoreContext.Provider
      value={{ store: props.store, setStore: props.setStore, helpers: props.helpers }}
    >
      {props.children}
    </StoreContext.Provider>
  );
}

export function useAppStore(): AppStoreContext {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
