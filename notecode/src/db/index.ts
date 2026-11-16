import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in environment variables.`);
  }
  return value;
}

function intFromEnv(name: string, fallback: number, min = 1): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

/**
 * SQL_SSL: unset/"false" = no TLS (local dev), "true" = TLS with certificate
 * verification (Neon, Supabase, Vercel Postgres, RDS...), "no-verify" = TLS
 * without verification (last resort).
 */
function sslFromEnv(): false | { rejectUnauthorized: boolean } {
  const value = process.env.SQL_SSL?.trim().toLowerCase();
  if (!value || value === 'false' || value === 'disable') return false;
  if (value === 'no-verify') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

/**
 * Connection budget with multiple server instances:
 *   total connections = instances x PG_POOL_MAX
 * That product must stay below the database's max_connections (minus headroom
 * for admin/migration sessions). The default is deliberately small because each
 * instance multiplies it. On Vercel every concurrent request can spin up its own
 * function instance, so the default there is 1 connection per instance — and you
 * should point SQL_HOST at your provider's *pooled* (pgbouncer) endpoint.
 */
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: requireEnv('SQL_HOST'),
      user: requireEnv('SQL_USER'),
      password: requireEnv('SQL_PASSWORD'),
      database: requireEnv('SQL_DB_NAME'),
      port: intFromEnv('SQL_PORT', 5432),
      ssl: sslFromEnv(),
      max: intFromEnv('PG_POOL_MAX', process.env.VERCEL ? 1 : 5),
      min: 0,
      // Release idle connections quickly so scaled-out (and idle) instances
      // don't hold connection slots they aren't using.
      idleTimeoutMillis: intFromEnv('PG_IDLE_TIMEOUT_MS', 10_000),
      connectionTimeoutMillis: intFromEnv('PG_CONNECTION_TIMEOUT_MS', 15_000),
      // Server-side and client-side caps so a stuck query can't pin a slot forever.
      // Set PG_STATEMENT_TIMEOUT_MS=0 if your pooler (pgbouncer) rejects startup parameters.
      // Server-side cap is OPT-IN: pooled endpoints (Neon/Supabase pgbouncer) reject the
      // "statement_timeout" startup parameter, which makes every query fail with a 500.
      // Set PG_STATEMENT_TIMEOUT_MS=10000 only on a direct (non-pooled) connection.
      // query_timeout below is client-side only and always safe.
      statement_timeout: intFromEnv('PG_STATEMENT_TIMEOUT_MS', 0, 0) || undefined,
      query_timeout: intFromEnv('PG_QUERY_TIMEOUT_MS', 10_000),
      // Recycle long-lived connections so they rebalance across DB / proxy restarts.
      maxLifetimeSeconds: intFromEnv('PG_MAX_LIFETIME_SECONDS', 1800),
      // Don't keep the event loop alive solely because of the pool.
      allowExitOnIdle: true,
      application_name: 'notecode',
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

/** Created on first use, so a missing SQL_* variable fails the request (readable error), not the whole function at load time. */
export function getPool(): Pool {
  return createPool();
}

type Database = NodePgDatabase<typeof schema>;
let _db: Database | undefined;

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    _db ??= drizzle(createPool(), { schema });
    const value = Reflect.get(_db, prop, _db) as unknown;
    return typeof value === 'function' ? value.bind(_db) : value;
  },
});

/** Drain the pool so connections are returned to Postgres on shutdown (e.g. Cloud Run SIGTERM). */
export async function closePool(): Promise<void> {
  if (global._postgresPool) {
    const p = global._postgresPool;
    global._postgresPool = undefined;
    _db = undefined;
    await p.end();
  }
}
