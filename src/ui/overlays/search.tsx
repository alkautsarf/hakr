import { useTerminalDimensions } from "@opentui/solid";
import { createSignal, createMemo, For } from "solid-js";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";

export function SearchOverlay() {
  const dims = useTerminalDimensions();
  const { store, helpers } = useAppStore();
  const theme = useTheme();

  const [query, setQuery] = createSignal("");
  const [selectedIdx, setSelectedIdx] = createSignal(0);

  const filtered = createMemo(() => {
    const q = query().toLowerCase();
    if (!q) return store.loadedStoryIds.map((id) => store.stories[id]).filter(Boolean);
    return store.loadedStoryIds
      .map((id) => store.stories[id])
      .filter((s) => s && s.title.toLowerCase().includes(q));
  });

  const width = createMemo(() => Math.min(70, Math.max(40, Math.floor(dims().width * 0.6))));
  const height = createMemo(() => Math.min(20, Math.max(10, Math.floor(dims().height * 0.5))));

  function handleKeyDown(evt: any) {
    if (evt.name === "escape") {
      helpers.setOverlay(null);
      return;
    }
    if (evt.name === "return") {
      const items = filtered();
      const item = items[selectedIdx()];
      if (item) {
        helpers.setOverlay(null);
        const idx = store.loadedStoryIds.indexOf(item.id);
        if (idx >= 0) helpers.setHighlightedStory(idx);
        helpers.selectStory(item.id);
      }
      return;
    }
    if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      setSelectedIdx((i) => Math.min(i + 1, filtered().length - 1));
      return;
    }
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      setSelectedIdx((i) => Math.max(i - 1, 0));
      return;
    }
  }

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
        title=" Search Stories "
        titleAlignment="center"
        padding={1}
      >
        <input
          width={width() - 4}
          placeholder="Type to filter…"
          textColor={theme.fg}
          focused
          cursorStyle={{ style: "block", blinking: false }}
          onInput={(v: string) => {
            setQuery(v);
            setSelectedIdx(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <box height={1} />
        <scrollbox flexGrow={1} viewportCulling>
          <For each={filtered()}>
            {(story, idx) => (
              <box
                id={`search-${idx()}`}
                backgroundColor={idx() === selectedIdx() ? theme.bgSelected : undefined}
                paddingX={1}
              >
                <text
                  fg={idx() === selectedIdx() ? theme.title : theme.fg}
                  attributes={idx() === selectedIdx() ? 1 : 0}
                >
                  {story!.title}
                </text>
              </box>
            )}
          </For>
        </scrollbox>
      </box>
    </box>
  );
}
