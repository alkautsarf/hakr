import { useKeyboard } from "@opentui/solid";
import { useAppStore } from "./state.tsx";
import type { FocusZone } from "./types.ts";

export interface KeyboardActions {
  onQuit: () => void;
  onNavigateStories: (dir: -1 | 1) => void;
  onNavigateComments: (dir: -1 | 1) => void;
  onJumpStoriesTop: () => void;
  onJumpStoriesBottom: () => void;
  onJumpCommentsTop: () => void;
  onJumpCommentsBottom: () => void;
  onOpenStory: () => void;
  onBackToStories: () => void;
  onUpvote: () => void;
  onReply: () => void;
  onComment: () => void;
  onCollapseToggle: () => void;
  onOpenUrl: () => void;
  onNextFeed: () => void;
  onPrevFeed: () => void;
  onPageDown: () => void;
  onPageUp: () => void;
  onRefresh: () => void;
  onScrollToCommentMatch?: () => void;
  onViewProfile?: () => void;
  onViewOwnProfile?: () => void;
}

const FOCUS_ORDER: FocusZone[] = ["stories", "comments", "input"];

export function useAppKeyboard(actions: KeyboardActions) {
  const { store, helpers } = useAppStore();

  let keyBuffer = "";
  let keyBufferTimer: ReturnType<typeof setTimeout> | null = null;

  function clearKeyBuffer() {
    keyBuffer = "";
    if (keyBufferTimer) {
      clearTimeout(keyBufferTimer);
      keyBufferTimer = null;
    }
  }

  function cycleFocus(forward: boolean) {
    const zones = store.selectedStoryId ? FOCUS_ORDER : (["stories"] as FocusZone[]);
    const idx = zones.indexOf(store.focusZone);
    const next = forward
      ? zones[(idx + 1) % zones.length]!
      : zones[(idx - 1 + zones.length) % zones.length]!;
    helpers.setFocusZone(next);
  }

  function drillBack() {
    if (store.mode === "insert") {
      helpers.setMode("normal");
      helpers.setFocusZone("comments");
      return;
    }
    if (store.overlay) {
      helpers.setOverlay(null);
      return;
    }
    if (store.focusZone === "input") {
      helpers.setFocusZone("comments");
      return;
    }
    if (store.commentFilter && store.focusZone === "comments") {
      helpers.setCommentFilter(null);
      return;
    }
    if (store.focusZone === "comments") {
      helpers.setFocusZone("stories");
      actions.onBackToStories();
      return;
    }
  }

  useKeyboard((evt: any) => {
    // Always: Ctrl+C to quit
    if (evt.ctrl && evt.name === "c") {
      evt.preventDefault();
      actions.onQuit();
      return;
    }

    // Search/overlay mode — only Esc passes through
    if (store.mode === "search") {
      if (evt.name === "escape") {
        evt.preventDefault();
        drillBack();
      }
      return;
    }

    // Insert mode — only Esc and Ctrl combos
    if (store.mode === "insert") {
      if (evt.name === "escape") {
        evt.preventDefault();
        drillBack();
      }
      return;
    }

    // Normal mode — consume everything
    evt.preventDefault();

    // Overlays
    if (evt.name === "?" || (evt.shift && evt.name === "/")) {
      helpers.setOverlay({ type: "help" });
      return;
    }
    if (evt.name === "/" && !evt.ctrl) {
      const ctx = store.focusZone === "comments" && store.selectedStoryId ? "comments" : "stories";
      helpers.setOverlay({ type: "search", context: ctx });
      return;
    }

    // Two-key: gg
    if (evt.name === "g" && !evt.ctrl && !evt.shift) {
      if (keyBuffer === "g") {
        clearKeyBuffer();
        if (store.focusZone === "stories") actions.onJumpStoriesTop();
        else if (store.focusZone === "comments") actions.onJumpCommentsTop();
        return;
      }
      keyBuffer = "g";
      keyBufferTimer = setTimeout(clearKeyBuffer, 500);
      return;
    }

    // Clear key buffer on any non-g key
    if (keyBuffer) clearKeyBuffer();

    // G — jump to bottom
    if (evt.name === "G" || (evt.shift && evt.name === "g")) {
      if (store.focusZone === "stories") actions.onJumpStoriesBottom();
      else if (store.focusZone === "comments") actions.onJumpCommentsBottom();
      return;
    }

    // Tab / Shift+Tab — cycle focus
    if (evt.name === "tab") {
      cycleFocus(!evt.shift);
      return;
    }

    // h/l — switch focus zones or feeds
    if (evt.name === "h") {
      if (store.focusZone === "comments" || store.focusZone === "input") {
        helpers.setFocusZone("stories");
      } else if (store.focusZone === "stories") {
        actions.onPrevFeed();
      }
      return;
    }
    if (evt.name === "l" && !evt.shift) {
      if (store.focusZone === "stories" && store.selectedStoryId) {
        helpers.setFocusZone("comments");
      } else if (store.focusZone === "stories") {
        actions.onNextFeed();
      } else if (store.focusZone === "comments") {
        actions.onCollapseToggle();
      }
      return;
    }

    // j/k — navigate
    if (evt.name === "j" || evt.name === "down") {
      if (store.focusZone === "stories") actions.onNavigateStories(1);
      else if (store.focusZone === "comments") actions.onNavigateComments(1);
      return;
    }
    if (evt.name === "k" || evt.name === "up") {
      if (store.focusZone === "stories") actions.onNavigateStories(-1);
      else if (store.focusZone === "comments") actions.onNavigateComments(-1);
      return;
    }

    // Page down/up
    if (evt.name === "d" && evt.ctrl) {
      actions.onPageDown();
      return;
    }
    if (evt.name === "u" && evt.ctrl) {
      actions.onPageUp();
      return;
    }

    // Enter — open story / toggle collapse in comments
    if (evt.name === "return") {
      if (store.focusZone === "stories") actions.onOpenStory();
      else if (store.focusZone === "comments") actions.onCollapseToggle();
      return;
    }

    // Escape — drill back
    if (evt.name === "escape") {
      drillBack();
      return;
    }

    // q — quit (if no overlay)
    if (evt.name === "q") {
      if (store.focusZone === "comments" || store.focusZone === "input") {
        helpers.setFocusZone("stories");
        actions.onBackToStories();
      } else {
        actions.onQuit();
      }
      return;
    }

    // u — upvote
    if (evt.name === "u") {
      actions.onUpvote();
      return;
    }

    // n/N — next/prev comment match
    if (evt.name === "n" && !evt.shift && !evt.ctrl) {
      if (store.commentFilter && store.focusZone === "comments") {
        helpers.nextCommentMatch();
        actions.onScrollToCommentMatch?.();
        return;
      }
    }
    if (evt.name === "N" || (evt.shift && evt.name === "n")) {
      if (store.commentFilter && store.focusZone === "comments") {
        helpers.prevCommentMatch();
        actions.onScrollToCommentMatch?.();
        return;
      }
    }

    // r — reply to highlighted comment
    if (evt.name === "r" && !evt.shift) {
      actions.onReply();
      return;
    }

    // c — comment on story (top-level)
    if (evt.name === "c") {
      actions.onComment();
      return;
    }

    // o — open URL in browser
    if (evt.name === "o") {
      actions.onOpenUrl();
      return;
    }

    // p — view user profile (context-aware), P — own profile
    if (evt.name === "p" || evt.name === "P") {
      if (evt.shift || evt.name === "P") {
        actions.onViewOwnProfile?.();
      } else {
        actions.onViewProfile?.();
      }
      return;
    }

    // s — submit story
    if (evt.name === "s") {
      helpers.setOverlay({ type: "submit" });
      return;
    }

    // R — refresh feed
    if (evt.name === "R" || (evt.shift && evt.name === "r")) {
      actions.onRefresh();
      return;
    }

    // L — login
    if (evt.name === "L" || (evt.shift && evt.name === "l")) {
      helpers.setOverlay({ type: "login" });
      return;
    }
  });
}
