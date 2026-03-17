import Database from "better-sqlite3";
import pg from "pg";
import mysql from "mysql2/promise";
import { CONNECTION_TIMEOUT_MS } from "./types.js";
class SqliteDriver {
    db = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        if (!this.config.filename) {
            throw new Error("SQLite requires a filename");
        }
        this.db = new Database(this.config.filename);
    }
    async disconnect() {
        this.db?.close();
        this.db = null;
    }
    async query(sql) {
        if (!this.db)
            throw new Error("Not connected");
        const stmt = this.db.prepare(sql);
        const rows = stmt.all();
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return { columns, rows, rowCount: rows.length };
    }
    async stream(sql, batchSize, onBatch) {
        if (!this.db)
            throw new Error("Not connected");
        const stmt = this.db.prepare(sql);
        let totalRows = 0;
        let batch = [];
        for (const row of stmt.iterate()) {
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
    async estimateRowCount(_sql) {
        return null;
    }
}
class PostgresDriver {
    pool = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        const poolConfig = {
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
    async disconnect() {
        await this.pool?.end();
        this.pool = null;
    }
    async query(sql) {
        if (!this.pool)
            throw new Error("Not connected");
        const result = await this.pool.query(sql);
        const columns = result.fields.map((f) => f.name);
        const rows = result.rows;
        return { columns, rows, rowCount: rows.length };
    }
    async stream(sql, batchSize, onBatch) {
        if (!this.pool)
            throw new Error("Not connected");
        let totalRows = 0;
        let batch = [];
        const result = await this.pool.query(sql);
        for (const row of result.rows) {
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
    async estimateRowCount(_sql) {
        return null;
    }
}
class MysqlDriver {
    conn = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        this.conn = await mysql.createConnection({
            host: this.config.host || "localhost",
            port: this.config.port || 3306,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            connectTimeout: CONNECTION_TIMEOUT_MS,
        });
    }
    async disconnect() {
        await this.conn?.end();
        this.conn = null;
    }
    async query(sql) {
        if (!this.conn)
            throw new Error("Not connected");
        const [rows] = await this.conn.execute(sql);
        const rowArray = rows;
        const columns = rowArray.length > 0 ? Object.keys(rowArray[0]) : [];
        return { columns, rows: rowArray, rowCount: rowArray.length };
    }
    async stream(sql, batchSize, onBatch) {
        if (!this.conn)
            throw new Error("Not connected");
        let totalRows = 0;
        let batch = [];
        const [rows] = await this.conn.execute(sql);
        const rowArray = rows;
        for (const row of rowArray) {
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
    async estimateRowCount(_sql) {
        return null;
    }
}
export function createDriver(config) {
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
