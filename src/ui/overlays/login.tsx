import { useTerminalDimensions } from "@opentui/solid";
import { createSignal, createMemo } from "solid-js";
import { useAppStore } from "../state.tsx";
import { useTheme } from "../theme.tsx";
import { login } from "../../api/write.ts";
import { fetchUser } from "../../api/read.ts";
import { storeCookie, clearSession } from "../../auth/session.ts";

export function LoginOverlay() {
  const dims = useTerminalDimensions();
  const { store, helpers } = useAppStore();
  const theme = useTheme();

  const isLoggedIn = () => !!store.loggedInUser;
  const [step, setStep] = createSignal<"confirm-logout" | "username" | "password">(
    isLoggedIn() ? "confirm-logout" : "username",
  );
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const width = createMemo(() => Math.min(50, Math.max(30, Math.floor(dims().width * 0.4))));

  function handleLogoutKeyDown(evt: any) {
    if (evt.name === "escape" || evt.name === "n") {
      helpers.setOverlay(null);
      return;
    }
    if (evt.name === "y" || evt.name === "return") {
      clearSession();
      helpers.setLoggedInUser(null);
      helpers.setUserKarma(null);
      helpers.setOverlay(null);
      helpers.showToast("Logged out", "info");
      return;
    }
  }

  function handleUsernameKeyDown(evt: any) {
    if (evt.name === "escape") {
      helpers.setOverlay(null);
    }
  }

  function handlePasswordKeyDown(evt: any) {
    evt.preventDefault();
    if (evt.name === "escape") {
      helpers.setOverlay(null);
      return;
    }
    if (evt.name === "return") {
      handlePasswordSubmit(password());
      return;
    }
    if (evt.name === "backspace") {
      setPassword((p) => p.slice(0, -1));
      return;
    }
    // Single printable character
    if (evt.name && evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      setPassword((p) => p + evt.name);
    }
  }

  function handleUsernameSubmit(val: string) {
    setUsername(val);
    setStep("password");
  }

  async function handlePasswordSubmit(pw: string) {
    setSubmitting(true);
    try {
      const cookie = await login(username(), pw);
      if (cookie) {
        await storeCookie(cookie);
        const user = cookie.split("&")[0] ?? username();
        helpers.setLoggedInUser(user);
        helpers.setOverlay(null);
        helpers.showToast(`Logged in as ${user}`, "success");
        // Fetch karma in background
        fetchUser(user).then((profile) => {
          if (profile) helpers.setUserKarma(profile.karma);
        });
      } else {
        helpers.showToast("Login failed — check credentials", "error");
        setPassword("");
        setStep("username");
      }
    } catch (e: any) {
      helpers.showToast(`Login error: ${e.message}`, "error");
      setPassword("");
      setStep("username");
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
        height={8}
        border
        borderStyle="rounded"
        borderColor={theme.borderFocused}
        backgroundColor={theme.bgOverlay}
        title={step() === "confirm-logout" ? " Logout " : " Login to HN "}
        titleAlignment="center"
        padding={1}
      >
        {step() === "confirm-logout" ? (
          <box flexDirection="column">
            <text fg={theme.fg}>
              {"Logged in as " + store.loggedInUser}
            </text>
            <text fg={theme.fgMuted}>
              {"Logout? (y/n)"}
            </text>
            {/* Hidden input for key capture */}
            <box position="absolute" top={-100} left={-100} width={1} height={1}>
              <input focused onKeyDown={handleLogoutKeyDown} />
            </box>
          </box>
        ) : step() === "username" ? (
          <box flexDirection="column">
            <text fg={theme.fgMuted}>{"Username:"}</text>
            <input
              width={width() - 4}
              placeholder="your HN username"
              textColor={theme.fg}
              focused
              cursorStyle={{ style: "block", blinking: false }}
              onSubmit={handleUsernameSubmit}
              onKeyDown={handleUsernameKeyDown}
            />
          </box>
        ) : (
          <box flexDirection="column">
            <text fg={theme.fgMuted}>
              {submitting() ? "Logging in…" : `Password for ${username()}:`}
            </text>
            <text fg={theme.fg}>
              {"•".repeat(password().length) + "█"}
            </text>
            {/* Hidden input for key capture — builds password manually */}
            <box position="absolute" top={-100} left={-100} width={1} height={1}>
              <input focused onKeyDown={handlePasswordKeyDown} />
            </box>
          </box>
        )}
      </box>
    </box>
  );
}
