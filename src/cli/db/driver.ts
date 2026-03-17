import Database from "better-sqlite3";
import pg from "pg";
import mysql from "mysql2/promise";
import { DbConfig, DatabaseDriver, QueryResult, DbRow, CONNECTION_TIMEOUT_MS } from "./types.js";

class SqliteDriver implements DatabaseDriver {
  private db: Database.Database | null = null;
  private config: DbConfig;

  constructor(config: DbConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.filename) {
      throw new Error("SQLite requires a filename");
    }
    this.db = new Database(this.config.filename);
  }

  async disconnect(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.db) throw new Error("Not connected");
    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as DbRow[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, rowCount: rows.length };
  }

  async stream(sql: string, batchSize: number, onBatch: (rows: DbRow[]) => Promise<void>): Promise<number> {
    if (!this.db) throw new Error("Not connected");
    const stmt = this.db.prepare(sql);
    let totalRows = 0;
    let batch: DbRow[] = [];

    for (const row of stmt.iterate() as Iterable<DbRow>) {
      batch.push(row);
      totalRows++;
      if (batch.length >= batchSize) {
        await onBatch(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await onBatch(batch);
    }

    return totalRows;
  }

  async estimateRowCount(_sql: string): Promise<number | null> {
    return null;
  }
}

class PostgresDriver implements DatabaseDriver {
  private pool: pg.Pool | null = null;
  private config: DbConfig;

  constructor(config: DbConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const poolConfig: pg.PoolConfig = {
      host: this.config.host || "localhost",
      port: this.config.port || 5432,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: false,
      max: 1,
      idleTimeoutMillis: CONNECTION_TIMEOUT_MS,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    };
    this.pool = new pg.Pool(poolConfig);
    const client = await this.pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    await this.pool?.end();
    this.pool = null;
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.pool) throw new Error("Not connected");
    const result = await this.pool.query(sql);
    const columns = result.fields.map((f: pg.FieldDef) => f.name);
    const rows = result.rows as DbRow[];
    return { columns, rows, rowCount: rows.length };
  }

  async stream(sql: string, batchSize: number, onBatch: (rows: DbRow[]) => Promise<void>): Promise<number> {
    if (!this.pool) throw new Error("Not connected");
    let totalRows = 0;
    let batch: DbRow[] = [];

    const result = await this.pool.query(sql);
    for (const row of result.rows) {
      batch.push(row as DbRow);
      totalRows++;
      if (batch.length >= batchSize) {
        await onBatch(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await onBatch(batch);
    }

    return totalRows;
  }

  async estimateRowCount(_sql: string): Promise<number | null> {
    return null;
  }
}

class MysqlDriver implements DatabaseDriver {
  private conn: mysql.Connection | null = null;
  private config: DbConfig;

  constructor(config: DbConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.conn = await mysql.createConnection({
      host: this.config.host || "localhost",
      port: this.config.port || 3306,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectTimeout: CONNECTION_TIMEOUT_MS,
    });
  }

  async disconnect(): Promise<void> {
    await this.conn?.end();
    this.conn = null;
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.conn) throw new Error("Not connected");
    const [rows] = await this.conn.execute(sql);
    const rowArray = rows as Record<string, unknown>[];
    const columns = rowArray.length > 0 ? Object.keys(rowArray[0]) : [];
    return { columns, rows: rowArray, rowCount: rowArray.length };
  }

  async stream(sql: string, batchSize: number, onBatch: (rows: DbRow[]) => Promise<void>): Promise<number> {
    if (!this.conn) throw new Error("Not connected");
    let totalRows = 0;
    let batch: DbRow[] = [];

    const [rows] = await this.conn.execute(sql);
    const rowArray = rows as Record<string, unknown>[];
    for (const row of rowArray) {
      batch.push(row as DbRow);
      totalRows++;
      if (batch.length >= batchSize) {
        await onBatch(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await onBatch(batch);
    }

    return totalRows;
  }

  async estimateRowCount(_sql: string): Promise<number | null> {
    return null;
  }
}

export function createDriver(config: DbConfig): DatabaseDriver {
  switch (config.type) {
    case "sqlite":
      return new SqliteDriver(config);
    case "postgres":
      return new PostgresDriver(config);
    case "mysql":
      return new MysqlDriver(config);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}
