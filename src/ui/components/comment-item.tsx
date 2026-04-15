import { createMemo, Show } from "solid-js";
import { useTheme } from "../theme.tsx";
import { timeAgo, stripHtml } from "../utils.ts";
import type { CommentItem as CommentItemType } from "../types.ts";

interface CommentItemProps {
  comment: CommentItemType;
  selected: boolean;
}

export function CommentItemRow(props: CommentItemProps) {
  const theme = useTheme();

  const threadColor = createMemo(
    () => theme.threadColors[props.comment.depth % theme.threadColors.length] ?? theme.fgFaint,
  );

  const bodyText = createMemo(() => stripHtml(props.comment.text));

  const threadBar = createMemo(() => {
    if (props.comment.depth === 0) return "";
    let bar = "";
    for (let i = 0; i < props.comment.depth; i++) {
      const color = theme.threadColors[i % theme.threadColors.length];
      bar += "┃ ";
    }
    return bar;
  });

  return (
    <box
      flexDirection="column"
      backgroundColor={props.selected ? theme.bgSelected : undefined}
      paddingX={1}
    >
      {/* Header: thread bars + author + time */}
      <box flexDirection="row">
        <Show when={props.comment.depth > 0}>
          <text fg={threadColor()}>
            {threadBar()}
          </text>
        </Show>
        <text fg={props.selected ? theme.accent : theme.link} attributes={1}>
          {props.comment.by}
        </text>
        <text fg={theme.fgFaint}>
          {"  · " + timeAgo(props.comment.time) +
            (props.comment.collapsed
              ? `  [+${props.comment.kids?.length ?? 0} replies]`
              : "")}
        </text>
      </box>
      {/* Body — only show if not collapsed */}
      <Show when={!props.comment.collapsed}>
        <box flexDirection="row">
          <Show when={props.comment.depth > 0}>
            <text fg={threadColor()}>
              {threadBar()}
            </text>
          </Show>
          <text fg={theme.fg}>
            {bodyText()}
          </text>
        </box>
        <box height={1} />
      </Show>
    </box>
  );
}
