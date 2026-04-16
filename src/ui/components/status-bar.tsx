import { createMemo } from "solid-js";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";

export function StatusBar() {
  const { store } = useAppStore();
  const theme = useTheme();

  const modeColor = createMemo(() => {
    switch (store.mode) {
      case "normal":
        return theme.modeNormal;
      case "insert":
        return theme.modeInsert;
      case "search":
        return theme.modeSearch;
    }
  });

  const modeLabel = createMemo(() => {
    switch (store.mode) {
      case "normal":
        return " NORMAL ";
      case "insert":
        return " INSERT ";
      case "search":
        return " SEARCH ";
    }
  });

  const hints = createMemo(() => {
    if (store.overlay) return "esc:close";

    switch (store.focusZone) {
      case "stories":
        return "j/k:nav  enter:open  u:upvote  o:url  p:profile  /:search  s:submit  R:refresh  ?:help";
      case "comments":
        if (store.commentFilter) return "n/N:next/prev match  Esc:clear filter  j/k:nav  /:search  ?:help";
        return "j/k:nav  r:reply  u:upvote  p:profile  l:collapse  /:search  R:refresh  h:back  ?:help";
      case "input":
        return "esc:cancel  ctrl+enter:submit";
    }
  });

  const toastDisplay = createMemo(() => {
    const t = store.toast;
    if (!t) return null;
    const bg = t.level === "error" ? theme.error : t.level === "success" ? theme.success : theme.modeNormal;
    return { message: t.message, bg };
  });

  return (
    <box flexDirection="row" height={1} justifyContent="space-between" paddingX={1}>
      <box flexDirection="row" gap={1}>
        <text bg={modeColor()} fg="#000000" attributes={1}>
          {modeLabel()}
        </text>
        <text fg={store.loggedInUser ? theme.success : theme.fgFaint}>
          {"●"}
        </text>
        <text fg={theme.fgMuted}>
          {store.feed.toUpperCase()}
        </text>
      </box>
      {toastDisplay() ? (
        <text bg={toastDisplay()!.bg} fg="#000000" attributes={1}>
          {" " + toastDisplay()!.message + " "}
        </text>
      ) : (
        <text fg={theme.fgFaint}>{hints()}</text>
      )}
    </box>
  );
}
