import { For, createMemo } from "solid-js";
import { useTerminalDimensions } from "@opentui/solid";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";
import type { FeedType } from "../types.ts";

const FEEDS: { label: string; value: FeedType }[] = [
  { label: "Top", value: "top" },
  { label: "New", value: "new" },
  { label: "Best", value: "best" },
  { label: "Show", value: "show" },
  { label: "Ask", value: "ask" },
  { label: "Jobs", value: "jobs" },
];

export function Header() {
  const { store } = useAppStore();
  const theme = useTheme();

  const tabsText = createMemo(() => {
    return FEEDS.map((f) => ({
      ...f,
      active: f.value === store.feed,
    }));
  });

  const dims = useTerminalDimensions();

  return (
    <box flexDirection="column" height={2}>
      <box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <box flexDirection="row" gap={2}>
          <text fg={theme.accent} attributes={1}>
            {"hakr"}
          </text>
          <For each={tabsText()}>
            {(tab) => (
              <text
                fg={tab.active ? theme.accent : theme.fgMuted}
                attributes={tab.active ? 1 : 2}
              >
                {tab.label}
              </text>
            )}
          </For>
        </box>
        <box flexDirection="row" gap={1}>
          {store.loggedInUser ? (
            <text fg={theme.fgMuted}>
              {store.loggedInUser +
                (store.userKarma !== null ? " · " + store.userKarma + " karma" : "")}
            </text>
          ) : (
            <text fg={theme.fgFaint}>
              {"not logged in (L to login)"}
            </text>
          )}
        </box>
      </box>
      <box height={1}>
        <text fg={theme.fgFaint}>
          {"─".repeat(dims().width)}
        </text>
      </box>
    </box>
  );
}
