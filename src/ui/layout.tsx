import { Show } from "solid-js";
import { useTerminalDimensions } from "@opentui/solid";
import { useAppStore } from "./state.tsx";
import { useTheme } from "./theme.tsx";
import { Header } from "./components/header.tsx";
import { StoryList } from "./components/story-list.tsx";
import { CommentPane } from "./components/comment-pane.tsx";
import { StatusBar } from "./components/status-bar.tsx";
import { HelpOverlay } from "./overlays/help.tsx";
import { SearchOverlay } from "./overlays/search.tsx";
import { LoginOverlay } from "./overlays/login.tsx";
import { SubmitOverlay } from "./overlays/submit.tsx";

interface LayoutProps {
  storyListScrollRef: (el: any) => void;
  commentScrollRef: (el: any) => void;
}

export function Layout(props: LayoutProps) {
  const { store } = useAppStore();
  const theme = useTheme();
  const dims = useTerminalDimensions();

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Header />

      {/* Main content — split pane */}
      <box flexDirection="row" flexGrow={1}>
        {/* Left pane: story list */}
        <box
          width={store.selectedStoryId ? "35%" : undefined}
          flexGrow={store.selectedStoryId ? 0 : 1}
          flexDirection="column"
          flexShrink={0}
        >
          <StoryList scrollRef={props.storyListScrollRef} />
        </box>

        {/* Separator */}
        <Show when={store.selectedStoryId}>
          <box width={1}>
            <text fg={theme.fgFaint}>
              {Array.from({ length: Math.max(dims().height - 3, 1) }, () => "│").join("\n")}
            </text>
          </box>
        </Show>

        {/* Right pane: comments */}
        <Show when={store.selectedStoryId}>
          <box flexGrow={1} flexDirection="column">
            <CommentPane scrollRef={props.commentScrollRef} />
          </box>
        </Show>
      </box>

      {/* Status bar */}
      <StatusBar />

      {/* Overlays */}
      <Show when={store.overlay?.type === "help"}>
        <HelpOverlay />
      </Show>
      <Show when={store.overlay?.type === "search"}>
        <SearchOverlay />
      </Show>
      <Show when={store.overlay?.type === "login"}>
        <LoginOverlay />
      </Show>
      <Show when={store.overlay?.type === "submit"}>
        <SubmitOverlay />
      </Show>
    </box>
  );
}
