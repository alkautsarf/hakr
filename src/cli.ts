import { fetchStoryIds, fetchStories, fetchItem, fetchCommentTree, fetchUser } from "./api/read.ts";
import { login as apiLogin, submitStory, submitComment, upvote as apiUpvote } from "./api/write.ts";
import { getStoredCookie, getStoredUsername, storeCookie, clearSession } from "./auth/session.ts";
import { stripHtml, timeAgo, extractDomain } from "./ui/utils.ts";
import type { FeedType } from "./ui/types.ts";

const VERSION = "0.2.0";
const FEEDS = ["top", "new", "best", "show", "ask", "jobs"];

function parseArgs(args: string[]): { command: string; flags: Record<string, string>; positional: string[] } {
  const command = args[0] ?? "help";
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, flags, positional };
}

async function requireAuth(): Promise<string> {
  const cookie = await getStoredCookie();
  if (!cookie) {
    console.error("Not logged in. Run: hakr login --user <username> --pass <password>");
    process.exit(1);
  }
  return cookie;
}

async function cmdLogin(flags: Record<string, string>) {
  const user = flags.user ?? flags.u;
  const pass = flags.pass ?? flags.p;
  if (!user || !pass) {
    console.error("Usage: hakr login --user <username> --pass <password>");
    process.exit(1);
  }
  const cookie = await apiLogin(user, pass);
  if (cookie) {
    await storeCookie(cookie);
    const username = cookie.split("&")[0] ?? user;
    console.log(`✓ Logged in as ${username}`);
  } else {
    console.error("✗ Login failed — check credentials");
    process.exit(1);
  }
}

async function cmdLogout() {
  await clearSession();
  console.log("✓ Logged out");
}

async function cmdWhoami() {
  const username = await getStoredUsername();
  if (!username) {
    console.log("Not logged in");
    return;
  }
  const profile = await fetchUser(username);
  if (profile) {
    console.log(`${profile.id} · ${profile.karma} karma · joined ${new Date(profile.created * 1000).toLocaleDateString()}`);
    if (profile.about) console.log(`About: ${stripHtml(profile.about)}`);
  } else {
    console.log(username);
  }
}

async function cmdStories(flags: Record<string, string>) {
  const feed = (flags.feed ?? "top") as FeedType;
  if (!FEEDS.includes(feed)) {
    console.error(`Invalid feed: ${feed}. Use: ${FEEDS.join(", ")}`);
    process.exit(1);
  }
  const limit = parseInt(flags.limit ?? "30", 10);
  const ids = await fetchStoryIds(feed);
  const stories = await fetchStories(ids.slice(0, limit));

  for (let i = 0; i < stories.length; i++) {
    const s = stories[i]!;
    const domain = s.url ? extractDomain(s.url) : "self";
    console.log(`${i + 1}. [${s.id}] ▲ ${s.score}  ${s.title}`);
    console.log(`   ${domain} · ${s.by} · ${timeAgo(s.time)} · ${s.descendants} comments`);
  }
}

async function cmdStatus(flags: Record<string, string>) {
  const id = parseInt(flags.id ?? "0", 10);
  if (!id) {
    // Find latest story by logged-in user
    const username = await getStoredUsername();
    if (!username) {
      console.error("Usage: hakr status --id <story_id>  (or login first to check your latest)");
      process.exit(1);
    }
    const profile = await fetchUser(username);
    if (!profile?.submitted?.length) {
      console.error("No submissions found");
      process.exit(1);
    }
    // Find latest story (not comment) — fetch in parallel
    const items = await Promise.all(profile.submitted.slice(0, 20).map(fetchItem));
    const story = items.find((item) => item && (item.type === "story" || item.type === "job"));
    if (story) return cmdStatusById(story.id);
    console.error("No recent stories found");
    process.exit(1);
  }
  await cmdStatusById(id);
}

async function cmdStatusById(id: number) {
  const item = await fetchItem(id);
  if (!item) {
    console.error(`Story ${id} not found`);
    process.exit(1);
  }

  console.log(`${item.title}`);
  console.log(`▲ ${item.score} · ${item.descendants} comments · ${item.by} · ${timeAgo(item.time)}`);

  // Check rank on front page
  const topIds = await fetchStoryIds("top");
  const topRank = topIds.indexOf(id);
  if (topRank >= 0) {
    console.log(`📍 #${topRank + 1} on front page`);
  } else {
    console.log(`Not on front page`);
  }

  // Check Show HN rank if applicable
  if (item.title.toLowerCase().includes("show hn")) {
    const showIds = await fetchStoryIds("show");
    const showRank = showIds.indexOf(id);
    if (showRank >= 0) {
      console.log(`📍 #${showRank + 1} on Show HN`);
    }
  }
}

