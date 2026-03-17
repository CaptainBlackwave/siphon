# Active Context: sql-conv - Database Export Tool

## Current State

**Project Status**: ✅ CLI tool built and ready

sql-conv is a database export tool with TUI that supports SQLite, PostgreSQL, and MySQL databases. It features streaming exports to CSV/JSON, interactive mode, and robust error handling.

## Recently Completed

- [x] Database-agnostic driver layer (SQLite, PostgreSQL, MySQL)
- [x] Streaming CSV/JSON export with batch processing
- [x] CLI with Commander.js (flags: --db, --query, --format, --output, etc.)
- [x] Interactive TUI with connection wizard, query editor, progress bar
- [x] Data preview (first 5 rows)
- [x] Connection timeouts (10s)
- [x] Format validation (auto-corrects file extension)
- [x] Graceful exit (SIGINT handler, partial file cleanup)
- [x] Dry-run feature (--dry-run shows what would be done)

## Current Structure

| File/Directory | Purpose |
|----------------|---------|
| `src/cli/index.ts` | Main CLI entry with argument parsing |
| `src/cli/db/driver.ts` | Database drivers (SQLite, Postgres, MySQL) |
| `src/cli/db/types.ts` | TypeScript interfaces |
| `src/cli/export/index.ts` | Streaming export logic |
| `src/cli/tui/index.ts` | Interactive TUI functions |
| `dist/` | Compiled JavaScript |

## Usage

```bash
# Interactive mode
sql-conv --interactive

# Non-interactive mode
sql-conv --db sqlite --filename data.db --query "SELECT * FROM users" --output out.csv

# Dry run
sql-conv --db postgres --host localhost --user admin --password secret --database mydb --query "SELECT * FROM orders" --dry-run

# With preview
sql-conv --db sqlite --filename test.db --query "SELECT * FROM users" --preview
```

## Tech Stack

- Node.js + TypeScript + Bun
- Commander.js for CLI
- better-sqlite3, pg, mysql2 for database drivers
- Inquirer for TUI prompts

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| Mar 2026 | Built sql-conv database export CLI tool |

## Pending Improvements

- [ ] Add GitHub Actions workflow for binary builds
- [ ] Add Homebrew formula
- [ ] Add README with Asciinema demo
