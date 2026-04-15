import { For, Show, createMemo } from "solid-js";
import { useTerminalDimensions } from "@opentui/solid";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";
import { CommentItemRow } from "./comment-item.tsx";
import { ReplyInput } from "./reply-input.tsx";
import { timeAgo, extractDomain, filterVisibleComments } from "../utils.ts";

interface CommentPaneProps {
  scrollRef?: (el: any) => void;
}

export function CommentPane(props: CommentPaneProps) {
  const { store } = useAppStore();
  const theme = useTheme();
  const dims = useTerminalDimensions();

  const story = createMemo(() => {
    if (!store.selectedStoryId) return null;
    return store.stories[store.selectedStoryId] ?? null;
  });

  const visibleComments = createMemo(() => {
    return filterVisibleComments(store.comments);
  });

  return (
    <box flexDirection="column" flexGrow={1}>
      <Show
        when={story()}
        fallback={
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg={theme.fgFaint}>
              {"← select a story"}
            </text>
          </box>
        }
      >
        {(s) => (
          <box flexDirection="column" flexGrow={1}>
            {/* Story header — each row in its own fixed-height box */}
            <box height={1} flexShrink={0} paddingX={1}>
              <text fg={theme.title} attributes={1}>
                {s().title}
              </text>
            </box>
            <box height={1} flexShrink={0} paddingX={1}>
              <text fg={theme.fgMuted}>
                {"▲ " + s().score + " · " +
                  (s().url ? extractDomain(s().url!) : "self") +
                  " · " + s().by + " · " + timeAgo(s().time) +
                  " · " + s().descendants + " comments"}
              </text>
            </box>
            <box height={1} flexShrink={0}>
              <text fg={theme.fgFaint}>
                {"─".repeat(dims().width)}
              </text>
            </box>

            {/* Comments */}
            <Show
              when={!store.loadingComments}
              fallback={
                <box flexGrow={1} justifyContent="center" alignItems="center">
                  <text fg={theme.fgMuted}>{"Loading comments…"}</text>
                </box>
              }
            >
              <scrollbox
                ref={props.scrollRef}
                flexGrow={1}
                stickyScroll={false}
              >
                <For each={visibleComments()}>
                  {(comment, idx) => (
                    <box id={`comment-${comment.id}`}>
                      <CommentItemRow
                        comment={comment}
                        selected={idx() === store.highlightedCommentIndex}
                      />
                    </box>
                  )}
                </For>
              </scrollbox>
            </Show>

            {/* Reply input — appears at bottom when in insert mode */}
            <ReplyInput />
          </box>
        )}
      </Show>
    </box>
  );
}
