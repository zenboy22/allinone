import { TABLES } from './schemas';
import { createLogger } from '../utils';
import { parseConnectionURI, adaptQuery, ConnectionURI } from './utils';

const logger = createLogger('database');

import { Pool, Client, QueryResult } from 'pg';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';

type QueryResultRow = Record<string, any>;

interface UnifiedQueryResult<T = QueryResultRow> {
  rows: T[];
  rowCount: number;
  command?: string;
}

type DBDialect = 'postgres' | 'sqlite';

type DSNModifier = (url: URL, query: URLSearchParams) => void;

type Transaction = {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  execute: (query: string, params?: any[]) => Promise<UnifiedQueryResult<any>>;
};

export class DB {
  private static instance: DB;
  private db!: Pool | Database<any>;
  private static initialised: boolean = false;
  private static dialect: DBDialect;
  private uri!: ConnectionURI;
  private dsnModifiers: DSNModifier[] = [];

  private constructor() {}

  static getInstance(): DB {
    if (!this.instance) {
      this.instance = new DB();
    }
    return this.instance;
  }

  isInitialised(): boolean {
    return DB.initialised;
  }

  getDialect(): DBDialect {
    return DB.dialect;
  }

  async initialise(uri: string, dsnModifiers: DSNModifier[] = []): Promise<void> {
    if (DB.initialised) return;
    try {
      this.uri = parseConnectionURI(uri);
      this.dsnModifiers = dsnModifiers;
      await this.open();
      await this.ping();
      for (const [name, schema] of Object.entries(TABLES)) {
        const createTableQuery = `CREATE TABLE IF NOT EXISTS ${name} (${schema})`;
        await this.execute(createTableQuery);
      }
      if (this.uri.dialect === 'sqlite') {
        await this.execute('PRAGMA busy_timeout = 5000');
        await this.execute('PRAGMA foreign_keys = ON');
        await this.execute('PRAGMA synchronous = OFF');
        await this.execute('PRAGMA journal_mode = WAL');
        await this.execute('PRAGMA locking_mode = IMMEDIATE');
      }
      DB.initialised = true;
      DB.dialect = this.uri.dialect;
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async open(): Promise<void> {
    if (this.uri.dialect === 'postgres') {
      const pool = new Pool({
        connectionString: this.uri.url.toString(),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      this.db = pool;
      this.uri.dialect = 'postgres';
    } else if (this.uri.dialect === 'sqlite') {
      const sqlitePath = '/data/db.sqlite';
      const parentDir = path.dirname(sqlitePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      this.db = await open({
        filename: sqlitePath,
        driver: sqlite3.Database,
      });
      this.uri.filename = sqlitePath;
      this.uri.dialect = 'sqlite';
    }
  }

  async close(): Promise<void> {
    if (this.uri.dialect === 'postgres') {
      await (this.db as Pool).end();
    } else if (this.uri.dialect === 'sqlite') {
