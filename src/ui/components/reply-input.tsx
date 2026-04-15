import { createSignal, Show, createMemo } from "solid-js";
import { useTerminalDimensions } from "@opentui/solid";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";
import { submitComment } from "../../api/write.ts";
import { getStoredCookie } from "../../auth/session.ts";

export function ReplyInput() {
  const { store, helpers } = useAppStore();
  const theme = useTheme();
  const dims = useTerminalDimensions();

  const [text, setText] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const isVisible = () => store.mode === "insert" && store.focusZone === "input" && store.replyTargetId !== null;

  const isTopLevel = createMemo(() => store.replyTargetId === store.selectedStoryId);

  const label = createMemo(() => {
    if (isTopLevel()) return "Comment on story:";
    const comment = store.comments.find((c) => c.id === store.replyTargetId);
    return comment ? `Reply to ${comment.by}:` : "Reply:";
  });

  function handleKeyDown(evt: any) {
    if (evt.name === "escape") {
      helpers.setReplyTarget(null);
      helpers.setMode("normal");
      helpers.setFocusZone("comments");
      setText("");
      return;
    }
  }

  async function handleSubmit(val: string) {
    const content = val || text();
    if (!content.trim()) return;
    if (!store.replyTargetId) return;

    setSubmitting(true);
    try {
      const cookie = await getStoredCookie();
      if (!cookie) {
        helpers.showToast("No session — login first", "error");
        return;
      }
      const ok = await submitComment(cookie, store.replyTargetId, content.trim());
      if (ok) {
        helpers.showToast("Comment posted!", "success");
        setText("");
        helpers.setReplyTarget(null);
        helpers.setMode("normal");
        helpers.setFocusZone("comments");
      } else {
        helpers.showToast("Failed to post comment", "error");
      }
    } catch (e: any) {
      helpers.showToast(`Error: ${e.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Show when={isVisible()}>
      <box flexDirection="column" height={4} flexShrink={0} paddingX={1}>
        <box height={1}>
          <text fg={theme.fgFaint}>
            {"─".repeat(dims().width)}
          </text>
        </box>
        <text fg={theme.accent}>
          {submitting() ? "Posting…" : label()}
        </text>
        <textarea
          width="100%"
          minHeight={1}
          maxHeight={2}
          placeholder="Write your comment… (Enter to submit, Esc to cancel)"
          placeholderColor={theme.fgFaint}
          textColor={theme.fg}
          wrapMode="word"
          focused
          cursorStyle={{ style: "block", blinking: false }}
          keyBindings={[
            { name: "return", action: "submit" },
            { name: "return", meta: true, action: "newline" },
            { name: "return", ctrl: true, action: "newline" },
          ]}
          onKeyDown={handleKeyDown}
          onSubmit={handleSubmit}
        />
      </box>
    </Show>
  );
}
