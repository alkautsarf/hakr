export function timeAgo(unix: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unix;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, "$1")
    .replace(/<code>([\s\S]*?)<\/code>/gi, "$1")
    .replace(/<i>([\s\S]*?)<\/i>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

import type { CommentItem } from "./types.ts";

export function filterVisibleComments(comments: CommentItem[]): CommentItem[] {
  const result: CommentItem[] = [];
  const collapsedParents = new Set<number>();
  for (const c of comments) {
    if (collapsedParents.has(c.parent)) {
      collapsedParents.add(c.id);
      continue;
    }
    if (c.collapsed) collapsedParents.add(c.id);
    result.push(c);
  }
  return result;
}
