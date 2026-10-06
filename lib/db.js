// Server-only connection to the Postgres database (hosted on Neon, added
// through Vercel, which supplies DATABASE_URL). Never import this from a client
// component.
//
// What lives in the database: who has signed in and what plan they are on.
// What does NOT live here: passwords. Sign-in is Google's job (auth.js), so the
// app never sees one.
//
// With no DATABASE_URL (a fresh copy on a dev machine, say) every helper here
// reports "no database" and the rest of the app carries on without it.

import pg from 'pg';

function connectionString() {
  return (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
}

export function dbConfigured() {
  return connectionString().length > 0;
}

// One small pool per server instance. It is kept on globalThis so `next dev`
// reloading this file does not open a fresh set of connections every time.
// Neon's DATABASE_URL already points at its connection pooler, so a handful of
// connections per instance is plenty.
function pool() {
  if (!dbConfigured()) return null;
  if (!globalThis.__wiseguyPool) {
    const created = new pg.Pool({
      connectionString: connectionString(),
      max: 3,
      idleTimeoutMillis: 10_000,
      // A sleeping Neon database takes a moment to wake on the first request
      connectionTimeoutMillis: 10_000,
    });
    // An idle connection dropping (the database going back to sleep) must not
    // crash the server. The pool opens a new one on the next query.
    created.on('error', err => console.error('[db] idle connection error:', err.code || err.message));
    globalThis.__wiseguyPool = created;
  }
  return globalThis.__wiseguyPool;
}

// The tables this app needs. Every statement is safe to run again and again,
// so the app creates what is missing the first time it touches the database
// and there is no separate setup step to forget.
//
// users: one row per person who has signed in.
//   provider + provider_id   which sign-in service, and that service's own
//                            permanent ID for the person. This pair is how a
//                            returning user is recognised. Email is not used
//                            for that because people change email addresses.
//   plan                     'free' until billing exists and says otherwise.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider      TEXT NOT NULL,
    provider_id   TEXT NOT NULL,
    email         TEXT,
    name          TEXT,
    image         TEXT,
    plan          TEXT NOT NULL DEFAULT 'free',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_id)
  );

  -- usage: how many chat messages each person has sent on each day, for the
  --        free plan's daily limit (lib/usage.js). One row per person per day.
  CREATE TABLE IF NOT EXISTS usage (
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day       DATE NOT NULL,
    messages  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );
`;

// Any fixed number. It names the lock below so only one server instance
// creates tables at a time.
const SCHEMA_LOCK = 71935001;

async function createSchema(p) {
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    // Two instances starting at the same moment would otherwise both try to
    // create the table and one would fail. The lock makes the second one wait,
    // and it is released automatically when the transaction ends.
    await client.query('SELECT pg_advisory_xact_lock($1)', [SCHEMA_LOCK]);
    await client.query(SCHEMA);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Runs once per server instance. If it fails, the next call tries again.
function ensureSchema(p) {
  if (!globalThis.__wiseguySchema) {
    globalThis.__wiseguySchema = createSchema(p).catch(err => {
      globalThis.__wiseguySchema = null;
      throw err;
    });
  }
  return globalThis.__wiseguySchema;
}

// Run one query. Always pass values through `params` ($1, $2, …), never by
// gluing them into the text: that is what keeps a hostile value from being
// read as SQL.
//
// Returns the result, or null when no database is configured. Throws if the
// database is configured but the query fails, so callers decide what a failure
// means for them.
export async function query(text, params = []) {
  const p = pool();
  if (!p) return null;
  await ensureSchema(p);
  try {
    return await p.query(text, params);
  } catch (err) {
    // 42P01 = "table does not exist". This instance created the tables earlier
    // and they have since been removed (a database reset, say). Create them
    // again and retry once, instead of failing until the next restart.
    if (err.code !== '42P01') throw err;
    globalThis.__wiseguySchema = null;
    await ensureSchema(p);
    return p.query(text, params);
  }
}

// For tests and scripts that need the process to exit cleanly.
export async function closeDb() {
  const p = globalThis.__wiseguyPool;
  globalThis.__wiseguyPool = null;
  globalThis.__wiseguySchema = null;
  if (p) await p.end();
}
