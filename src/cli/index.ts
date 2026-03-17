#!/usr/bin/env node

import { Command } from "commander";
import { createDriver } from "./db/driver.js";
import { exportData, validateOutputPath } from "./export/index.js";
import { runConnectionWizard, getQuery, getExportSettings, displayPreview, displayProgress, clearProgress, confirmAction } from "./tui/index.js";
import { DbConfig } from "./db/types.js";

const program = new Command();

program
  .name("sql-conv")
  .description("Database export tool with TUI")
  .version("1.0.0")
  .option("-i, --interactive", "Run in interactive TUI mode")
  .option("--db <type>", "Database type: sqlite, postgres, mysql")
  .option("--host <host>", "Database host")
  .option("--port <port>", "Database port", (val) => parseInt(val, 10))
  .option("--user <user>", "Database user")
  .option("--password <password>", "Database password")
  .option("--database <database>", "Database name")
  .option("--filename <file>", "SQLite filename")
  .option("-q, --query <sql>", "SQL query to execute")
  .option("-o, --output <path>", "Output file path")
  .option("-f, --format <format>", "Output format: csv or json", "csv")
  .option("--dry-run", "Show what would be done without executing")
  .option("--batch-size <size>", "Batch size for streaming", (val) => parseInt(val, 10), 1000)
  .option("--preview", "Show preview of first 5 rows before exporting");

program.parse();

async function buildConfig(options: Record<string, unknown>): Promise<DbConfig> {
  const type = options.db as string;
  if (!type) {
    throw new Error("Database type required. Use --db or run in interactive mode.");
  }

  if (type === "sqlite") {
    return {
      type: "sqlite",
      database: options.filename as string || "database.db",
      filename: options.filename as string,
    };
  }

  return {
    type: type as "postgres" | "mysql",
    host: options.host as string || "localhost",
    port: options.port as number || (type === "postgres" ? 5432 : 3306),
    user: options.user as string,
    password: options.password as string,
    database: options.database as string,
  };
}

async function dryRun(config: DbConfig, query: string, format: string, outputPath: string): Promise<void> {
  console.log("\n=== DRY RUN ===");
  console.log(`Database Type: ${config.type}`);
  if (config.type === "sqlite") {
    console.log(`Database: ${config.filename}`);
  } else {
    console.log(`Host: ${config.host}:${config.port}`);
    console.log(`Database: ${config.database}`);
    console.log(`User: ${config.user}`);
  }
  console.log(`Query: ${query}`);
  console.log(`Format: ${format}`);
  console.log(`Output: ${outputPath}`);
  console.log("================\n");
}

async function main() {
  const opts = program.opts();

  if (Object.keys(opts).length === 0) {
    program.help();
    return;
  }

  let config: DbConfig;
  let query: string;
  let format: "csv" | "json";
  let outputPath: string;

  if (opts.interactive) {
    console.log("Running in interactive mode...\n");
    config = await runConnectionWizard();
    query = await getQuery();
    const exportSettings = await getExportSettings();
    format = exportSettings.format;
    outputPath = validateOutputPath(exportSettings.outputPath, format);
  } else if (!opts.db || !opts.query) {
    console.error("Error: In non-interactive mode, --db and --query are required.");
    console.log("Or use --interactive for guided setup.");
    process.exit(1);
  } else {
    try {
      config = await buildConfig(opts);
    } catch (err) {
      console.error("Error:", (err as Error).message);
      process.exit(1);
    }

    query = opts.query;
    format = (opts.format as "csv" | "json") || "csv";
    outputPath = validateOutputPath(opts.output || "export." + format, format);
  }

  if (opts.dryRun) {
    await dryRun(config, query, format, outputPath);
    return;
  }

  const driver = createDriver(config);
  let aborted = false;
  const abortController = new AbortController();

  const cleanup = async () => {
    if (!aborted) {
      aborted = true;
      abortController.abort();
      await driver.disconnect();
      console.log("\nExport cancelled. Cleanup complete.");
      process.exit(1);
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    console.log("\nConnecting to database...");
    await driver.connect();
    console.log("Connected!\n");

    if (opts.preview) {
      console.log("Fetching preview...");
      const result = await driver.query(query);
      if (result.rows.length > 0) {
        displayPreview(result.columns, result.rows);
      } else {
        console.log("Query returned no rows.\n");
      }
    }

    const continueExport = await confirmAction("Start export?");
    if (!continueExport) {
      await driver.disconnect();
      console.log("Export cancelled.");
      return;
    }

    console.log(`Exporting to ${outputPath}...\n`);

    const totalRows = await exportData(
      driver,
      query,
      { format, outputPath, batchSize: opts.batchSize || 1000 },
      displayProgress,
      abortController.signal
    );

    clearProgress();
    console.log(`\nExport complete! ${totalRows.toLocaleString()} rows written to ${outputPath}`);
  } catch (err) {
    console.error("\nError:", (err as Error).message);
    process.exit(1);
  } finally {
    await driver.disconnect();
  }
}

main().catch(console.error);
