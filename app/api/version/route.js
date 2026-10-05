import { BUILD } from '../../../lib/buildInfo';

// Reports which commit the server is running right now. The app compares this
// with the commit baked into the page it is showing (Settings → App Version).
// Open /api/version in a browser to read it directly.
//
// Must never be cached: a stale answer here would defeat the whole point.
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    {
      ...BUILD,
      environment: process.env.VERCEL_ENV || 'local',   // production, preview or local
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
