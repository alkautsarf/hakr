import { For, Show, createMemo } from "solid-js";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";
import { StoryItemRow } from "./story-item.tsx";

interface StoryListProps {
  scrollRef?: (el: any) => void;
}

export function StoryList(props: StoryListProps) {
  const { store } = useAppStore();
  const theme = useTheme();

  const visibleStories = createMemo(() => {
    return store.loadedStoryIds
      .map((id) => store.stories[id])
      .filter((s): s is NonNullable<typeof s> => !!s);
  });

  return (
    <box flexDirection="column" flexGrow={1}>
      <Show
        when={visibleStories().length > 0}
        fallback={
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg={theme.fgMuted}>
              {store.loading ? "Loading stories…" : "No stories — press R to refresh"}
            </text>
          </box>
        }
      >
        <scrollbox
          ref={props.scrollRef}
          flexGrow={1}
          stickyScroll={false}
          viewportCulling
        >
          <For each={visibleStories()}>
            {(story, idx) => (
              <box id={`story-${story.id}`}>
                <StoryItemRow
                  story={story}
                  rank={idx() + 1}
                  selected={idx() === store.highlightedStoryIndex}
                  upvoted={store.upvotedIds.has(story.id)}
                />
              </box>
            )}
          </For>
          <Show when={store.loadingMoreStories}>
            <box paddingX={1} height={1}>
              <text fg={theme.fgMuted}>{"Loading more stories…"}</text>
            </box>
          </Show>
        </scrollbox>
      </Show>
    </box>
  );
}
