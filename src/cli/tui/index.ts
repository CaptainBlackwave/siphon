import inquirer from "inquirer";
import { DbConfig } from "../db/types.js";

export async function runConnectionWizard(): Promise<DbConfig> {
  const dbTypeAnswers = await inquirer.prompt([
    {
      type: "list",
      name: "type",
      message: "Select database type:",
      choices: ["sqlite", "postgres", "mysql"],
    },
  ]);

  const type = dbTypeAnswers.type as "sqlite" | "postgres" | "mysql";

  if (type === "sqlite") {
    const sqliteAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "filename",
        message: "Enter SQLite file path:",
        validate: (input: string) => input.length > 0 || "Please enter a file path",
      },
    ]);
    return {
      type: "sqlite",
      database: sqliteAnswers.filename,
      filename: sqliteAnswers.filename,
    };
  }

  const connectionAnswers = await inquirer.prompt([
    {
      type: "input",
      name: "host",
      message: "Host:",
      default: "localhost",
    },
    {
      type: "number",
      name: "port",
      message: "Port:",
      default: type === "postgres" ? 5432 : 3306,
    },
    {
      type: "input",
      name: "user",
      message: "Username:",
    },
    {
      type: "password",
      name: "password",
      message: "Password:",
      mask: "*",
    },
    {
      type: "input",
      name: "database",
      message: "Database name:",
      validate: (input: string) => input.length > 0 || "Please enter a database name",
    },
  ]);

  return {
    type,
    host: connectionAnswers.host,
    port: connectionAnswers.port,
    user: connectionAnswers.user,
    password: connectionAnswers.password,
    database: connectionAnswers.database,
  };
}

export async function getQuery(): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: "editor",
      name: "query",
      message: "Enter your SQL query:",
      default: "SELECT * FROM ",
    },
  ]);
  return answers.query;
}

export async function getExportSettings(): Promise<{ format: "csv" | "json"; outputPath: string }> {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "format",
      message: "Export format:",
      choices: ["csv", "json"],
      default: "csv",
    },
    {
      type: "input",
      name: "outputPath",
      message: "Output file path:",
      default: "export.csv",
    },
  ]);
  return answers as { format: "csv" | "json"; outputPath: string };
}

export function displayPreview(columns: string[], rows: Record<string, unknown>[]): void {
  const previewRows = rows.slice(0, 5);
  console.log("\n--- Data Preview (first 5 rows) ---");
  console.log(columns.join(" | "));
  console.log(columns.map(() => "---").join(" | "));
  for (const row of previewRows) {
    console.log(columns.map(col => String(row[col] ?? "NULL")).join(" | "));
  }
  console.log("--- End Preview ---\n");
}

export function displayProgress(current: number, total: number | null): void {
  const percent = total ? Math.round((current / total) * 100) : 0;
  const barLength = 30;
  const filled = Math.round((barLength * percent) / 100);
  const bar = "=".repeat(filled) + "-".repeat(barLength - filled);
  const totalStr = total ? ` / ${total.toLocaleString()}` : "";
  process.stdout.write(`\r[${bar}] ${current.toLocaleString()}${totalStr} rows (${percent}%)`);
}

export function clearProgress(): void {
  process.stdout.write("\r" + " ".repeat(80) + "\r");
}

export async function confirmAction(message: string): Promise<boolean> {
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message,
      default: false,
    },
  ]);
  return answers.confirm;
}
