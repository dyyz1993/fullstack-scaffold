export type DatabaseDriver = 'sqlite' | 'mysql' | 'd1';

declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1Result>;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
  }

  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    error?: string;
    meta?: {
      duration: number;
      changes: number;
      last_row_id: number;
      rows_read: number;
      rows_written: number;
    };
  }
}

export interface DatabaseConfig {
  driver: DatabaseDriver;
  
  sqlitePath?: string;
  
  mysqlHost?: string;
  mysqlPort?: number;
  mysqlUser?: string;
  mysqlPassword?: string;
  mysqlDatabase?: string;
  
  d1Database?: D1Database;
}

export function getDatabaseConfig(): DatabaseConfig {
  const driver = (process.env.DB_DRIVER as DatabaseDriver) || 'sqlite';
  
  return {
    driver,
    
    sqlitePath: process.env.SQLITE_PATH || './data/app.db',
    
    mysqlHost: process.env.MYSQL_HOST || 'localhost',
    mysqlPort: parseInt(process.env.MYSQL_PORT || '3306', 10),
    mysqlUser: process.env.MYSQL_USER || 'root',
    mysqlPassword: process.env.MYSQL_PASSWORD || '',
    mysqlDatabase: process.env.MYSQL_DATABASE || 'app',
    
    d1Database: (globalThis as unknown as { D1?: D1Database }).D1,
  };
}
