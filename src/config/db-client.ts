import { Pool } from 'pg';
import { env } from './env.js';

// Create a singleton PostgreSQL connection pool
class PostgresClient {
  private static instance: PostgresClient;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000
    });

    // Log pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  public static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }
    return PostgresClient.instance;
  }

  // Get the pool to use for queries
  public getPool(): Pool {
    return this.pool;
  }

  // Helper function for parameterized queries
  public async query(text: string, params: any[] = []) {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.log('Slow query:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  }

  // Close all connections
  public async close() {
    return this.pool.end();
  }
}

// Export a singleton instance
export const dbClient = PostgresClient.getInstance();