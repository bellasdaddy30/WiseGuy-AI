import { checkPin, isOwner, ownerCookie, clearOwnerCookie } from '../../../lib/ownerAuth';

export async function GET(request) {
  return Response.json({ owner: isOwner(request) });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const result = checkPin(request, body.pin);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ granted: true }, {
    headers: { 'Set-Cookie': ownerCookie(request) },
  });
}

export async function DELETE(request) {
  return Response.json({ ok: true }, {
    headers: { 'Set-Cookie': clearOwnerCookie(request) },
  });
}
