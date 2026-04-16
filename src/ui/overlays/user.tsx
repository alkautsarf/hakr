import { useTerminalDimensions } from "@opentui/solid";
import { createSignal, createMemo, onMount, Show } from "solid-js";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";
import { fetchUser } from "../../api/read.ts";
import { stripHtml, timeAgo } from "../utils.ts";
import type { HNUser } from "../types.ts";

export function UserOverlay() {
  const dims = useTerminalDimensions();
  const { store, helpers } = useAppStore();
  const theme = useTheme();

  const [user, setUser] = createSignal<HNUser | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const userId = createMemo(() => {
    if (store.overlay?.type === "user") return store.overlay.userId;
    return null;
  });

  onMount(async () => {
    const id = userId();
    if (!id) return;
    try {
      const profile = await fetchUser(id);
      if (profile) setUser(profile);
      else setError("User not found");
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  });

  const joinDate = createMemo(() => {
    const u = user();
    if (!u) return "";
    return new Date(u.created * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  const about = createMemo(() => {
    const u = user();
    if (!u?.about) return null;
    return stripHtml(u.about);
  });

  const isSelf = createMemo(() => userId() === store.loggedInUser);

  const width = createMemo(() => Math.min(60, Math.max(40, Math.floor(dims().width * 0.5))));
  const height = createMemo(() => Math.min(18, Math.max(10, Math.floor(dims().height * 0.5))));

  function handleKeyDown(evt: any) {
    if (evt.name === "escape" || evt.name === "q") {
      helpers.setOverlay(null);
      return;
    }
    if (evt.name === "o") {
      const id = userId();
      if (!id) return;
      const url = `https://news.ycombinator.com/user?id=${id}`;
      const browser = process.env.BROWSER;
      const cmd = browser?.includes("qutebrowser")
        ? `${browser} --target tab "${url}"`
        : `${browser ?? "open"} "${url}"`;
      import("child_process").then(({ exec }) => exec(cmd));
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
        title={isSelf() ? " Your Profile " : " User Profile "}
        titleAlignment="center"
        padding={1}
      >
        <box position="absolute" top={-100} left={-100} width={1} height={1}>
          <input
            height={1}
            width={1}
            focused
            cursorStyle={{ style: "block", blinking: false }}
            onKeyDown={handleKeyDown}
          />
        </box>
        <Show when={loading()}>
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg={theme.fgMuted}>{"Loading profile…"}</text>
          </box>
        </Show>
        <Show when={error()}>
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg={theme.error}>{error()}</text>
          </box>
        </Show>
        <Show when={!loading() && !error() && user()}>
          <scrollbox flexGrow={1}>
            <box flexDirection="column">
              {/* Username */}
              <box flexDirection="row">
                <text fg={theme.accent} attributes={1}>
                  {user()!.id}
                </text>
                <Show when={isSelf()}>
                  <text fg={theme.success}>{"  (you)"}</text>
                </Show>
              </box>
              <box height={1} />

              {/* Karma */}
              <box flexDirection="row">
                <text fg={theme.fgMuted}>{"karma  "}</text>
                <text fg={theme.fg} attributes={1}>{String(user()!.karma)}</text>
              </box>

              {/* Join date */}
              <box flexDirection="row">
                <text fg={theme.fgMuted}>{"since  "}</text>
                <text fg={theme.fg}>{joinDate()}</text>
              </box>

              {/* Submissions count */}
              <Show when={user()!.submitted?.length}>
                <box flexDirection="row">
                  <text fg={theme.fgMuted}>{"posts  "}</text>
                  <text fg={theme.fg}>{String(user()!.submitted!.length)}</text>
                </box>
              </Show>

              {/* About */}
              <Show when={about()}>
                <box height={1} />
                <text fg={theme.fgMuted}>{"about"}</text>
                <text fg={theme.fg}>{about()}</text>
              </Show>

              <box height={1} />
              <text fg={theme.fgFaint}>{"o:open in browser  esc:close"}</text>
            </box>
          </scrollbox>
        </Show>
      </box>
    </box>
  );
}