async function cmdComments(flags: Record<string, string>) {
  const id = parseInt(flags.id ?? "0", 10);
  if (!id) {
    console.error("Usage: hakr comments --id <story_id>");
    process.exit(1);
  }

  const item = await fetchItem(id);
  if (!item) {
    console.error(`Item ${id} not found`);
    process.exit(1);
  }

  console.log(`${item.title ?? "Comment thread"}`);
  console.log(`▲ ${item.score} · ${item.descendants} comments`);
  console.log("─".repeat(60));

  if (!item.kids?.length) {
    console.log("No comments yet");
    return;
  }

  const comments = await fetchCommentTree(item.kids, 5);
  for (let i = 0; i < comments.length; i++) {
    const c = comments[i]!;
    const indent = "  ".repeat(c.depth);
    const bar = c.depth > 0 ? "┃ ".repeat(c.depth) : "";
    const body = stripHtml(c.text);
    const truncated = body.length > 300 ? body.slice(0, 300) + "…" : body;
    console.log(`${indent}${bar}[${i + 1}] ${c.by} · ${timeAgo(c.time)} [id:${c.id}]`);
    console.log(`${indent}${bar}${truncated}`);
    console.log();
  }
}

async function cmdPost(flags: Record<string, string>) {
  const cookie = await requireAuth();
  const title = flags.title ?? flags.t;
  if (!title) {
    console.error("Usage: hakr post --title \"Your title\" [--url https://...] [--text \"body text\"]");
    process.exit(1);
  }
  const url = flags.url ?? flags.u;
  const text = flags.text;

  const ok = await submitStory(cookie, title, url, text);
  if (ok) {
    console.log(`✓ Story submitted: ${title}`);
  } else {
    console.error("✗ Failed to submit story");
    process.exit(1);
  }
}

async function cmdComment(flags: Record<string, string>) {
  const cookie = await requireAuth();
  const id = parseInt(flags.id ?? "0", 10);
  const text = flags.text ?? flags.t;
  if (!id || !text) {
    console.error("Usage: hakr comment --id <parent_id> --text \"your comment\"");
    process.exit(1);
  }

  const ok = await submitComment(cookie, id, text);
  if (ok) {
    console.log(`✓ Comment posted on ${id}`);
  } else {
    console.error("✗ Failed to post comment");
    process.exit(1);
  }
}

async function cmdUpvote(flags: Record<string, string>) {
  const cookie = await requireAuth();
  const id = parseInt(flags.id ?? "0", 10);
  if (!id) {
    console.error("Usage: hakr upvote --id <item_id>");
    process.exit(1);
  }

  const ok = await apiUpvote(cookie, id);
  if (ok) {
    console.log(`✓ Upvoted ${id}`);
  } else {
    console.error("✗ Failed to upvote (already voted or not logged in)");
    process.exit(1);
  }
}

async function cmdUser(flags: Record<string, string>, positional: string[]) {
  const userId = flags.id ?? positional[0];
  if (!userId) {
    console.error("Usage: hakr user <username>");
    process.exit(1);
  }
  const profile = await fetchUser(userId);
  if (!profile) {
    console.error(`User ${userId} not found`);
    process.exit(1);
  }
  console.log(`${profile.id} · ${profile.karma} karma · joined ${new Date(profile.created * 1000).toLocaleDateString()}`);
  if (profile.about) console.log(`About: ${stripHtml(profile.about)}`);
}

function showHelp() {
  console.log(`hakr — Hacker News from the terminal

Usage: hakr [command] [options]

Commands:
  (no args)                          Launch TUI
  login   --user <u> --pass <p>      Login to HN
  logout                             Clear session
  whoami                             Show logged-in user + karma
  stories [--feed top] [--limit 30]  List stories
  status  [--id <story_id>]          Check story rank/score
  comments --id <story_id>           Show comment tree
  post    --title "..." [--url ...]  Submit a story
  comment --id <parent> --text "..." Comment on story/reply to comment
  upvote  --id <item_id>             Upvote a story or comment
  user    <username>                 View user profile
  help                               Show this help`);
}

export async function runCli(args: string[]): Promise<void> {
  const { command, flags, positional } = parseArgs(args);

  switch (command) {
    case "login": return cmdLogin(flags);
    case "logout": return cmdLogout();
    case "whoami": return cmdWhoami();
    case "stories": return cmdStories(flags);
    case "status": return cmdStatus(flags);
    case "comments": return cmdComments(flags);
    case "post": return cmdPost(flags);
    case "comment": return cmdComment(flags);
    case "reply": return cmdComment(flags); // alias
    case "upvote": return cmdUpvote(flags);
    case "user": return cmdUser(flags, positional);
    case "version": case "--version": case "-v": console.log(`hakr ${VERSION}`); return;
    case "help": case "--help": case "-h": return showHelp();
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}
