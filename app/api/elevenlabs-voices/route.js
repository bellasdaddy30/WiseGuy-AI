export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return Response.json({ voices: [] });

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) return Response.json({ voices: [] });
    const data = await res.json();
    // Only premade voices are accessible on the free tier.
    // Library/cloned voices added from the community library require a paid plan.
    const voices = (data.voices ?? [])
      .filter(v => v.category === 'premade')
      .map(v => ({ id: v.voice_id, name: v.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ voices });
  } catch {
    return Response.json({ voices: [] });
  }
}
