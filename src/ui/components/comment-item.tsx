import { createMemo, Show } from "solid-js";
import { useTheme } from "../theme.tsx";
import { timeAgo, stripHtml } from "../utils.ts";
import type { CommentItem as CommentItemType } from "../types.ts";

interface CommentItemProps {
  comment: CommentItemType;
  selected: boolean;
  upvoted: boolean;
  totalReplies: number;
}

export function CommentItemRow(props: CommentItemProps) {
  const theme = useTheme();

  const depthColor = createMemo(
    () => theme.threadColors[props.comment.depth % theme.threadColors.length] ?? theme.fgFaint,
  );

  const bodyText = createMemo(() => stripHtml(props.comment.text));

  const indent = createMemo(() => {
    if (props.comment.depth === 0) return "";
    return " ".repeat(props.comment.depth);
  });

  return (
    <box
      flexDirection="column"
      backgroundColor={props.selected ? theme.bgSelected : undefined}
      paddingX={1}
    >
      {/* Header: indent + author + time */}
      <box flexDirection="row">
        <Show when={props.comment.depth > 0}>
          <text fg={depthColor()}>
            {indent()}
          </text>
        </Show>
        <Show when={props.upvoted}>
          <text fg={theme.accent}>{"▲ "}</text>
        </Show>
        <text fg={props.selected ? theme.accent : theme.link} attributes={1}>
          {props.comment.by}
        </text>
        <text fg={theme.fgFaint}>
          {"  · " + timeAgo(props.comment.time)}
        </text>
      </box>
      {/* Body with left border for nested comments */}
      <box flexDirection="row">
        <Show when={props.comment.depth > 0}>
          <text fg={depthColor()}>
            {indent() + "▎"}
          </text>
        </Show>
        <text fg={theme.fg}>
          {bodyText()}
        </text>
      </box>
      {/* Collapsed replies indicator */}
      <Show when={props.comment.collapsed && props.totalReplies > 0}>
        <box flexDirection="row">
          <Show when={props.comment.depth > 0}>
            <text fg={depthColor()}>
              {indent()}
            </text>
          </Show>
          <text fg={theme.fgFaint}>
            {`\n ↩ ${props.totalReplies} ${props.totalReplies === 1 ? "reply" : "replies"} hidden`}
          </text>
        </box>
      </Show>
      {/* Separator after top-level comments */}
      <Show when={props.comment.depth === 0}>
        <box height={1}>
          <text fg={theme.fgFaint}>
            {"▁".repeat(70)}
          </text>
        </box>
      </Show>
      <Show when={props.comment.depth > 0}>
        <box height={1} />
      </Show>
    </box>
  );
}
