# hakr

Full-featured Hacker News TUI with read **and write** support. Browse, post, comment, and upvote — all from the terminal.

```
 hakr  Top  New  Best  Show  Ask  Jobs                    elpabl0 · 42 karma
──────────────────────────────────────────────────────────────────────────────
  1. ▲ 342  Show HN: Hakr – HN TUI with write support
            hakr.dev · by elpabl0 · 3h · 128 comments
  2. ▲  89  The SQLite documentation is now open source
            sqlite.org · by bensadeh · 5h · 67 comments
```

## Install

```bash
brew install alkautsarf/tap/hakr
```

Or run from source:

```bash
git clone https://github.com/alkautsarf/hakr.git
cd hakr
bun install
bun run src/index.tsx
```

## Usage

### TUI Mode

```bash
hakr
```

Launch the interactive terminal interface. Navigate with vim keybindings.

### CLI Mode

```bash
hakr stories                         # List top stories
hakr stories --feed show --limit 10  # Show HN feed
hakr comments --id 12345             # Read comment thread
hakr post --title "Show HN: ..." --url "https://..."
hakr comment --id 12345 --text "Great work!"
hakr upvote --id 12345
hakr whoami                          # Your profile + karma
hakr status                          # Check your latest post's rank
hakr user pg                         # View any user's profile
```

## Keybindings

### Navigation

| Key | Action |
|-----|--------|
| `j` / `k` | Move down / up |
| `h` / `l` | Switch pane / feed |
| `gg` / `G` | Jump to top / bottom |
| `Ctrl+D` / `Ctrl+U` | Page down / up |
| `Tab` | Cycle focus zones |
| `Enter` | Open story / toggle collapse |
| `Esc` | Go back / close |

### Actions

| Key | Action |
|-----|--------|
| `u` | Upvote story or comment |
| `r` | Reply to highlighted comment |
| `c` | Comment on story (top-level) |
| `o` | Open URL in browser |
| `s` | Submit new story |
| `R` | Refresh feed + comments |
| `L` | Login / Logout |
| `/` | Search stories |
| `?` | Help overlay |
| `q` | Quit pane / app |

## Features

- **Browse** — Top, New, Best, Show HN, Ask HN, Jobs feeds
- **Read** — Threaded comments with colored depth indicators, collapse/expand
- **Post** — Submit link or text stories
- **Comment** — Top-level comments and threaded replies, inline
- **Upvote** — Vote on stories and comments with optimistic UI
- **Login** — HN authentication with password masking, session cached in macOS Keychain
- **Search** — Filter stories with fuzzy matching
- **CLI** — Full programmatic access for scripting and automation

## Configuration

### Browser

Set `$BROWSER` to control which browser opens URLs (default: system default via `open`):

```bash
export BROWSER=/path/to/qutebrowser  # opens in new tab automatically
export BROWSER=firefox
```

## Stack

- [Bun](https://bun.sh) + TypeScript
- [OpenTUI](https://github.com/anthropics/opentui) + [SolidJS](https://www.solidjs.com) for the terminal UI
- HN Firebase API (reads) + reverse-engineered form submissions (writes)
- macOS Keychain for credential storage

## License

MIT
