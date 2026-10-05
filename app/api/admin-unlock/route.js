export async function POST(request) {
  const pin = process.env.ADMIN_PIN;
  if (!pin) {
    // No PIN configured — admin features are open to everyone
    return Response.json({ granted: true });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }

  if (body?.pin === pin) {
    return Response.json({ granted: true });
  }

  return Response.json({ granted: false }, { status: 401 });
}
