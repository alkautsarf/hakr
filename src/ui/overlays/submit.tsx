import { useTerminalDimensions } from "@opentui/solid";
import { createSignal, createMemo } from "solid-js";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";
import { submitStory } from "../../api/write.ts";
import { getStoredCookie } from "../../auth/session.ts";

export function SubmitOverlay() {
  const dims = useTerminalDimensions();
  const { store, helpers } = useAppStore();
  const theme = useTheme();

  const [step, setStep] = createSignal<"title" | "url" | "text">("title");
  const [title, setTitle] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const width = createMemo(() => Math.min(70, Math.max(40, Math.floor(dims().width * 0.6))));

  function handleKeyDown(evt: any) {
    if (evt.name === "escape") {
      helpers.setOverlay(null);
    }
  }

  async function handleTitleSubmit(val: string) {
    setTitle(val);
    setStep("url");
  }

  async function handleUrlSubmit(val: string) {
    setUrl(val);
    // If no URL, go to text step for Ask HN / text posts
    if (!val) {
      setStep("text");
      return;
    }
    await doSubmit(title(), val, undefined);
  }

  async function handleTextSubmit(val: string) {
    await doSubmit(title(), undefined, val);
  }

  async function doSubmit(t: string, u?: string, text?: string) {
    if (!store.loggedInUser) {
      helpers.showToast("Login first (press L)", "error");
      helpers.setOverlay(null);
      return;
    }
    setSubmitting(true);
    try {
      const cookie = await getStoredCookie();
      if (!cookie) {
        helpers.showToast("No session — login first", "error");
        helpers.setOverlay(null);
        return;
      }
      const ok = await submitStory(cookie, t, u, text);
      if (ok) {
        helpers.showToast("Story submitted!", "success");
        helpers.setOverlay(null);
      } else {
        helpers.showToast("Submit failed", "error");
      }
    } catch (e: any) {
      helpers.showToast(`Error: ${e.message}`, "error");
    } finally {
      setSubmitting(false);
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
        height={10}
        border
        borderStyle="rounded"
        borderColor={theme.accent}
        backgroundColor={theme.bgOverlay}
        title=" Submit Story "
        titleAlignment="center"
        padding={1}
      >
        {step() === "title" ? (
          <>
            <text fg={theme.fgMuted}>{"Title:"}</text>
            <input
              width={width() - 4}
              placeholder="Your story title…"
              textColor={theme.fg}
              focused
              cursorStyle={{ style: "block", blinking: false }}
              onSubmit={handleTitleSubmit}
              onKeyDown={handleKeyDown}
            />
            <text fg={theme.fgFaint}>{"Enter to continue · Esc to cancel"}</text>
          </>
        ) : step() === "url" ? (
          <>
            <text fg={theme.fgMuted}>{`Title: ${title()}`}</text>
            <text fg={theme.fgMuted}>{"URL (leave empty for text post):"}</text>
            <input
              width={width() - 4}
              placeholder="https://…"
              textColor={theme.fg}
              focused
              cursorStyle={{ style: "block", blinking: false }}
              onSubmit={handleUrlSubmit}
              onKeyDown={handleKeyDown}
            />
          </>
        ) : (
          <>
            <text fg={theme.fgMuted}>{`Title: ${title()}`}</text>
            <text fg={theme.fgMuted}>
              {submitting() ? "Submitting…" : "Text (for Ask HN / text posts):"}
            </text>
            <input
              width={width() - 4}
              placeholder="Your text…"
              textColor={theme.fg}
              focused
              cursorStyle={{ style: "block", blinking: false }}
              onSubmit={handleTextSubmit}
              onKeyDown={handleKeyDown}
            />
          </>
        )}
      </box>
    </box>
  );
}
