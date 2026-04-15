# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

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

[0.2.0]: https://github.com/alkautsarf/hakr/releases/tag/v0.2.0
[0.1.0]: https://github.com/alkautsarf/hakr/releases/tag/v0.1.0
