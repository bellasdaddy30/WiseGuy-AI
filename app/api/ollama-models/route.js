export async function GET() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return Response.json({ running: false });
    const data = await res.json();
    const models = (data.models ?? []).map(m => ({
      id: m.name,
      name: m.name,
      size: m.details?.parameter_size ?? '',
    }));
    return Response.json({ running: true, models });
  } catch {
    return Response.json({ running: false });
  }
}
