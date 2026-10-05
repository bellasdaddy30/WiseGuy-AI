import { dbConfigured, query } from '../../../lib/db';

// Reports whether the server can reach its database. Open /api/health in a
// browser to read it. The answer is one of:
//   ok               connected, and the users table is there
//   not_configured   this copy of the app has no DATABASE_URL
//   error            DATABASE_URL is set but the database did not answer
//
// It says nothing else on purpose: no counts, no host names, no error text.
// The details of a failure go to the server log.
//
// Anyone can call this without signing in, and every real check wakes the
// database, which uses up some of Neon's free monthly allowance. So one server
// instance asks the database at most once an hour and repeats that answer in
// between. A failure is only remembered for a minute, so a fix shows up fast.
export const dynamic = 'force-dynamic';

const OK_FOR_MS    = 60 * 60 * 1000;
const ERROR_FOR_MS = 60 * 1000;

let last = null;   // { database, checkedAt }

async function check() {
  if (!dbConfigured()) return 'not_configured';
  try {
    await query('SELECT 1 FROM users LIMIT 1');
    return 'ok';
  } catch (err) {
    console.error('[health] database check failed:', err.code || err.message);
    return 'error';
  }
}

export async function GET() {
  const now = Date.now();
  const keepFor = last?.database === 'ok' ? OK_FOR_MS : ERROR_FOR_MS;
  if (!last || now - last.checkedAt > keepFor || last.database === 'not_configured') {
    last = { database: await check(), checkedAt: now };
  }
  return Response.json(
    { database: last.database, checkedAt: new Date(last.checkedAt).toISOString() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
