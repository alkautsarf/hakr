import { useTerminalDimensions } from "@opentui/solid";
import { createSignal, createMemo, For, Show } from "solid-js";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";
import { searchStories, fetchItem, type AlgoliaHit } from "../../api/read.ts";
import { stripHtml, filterVisibleComments, timeAgo } from "../utils.ts";

export function SearchOverlay() {
  const dims = useTerminalDimensions();
  const { store, setStore, helpers } = useAppStore();
  const theme = useTheme();

  const isCommentSearch = () => store.overlay?.type === "search" && store.overlay.context === "comments";

  const [query, setQuery] = createSignal("");
  const [selectedIdx, setSelectedIdx] = createSignal(0);

  // Algolia state (story search)
  const [algoliaResults, setAlgoliaResults] = createSignal<AlgoliaHit[]>([]);
  const [searching, setSearching] = createSignal(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let requestId = 0;

  // Local story filter (empty query fallback)
  const localStories = createMemo(() => {
    const q = query().toLowerCase();
    if (!q) return store.loadedStoryIds.map((id) => store.stories[id]).filter(Boolean);
    return store.loadedStoryIds
      .map((id) => store.stories[id])
      .filter((s) => s && s.title.toLowerCase().includes(q));
  });

  // Comment filter results
  const commentMatches = createMemo(() => {
    const q = query().toLowerCase();
    if (!q) return [];
    return store.comments.filter(
      (c) => stripHtml(c.text).toLowerCase().includes(q) || c.by.toLowerCase().includes(q),
    );
  });

  // What to show in the result list
  const storyDisplayItems = createMemo(() => {
    const q = query().trim();
    if (!q) return localStories();
    const hits = algoliaResults();
    if (hits.length > 0) return hits;
    if (searching()) return [];
    return localStories(); // fallback while no algolia results yet
  });

  function onQueryChange(v: string) {
    setQuery(v);
    setSelectedIdx(0);

    if (isCommentSearch()) return; // comment search is purely local

    // Algolia debounce for story search
    if (debounceTimer) clearTimeout(debounceTimer);
    const q = v.trim();
    if (!q) {
      setAlgoliaResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const thisRequest = ++requestId;
    debounceTimer = setTimeout(async () => {
      try {
        const hits = await searchStories(q);
        if (thisRequest === requestId) {
          setAlgoliaResults(hits);
        }
      } catch {
        // fall back silently to local filter
      } finally {
        if (thisRequest === requestId) setSearching(false);
      }
    }, 300);
  }

  function selectStoryResult() {
    const items = storyDisplayItems();
    const item = items[selectedIdx()];
    if (!item) return;

    // Check if it's an AlgoliaHit (has objectID) or a local StoryItem (has id)
    if ("objectID" in item) {
      const id = Number((item as AlgoliaHit).objectID);
      helpers.setOverlay(null);
      // Fetch full story via Firebase then open
      fetchItem(id).then((full) => {
        if (full) {
          setStore("stories", id, full);
          if (!store.loadedStoryIds.includes(id)) {
            setStore("loadedStoryIds", [...store.loadedStoryIds, id]);
          }
        }
        helpers.openStory(id);
      }).catch(() => helpers.openStory(id));
    } else {
      // Local story
      const story = item as { id: number };
      const idx = store.loadedStoryIds.indexOf(story.id);
      if (idx >= 0) helpers.setHighlightedStory(idx);
      helpers.setOverlay(null);
      helpers.openStory(story.id);
    }
  }

  function selectCommentResult() {
    const q = query().trim();
    if (!q) {
      helpers.setOverlay(null);
      return;
    }
    const matches = commentMatches();
    if (matches.length === 0) {
      helpers.showToast("No matches", "info", 2000);
      helpers.setOverlay(null);
      return;
    }

    const matchIds = matches.map((c) => c.id);
    setStore("commentFilter", q);
    setStore("commentFilterMatchIds", matchIds);
    setStore("commentFilterMatchIndex", 0);
    helpers.setOverlay(null);

    // Jump to first match in visible comments
    const visible = filterVisibleComments(store.comments);
    const idx = visible.findIndex((c) => c.id === matchIds[0]);
    if (idx >= 0) helpers.setHighlightedComment(idx);
  }

  function selectItem() {
    if (isCommentSearch()) selectCommentResult();
    else selectStoryResult();
  }

  function handleKeyDown(evt: any) {
    if (evt.name === "escape") {
      helpers.setOverlay(null);
      return;
    }
    if (evt.name === "return") {
      selectItem();
      return;
    }
    const maxIdx = isCommentSearch() ? commentMatches().length - 1 : storyDisplayItems().length - 1;
    if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      setSelectedIdx((i) => Math.min(i + 1, Math.max(0, maxIdx)));
      return;
    }
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      setSelectedIdx((i) => Math.max(i - 1, 0));
      return;
    }
  }

  const width = createMemo(() => Math.min(70, Math.max(40, Math.floor(dims().width * 0.6))));
  const height = createMemo(() => Math.min(20, Math.max(10, Math.floor(dims().height * 0.5))));

  return (
    <box
      position="absolute"
      width={dims().width}
      height={dims().height}
      justifyContent="center"
      alignItems="center"
      zIndex={3000}
    >
      <box
        flexDirection="column"
        width={width()}
        height={height()}
        border
        borderStyle="rounded"
        borderColor={theme.borderFocused}
        backgroundColor={theme.bgOverlay}
        title={isCommentSearch() ? " Search Comments " : " Search HN "}
        titleAlignment="center"
        padding={1}
      >
        <input
          width={width() - 4}
          placeholder={isCommentSearch() ? "Filter comments…" : "Search Hacker News…"}
          textColor={theme.fg}
          focused
          cursorStyle={{ style: "block", blinking: false }}
          onInput={(v: string) => onQueryChange(v)}
          onKeyDown={handleKeyDown}
        />
        <box height={1}>
          <Show when={!isCommentSearch() && searching()}>
            <text fg={theme.fgMuted}>{"Searching HN…"}</text>
          </Show>
          <Show when={!isCommentSearch() && !searching() && query().trim() && algoliaResults().length > 0}>
            <text fg={theme.fgFaint}>{`${algoliaResults().length} results from HN`}</text>
          </Show>
          <Show when={isCommentSearch() && query().trim()}>
            <text fg={theme.fgFaint}>{`${commentMatches().length} matches`}</text>
          </Show>
        </box>

        <scrollbox flexGrow={1} viewportCulling>
          <Show when={isCommentSearch()}>
            <For each={commentMatches()}>
              {(comment, idx) => (
                <box
                  id={`csearch-${idx()}`}
                  backgroundColor={idx() === selectedIdx() ? theme.bgSelected : undefined}
                  paddingX={1}
                  flexDirection="column"
                >
                  <text fg={idx() === selectedIdx() ? theme.accent : theme.link} attributes={1}>
                    {comment.by + "  · " + timeAgo(comment.time)}
                  </text>
                  <text fg={idx() === selectedIdx() ? theme.title : theme.fg}>
                    {stripHtml(comment.text).slice(0, 120) + (stripHtml(comment.text).length > 120 ? "…" : "")}
                  </text>
                </box>
              )}
            </For>
          </Show>
          <Show when={!isCommentSearch()}>
            <For each={storyDisplayItems()}>
              {(item, idx) => {
                if (!item) return null;
                const isAlgolia = () => "objectID" in item;
                const title = () => isAlgolia() ? (item as AlgoliaHit).title : (item as any).title;
                const meta = () => {
                  if (isAlgolia()) {
                    const h = item as AlgoliaHit;
                    return `▲ ${h.points}  · ${h.author} · ${h.num_comments} comments`;
                  }
                  const s = item as any;
                  return `▲ ${s.score}  · ${s.by} · ${s.descendants} comments`;
                };
                return (
                  <box
                    id={`ssearch-${idx()}`}
                    backgroundColor={idx() === selectedIdx() ? theme.bgSelected : undefined}
                    paddingX={1}
                    flexDirection="column"
                  >
                    <text
                      fg={idx() === selectedIdx() ? theme.title : theme.fg}
                      attributes={idx() === selectedIdx() ? 1 : 0}
                    >
                      {title()}
                    </text>
                    <text fg={theme.fgMuted}>
                      {meta()}
                    </text>
                  </box>
                );
              }}
            </For>
          </Show>
        </scrollbox>
      </box>
    </box>
  );
}
