// Server-only: reads and writes the users table. Never import this from a
// client component.

import { query, dbConfigured } from './db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(value, max) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

// Called at the moment someone signs in. Creates their row the first time and
// refreshes it (name, picture, last sign-in) every time after. The plan is
// never touched here, so signing in again can't reset a paid plan to free.
//
// Returns { id, plan, createdAt, isNew }, or null when there is no database.
export async function recordSignIn({ provider, providerId, email, name, image }) {
  if (!dbConfigured()) return null;
  if (!provider || !providerId) throw new Error('recordSignIn needs a provider and that provider\'s user ID.');

  const result = await query(
    `INSERT INTO users (provider, provider_id, email, name, image)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider, provider_id) DO UPDATE
       SET email = EXCLUDED.email,
           name = EXCLUDED.name,
           image = EXCLUDED.image,
           last_login_at = now()
     RETURNING id, plan, created_at, (xmax = 0) AS is_new`,
    [
      String(provider).slice(0, 50),
      String(providerId).slice(0, 255),
      clean(email, 320)?.toLowerCase() ?? null,
      clean(name, 200),
      clean(image, 2000),
    ]
  );
  const row = result.rows[0];
  return { id: row.id, plan: row.plan, createdAt: row.created_at, isNew: row.is_new };
}

// Look one user up by our own ID (the one stored in their session).
// Returns { id, email, name, plan, createdAt, lastLoginAt }, or null when
// there is no database or no such user.
export async function getUser(id) {
  if (!dbConfigured() || typeof id !== 'string' || !UUID.test(id)) return null;
  const result = await query(
    'SELECT id, email, name, plan, created_at, last_login_at FROM users WHERE id = $1',
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
