import { createMemo } from "solid-js";
import { useTheme } from "../theme.tsx";
import { timeAgo, extractDomain } from "../utils.ts";
import type { StoryItem as StoryItemType } from "../types.ts";

interface StoryItemProps {
  story: StoryItemType;
  rank: number;
  selected: boolean;
  upvoted: boolean;
}

export function StoryItemRow(props: StoryItemProps) {
  const theme = useTheme();

  const domain = createMemo(() =>
    props.story.url ? extractDomain(props.story.url) : "self",
  );

  const rankStr = createMemo(() => {
    const r = String(props.rank);
    return r.length === 1 ? ` ${r}` : r;
  });

  return (
    <box
      flexDirection="column"
      backgroundColor={props.selected ? theme.bgSelected : undefined}
      paddingX={1}
    >
      {/* Line 1: rank  ▲ score  title */}
      <box flexDirection="row" gap={1}>
        <text fg={theme.fgFaint}>
          {rankStr() + "."}
        </text>
        <text fg={props.upvoted ? theme.accent : theme.fgFaint}>
          {"▲"}
        </text>
        <text fg={props.upvoted ? theme.accent : theme.fgMuted}>
          {String(props.story.score)}
        </text>
        <text fg={props.selected ? theme.title : theme.fg} attributes={props.selected ? 1 : 0}>
          {props.story.title}
        </text>
      </box>
      {/* Line 2: domain · by · time · comments */}
      <box flexDirection="row" paddingLeft={6}>
        <text fg={theme.fgMuted}>
          {`${domain()}  ·  ${props.story.by}  ·  ${timeAgo(props.story.time)}  ·  ${props.story.descendants} comments`}
        </text>
      </box>
    </box>
  );
}
