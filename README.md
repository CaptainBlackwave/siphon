# Siphon - Database Export Tool

A powerful command-line tool for exporting database query results to CSV and JSON formats. Built with TypeScript and Bun.

## Features

- **Multiple Database Support**: SQLite, PostgreSQL, and MySQL
- **Streaming Export**: Memory-efficient batch processing for large datasets
- **Interactive TUI**: Guided connection wizard and query editor
- **Dry Run Mode**: Preview what will be executed without making changes
- **Data Preview**: View first 5 rows before exporting
- **Format Validation**: Auto-corrects file extensions
- **Graceful Exit**: Handles Ctrl+C, cleans up partial files

## Installation

```bash
# Clone the repository
git clone https://github.com/CaptainBlackwave/siphon.git
cd siphon

# Install dependencies
bun install

# Build the CLI
bun run build:cli
```

## Usage

### Interactive Mode

```bash
bun run dist/index.js --interactive
```

Guides you through:
1. Database type selection
2. Connection details (host, port, user, password)
3. SQL query input
4. Export format and output path

### Non-Interactive Mode

```bash
# SQLite
bun run dist/index.js --db sqlite --filename database.db --query "SELECT * FROM users" --output users.csv

# PostgreSQL
bun run dist/index.js --db postgres --host localhost --user admin --password secret --database mydb --query "SELECT * FROM orders" --output orders.json

# MySQL
bun run dist/index.js --db mysql --host 127.0.0.1 --user root --password pass --database test --query "SELECT * FROM customers"
```

### Command-Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--interactive` | `-i` | Run in interactive TUI mode |
| `--db` | | Database type: sqlite, postgres, mysql |
| `--host` | | Database host |
| `--port` | | Database port |
| `--user` | | Database user |
| `--password` | | Database password |
| `--database` | | Database name |
| `--filename` | | SQLite filename |
| `--query` | `-q` | SQL query to execute |
| `--output` | `-o` | Output file path |
| `--format` | `-f` | Output format: csv or json |
| `--dry-run` | | Show what would be done without executing |
| `--batch-size` | | Batch size for streaming (default: 1000) |
| `--preview` | | Show preview of first 5 rows before exporting |

### Examples

#### Dry Run
```bash
bun run dist/index.js --db postgres --host localhost --user admin --password secret --database mydb --query "SELECT * FROM orders" --dry-run
```

Output:
```
=== DRY RUN ===
Database Type: postgres
Host: localhost:5432
Database: mydb
User: admin
Query: SELECT * FROM orders
Format: csv
Output: export.csv
================
```

#### Export with Preview
```bash
bun run dist/index.js --db sqlite --filename data.db --query "SELECT * FROM users" --preview
```

## Development

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Build CLI
bun run build:cli
```

## Tech Stack

- TypeScript
- Bun
- Commander.js (CLI)
- better-sqlite3, pg, mysql2 (Database drivers)
- Inquirer (TUI)

## License

MIT
