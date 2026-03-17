import { createWriteStream, unlinkSync, existsSync } from "fs";
import { pipeline } from "stream/promises";
import { DatabaseDriver, DbRow, ExportOptions } from "../db/types.js";

export async function exportData(
  driver: DatabaseDriver,
  sql: string,
  options: ExportOptions,
  onProgress?: (current: number, total: number | null) => void,
  signal?: AbortSignal
): Promise<number> {
  const { format, outputPath, batchSize } = options;

  if (existsSync(outputPath)) {
    unlinkSync(outputPath);
  }

  const writeStream = createWriteStream(outputPath);
  let isFirstBatch = true;
  let totalRows = 0;
  let columns: string[] = [];

  const total = await driver.estimateRowCount(sql);

  if (format === "csv") {
    await writeCSVHeader(writeStream);
  } else {
    await writeStream.write("[");
  }

  const abortHandler = () => {
    writeStream.close();
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
    throw new Error("Export cancelled by user");
  };

  if (signal) {
    signal.addEventListener("abort", abortHandler);
  }

  try {
    totalRows = await driver.stream(sql, batchSize, async (batch: DbRow[]) => {
      if (isFirstBatch && batch.length > 0) {
        columns = Object.keys(batch[0]);
        isFirstBatch = false;
      }

      if (format === "csv") {
        for (const row of batch) {
          const line = columns.map(col => escapeCSV(String(row[col] ?? ""))).join(",") + "\n";
          writeStream.write(line);
        }
      } else {
        for (const row of batch) {
          const jsonRow = JSON.stringify(row);
          writeStream.write((totalRows === 0 && !existsSync(outputPath) ? "" : ",") + jsonRow);
        }
      }

      if (onProgress) {
        onProgress(totalRows, total);
      }
    });

    if (format === "json") {
      await writeStream.write("]");
    }

    await writeStream.end();
    return totalRows;
  } catch (error) {
    writeStream.close();
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
    throw error;
  } finally {
    if (signal) {
      signal.removeEventListener("abort", abortHandler);
    }
  }
}

async function writeCSVHeader(writeStream: ReturnType<typeof createWriteStream>): Promise<void> {
  return new Promise((resolve, reject) => {
    writeStream.write("Content-Type: text/csv\n\n");
    writeStream.once("error", reject);
    writeStream.once("finish", resolve);
    writeStream.write("");
  });
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function correctFileExtension(format: "csv" | "json", outputPath: string): string {
  const ext = format === "csv" ? ".csv" : ".json";
  if (!outputPath.endsWith(ext)) {
    return outputPath + ext;
  }
  return outputPath;
}

export function validateOutputPath(outputPath: string, format: "csv" | "json"): string {
  let corrected = outputPath;
  if (format === "csv" && outputPath.endsWith(".json")) {
    corrected = outputPath.replace(/\.json$/, ".csv");
  } else if (format === "json" && outputPath.endsWith(".csv")) {
    corrected = outputPath.replace(/\.csv$/, ".json");
  }
  return corrected;
}
