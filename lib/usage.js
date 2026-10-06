// Server-only: the free plan's daily chat message limit. Never import this
// from a client component.
//
// Every chat message spends the shared free quota on Groq and Google, and each
// one re-sends the whole conversation, so one heavy user could use up the day
// for everyone. Free users get FREE_DAILY_MESSAGES a day; the count resets at
// midnight Central time. The owner (admin cookie) and any paid plan have no limit.
//
// Change the number without a code change by setting FREE_DAILY_MESSAGES in
// Vercel's environment variables, then redeploying.

import { query, dbConfigured } from './db.js';

const DEFAULT_FREE_DAILY = 25;
const TIME_ZONE = 'America/Chicago';

export function freeDailyLimit() {
  const n = Number.parseInt(process.env.FREE_DAILY_MESSAGES ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_DAILY;
}

// The day in Central time, worked out by Postgres so every server instance agrees.
const TODAY = `(now() AT TIME ZONE '${TIME_ZONE}')::date`;

// Counts one message against today's limit, if there is room.
//
// Returns { ok: true, used, limit } when the message may go ahead, or
// { ok: false, used, limit } when today's messages are used up. With no
// database, or a database error, it lets the message through: an outage must
// not lock everyone out of chat. The error is logged.
export async function takeMessage(userId) {
  const limit = freeDailyLimit();
  if (!dbConfigured() || !userId) return { ok: true, used: 0, limit, unchecked: true };

  try {
    // Paid plans have no daily limit. (Nothing sets a paid plan yet; billing
    // will, by changing users.plan.)
    const user = await query('SELECT plan FROM users WHERE id = $1', [userId]);
    const plan = user.rows[0]?.plan ?? 'free';
    if (plan !== 'free') return { ok: true, used: 0, limit: null };

    // One statement, so two messages sent at the same moment can't both slip
    // past the limit: the row is only updated while it is still under it.
    const result = await query(
      `INSERT INTO usage (user_id, day, messages)
       VALUES ($1, ${TODAY}, 1)
       ON CONFLICT (user_id, day) DO UPDATE
         SET messages = usage.messages + 1
         WHERE usage.messages < $2
       RETURNING messages`,
      [userId, limit]
    );
    if (result.rows.length) return { ok: true, used: result.rows[0].messages, limit };
    return { ok: false, used: limit, limit };
  } catch (err) {
    console.error('[usage] could not check the daily limit:', err.code || err.message);
    return { ok: true, used: 0, limit, unchecked: true };
  }
}

// Gives a message back when the AI failed before replying, so a provider
// outage doesn't eat into anyone's day.
export async function refundMessage(userId) {
  if (!dbConfigured() || !userId) return;
  try {
    await query(
      `UPDATE usage SET messages = messages - 1
       WHERE user_id = $1 AND day = ${TODAY} AND messages > 0`,
      [userId]
    );
  } catch (err) {
    console.error('[usage] could not refund a message:', err.code || err.message);
  }
}

export function limitReachedMessage(limit) {
  return `That's all ${limit} free messages for today. They reset at midnight Central time.`;
}
