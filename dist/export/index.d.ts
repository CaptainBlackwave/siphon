import { DatabaseDriver, ExportOptions } from "../db/types.js";
export declare function exportData(driver: DatabaseDriver, sql: string, options: ExportOptions, onProgress?: (current: number, total: number | null) => void, signal?: AbortSignal): Promise<number>;
export declare function correctFileExtension(format: "csv" | "json", outputPath: string): string;
export declare function validateOutputPath(outputPath: string, format: "csv" | "json"): string;
