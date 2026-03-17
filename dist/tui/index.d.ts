import { DbConfig } from "../db/types.js";
export declare function runConnectionWizard(): Promise<DbConfig>;
export declare function getQuery(): Promise<string>;
export declare function getExportSettings(): Promise<{
    format: "csv" | "json";
    outputPath: string;
}>;
export declare function displayPreview(columns: string[], rows: Record<string, unknown>[]): void;
export declare function displayProgress(current: number, total: number | null): void;
export declare function clearProgress(): void;
export declare function confirmAction(message: string): Promise<boolean>;
