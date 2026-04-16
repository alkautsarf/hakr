# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] - 2026-04-16

### Added

- HN-wide Algolia search (`/` from stories pane) with debounced queries
- Comment search (`/` from comments pane) with `n`/`N` match navigation and filter bar
- Infinite scroll for stories — auto-loads next batch when near bottom
- User profile viewer (`p` for context-aware, `P` for own profile)
- Story body text displayed for Ask HN / Tell HN / Show HN posts
- Rate limit detection with clear error message

### Changed

- Comments collapsed by default at all nesting levels with `↩ N replies hidden` indicator
- Clean `▎` indent nesting replaces stacking `┃` thread bars (clx-inspired)
- `▁` separator lines between top-level comments
- Story body scrolls with comments; `k` at top / `gg` scrolls back to body
- Selected item background updated to `#2a2a3a`
- Batched story fetching (10 at a time) and comment concurrency limit (10) to prevent connection pool exhaustion
- Increased API timeouts (15s read, 15s write)

### Fixed

- Comment submission was broken — now uses `hmac` + `/comment` endpoint (HN dropped `fnid` flow)
- Top-level story comments work via `/item` hmac fallback
- Upvote was broken since v0.1.0 — regex expected `&` but HN HTML uses `&amp;`
- All write operations now have timeouts (were missing entirely)
- Unhandled promise rejections no longer trigger OpenTUI Console panel
- Stale feed data after timeout — generation counter prevents old loads overwriting newer ones
- `fetchStories` no longer loses all results when one item times out

## [0.2.2] - 2026-04-15

### Fixed

- Search overlay now loads comments when opening a story (was only showing header)
- Re-fetch story item when opening comments to get latest kids array (fixes stale cache)
- Add 10s fetch timeout to prevent hung requests

### Changed

- Unified story opening via `openStory` helper — all paths (Enter, search, refresh) use the same comment loading logic

## [0.2.1] - 2026-04-15

### Fixed

- Add visual upvote indicator (▲) on comments when upvoted

## [0.2.0] - 2026-04-15

### Added

- Cross-platform credential storage: macOS Keychain with file-based fallback (`~/.config/hakr/session`) for Linux and Windows
- `--version` / `-v` flag

### Fixed

- Deduplicated visible comments logic into shared `filterVisibleComments` utility
- Removed dead code (unused `storyIds` store field, `senderColors` theme property, unused imports)
- Fixed redundant shift-key checks in keyboard handler
- Fixed reply-input separator using hardcoded width instead of terminal dimensions

## [0.1.0] - 2026-04-15

### Added

- Interactive TUI with split-pane layout (stories + comments)
- Browse Top, New, Best, Show HN, Ask HN, Jobs feeds
- Threaded comments with colored depth indicators and collapse/expand
- Login/logout with password masking, session cached in macOS Keychain
- Upvote stories and comments with optimistic UI
- Reply to comments and post top-level comments inline
- Submit new stories (link or text posts)
- Search overlay for filtering stories
- Help overlay with keybind reference
- Karma display in header
- Refresh feed with `R`
- Open URLs in browser with `$BROWSER` env var support (qutebrowser `--target tab`)
- Full CLI mode: `hakr stories`, `hakr comments`, `hakr post`, `hakr comment`, `hakr upvote`, `hakr status`, `hakr whoami`, `hakr user`
- Vim-style keybindings (j/k, gg/G, h/l, Ctrl+D/U)

[0.3.0]: https://github.com/alkautsarf/hakr/releases/tag/v0.3.0
[0.2.2]: https://github.com/alkautsarf/hakr/releases/tag/v0.2.2
[0.2.1]: https://github.com/alkautsarf/hakr/releases/tag/v0.2.1
[0.2.0]: https://github.com/alkautsarf/hakr/releases/tag/v0.2.0
[0.1.0]: https://github.com/alkautsarf/hakr/releases/tag/v0.1.0
