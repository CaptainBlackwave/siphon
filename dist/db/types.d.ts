export interface DbConfig {
    type: "sqlite" | "postgres" | "mysql";
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
    filename?: string;
}
export interface DbRow {
    [key: string]: unknown;
}
export interface QueryResult {
    columns: string[];
    rows: DbRow[];
    rowCount: number;
}
export interface DatabaseDriver {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(sql: string): Promise<QueryResult>;
    stream(sql: string, batchSize: number, onBatch: (rows: DbRow[]) => Promise<void>): Promise<number>;
    estimateRowCount(sql: string): Promise<number | null>;
}
export interface ExportOptions {
    format: "csv" | "json";
    outputPath: string;
    batchSize: number;
}
export declare const CONNECTION_TIMEOUT_MS = 10000;
