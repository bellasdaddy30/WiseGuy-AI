import { isAdmin, pinConfigured, checkPin, adminCookie, clearAdminCookie } from '../../../lib/adminAuth';

// GET    → is this browser unlocked?
// POST   → { pin } unlocks this browser (signed httpOnly cookie)
// DELETE → locks it again

export async function GET(request) {
  return Response.json({ admin: isAdmin(request), pinRequired: pinConfigured() });
}

export async function POST(request) {
  if (!pinConfigured()) {
    // Nothing to unlock: open in dev, closed in production (see lib/adminAuth).
    return Response.json({ granted: isAdmin(request) }, { status: isAdmin(request) ? 200 : 403 });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }

  const result = checkPin(request, body?.pin);
  if (!result.ok) {
    return Response.json({ granted: false, error: result.error }, { status: result.status });
  }
  return Response.json({ granted: true }, { headers: { 'Set-Cookie': adminCookie(request) } });
}

export async function DELETE(request) {
  return Response.json({ admin: false }, { headers: { 'Set-Cookie': clearAdminCookie(request) } });
}
