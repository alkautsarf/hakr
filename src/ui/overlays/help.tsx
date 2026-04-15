import { useTerminalDimensions } from "@opentui/solid";
import { createMemo } from "solid-js";
import { useTheme } from "../theme.tsx";

const HELP_SECTIONS = [
  { title: "Navigation", keys: [
    ["j / k", "Move down / up"],
    ["h / l", "Switch pane / feed"],
    ["gg / G", "Jump to top / bottom"],
    ["Tab", "Cycle focus zones"],
    ["Enter", "Open story / toggle collapse"],
    ["Esc", "Go back / close overlay"],
    ["Ctrl+D/U", "Page down / up"],
  ]},
  { title: "Actions", keys: [
    ["u", "Upvote story or comment"],
    ["r", "Reply to highlighted comment"],
    ["c", "Comment on story (top-level)"],
    ["o", "Open URL in browser"],
    ["s", "Submit new story"],
    ["R", "Refresh feed / comments"],
    ["L", "Login / Logout"],
  ]},
  { title: "Search & Overlays", keys: [
    ["/", "Search stories"],
    ["?", "Show this help"],
    ["q", "Quit / close pane"],
    ["Ctrl+C", "Force quit"],
  ]},
];

export function HelpOverlay() {
  const dims = useTerminalDimensions();
  const theme = useTheme();

  const width = createMemo(() => Math.min(60, Math.max(40, Math.floor(dims().width * 0.6))));
  const height = createMemo(() => Math.min(28, Math.max(16, Math.floor(dims().height * 0.8))));

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
        title=" Keybindings "
        titleAlignment="center"
        padding={1}
      >
        <scrollbox flexGrow={1}>
          {HELP_SECTIONS.map((section) => (
            <box flexDirection="column" marginBottom={1}>
              <text fg={theme.accent} attributes={1}>
                {section.title}
              </text>
              {section.keys.map(([key, desc]) => (
                <box flexDirection="row">
                  <box width={16}>
                    <text fg={theme.warning}>{`  ${key}`}</text>
                  </box>
                  <text fg={theme.fg}>{desc}</text>
                </box>
              ))}
            </box>
          ))}
        </scrollbox>
      </box>
    </box>
  );
}
