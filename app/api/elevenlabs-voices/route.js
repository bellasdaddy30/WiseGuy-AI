export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return Response.json({ voices: [] });

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices?show_legacy=false', {
      headers: { 'xi-api-key': apiKey },
      next: { revalidate: 300 }, // cache 5 min
    });
    if (!res.ok) return Response.json({ voices: [] });
    const data = await res.json();

    const ORDER = { professional: 0, premade: 1, cloned: 2, generated: 3 };
    const voices = (data.voices ?? [])
      .map(v => ({
        id:          v.voice_id,
        name:        v.name,
        category:    v.category ?? 'premade',
        labels:      v.labels ?? {},
        preview_url: v.preview_url ?? null,
      }))
      .sort((a, b) => {
        const catDiff = (ORDER[a.category] ?? 9) - (ORDER[b.category] ?? 9);
        return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name);
      });

    return Response.json({ voices });
  } catch {
    return Response.json({ voices: [] });
  }
}
