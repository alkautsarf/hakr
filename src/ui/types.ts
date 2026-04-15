export type AppMode = "normal" | "insert" | "search";
export type FocusZone = "stories" | "comments" | "input";
export type FeedType = "top" | "new" | "best" | "show" | "ask" | "jobs";

export interface StoryItem {
  id: number;
  type: "story" | "job" | "poll";
  by: string;
  time: number;
  title: string;
  url?: string;
  text?: string;
  score: number;
  descendants: number;
  kids?: number[];
  dead?: boolean;
  deleted?: boolean;
}

export interface CommentItem {
  id: number;
  by: string;
  time: number;
  text: string;
  kids?: number[];
  parent: number;
  dead?: boolean;
  deleted?: boolean;
  depth: number;
  collapsed: boolean;
}

export interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

export type OverlayType =
  | { type: "search" }
  | { type: "submit" }
  | { type: "login" }
  | { type: "help" }
  | { type: "user"; userId: string };

export interface ToastState {
  message: string;
  level: "info" | "error" | "success";
  expiresAt: number;
}

export interface AppStore {
  feed: FeedType;
  stories: Record<number, StoryItem>;
  loadedStoryIds: number[];
  comments: CommentItem[];
  selectedStoryId: number | null;
  highlightedStoryIndex: number;
  highlightedCommentIndex: number;
  mode: AppMode;
  focusZone: FocusZone;
  overlay: OverlayType | null;
  toast: ToastState | null;
  loading: boolean;
  loadingComments: boolean;
  loggedInUser: string | null;
  userKarma: number | null;
  upvotedIds: Set<number>;
  replyTargetId: number | null;
  helpScrollOffset: number;
}

export interface AppStoreHelpers {
  setMode: (mode: AppMode) => void;
  setFocusZone: (zone: FocusZone) => void;
  setOverlay: (overlay: OverlayType | null) => void;
  showToast: (message: string, level?: "info" | "error" | "success", durationMs?: number) => void;
  setFeed: (feed: FeedType) => void;
  selectStory: (id: number | null) => void;
  setHighlightedStory: (index: number) => void;
  setHighlightedComment: (index: number) => void;
  setLoading: (v: boolean) => void;
  setLoadingComments: (v: boolean) => void;
  setLoggedInUser: (user: string | null) => void;
  setUserKarma: (karma: number | null) => void;
  setReplyTarget: (id: number | null) => void;
  toggleUpvoted: (id: number) => void;
}
