import { auth } from './auth';

// Sign-in gate. Runs on the server before every page and API request
// (Next 16 renamed middleware.js to proxy.js).
//
// Signed in → carry on. Not signed in:
//   pages → sent to /account to sign in with Google, then back where they were
//   API   → 401 with a plain message, so nothing that costs money or quota
//           (chat, voices, transcription) works for strangers
//
// The pages below stay open so people can see what the app is and sign in.

const PUBLIC_PAGES = new Set(['/', '/account', '/paid', '/privacy', '/terms']);

const PUBLIC_API = [
  '/api/auth/',      // Google sign-in itself
  '/api/health',     // database check
  '/api/version',    // App Version check in Settings
];

function isPublic(pathname) {
  return PUBLIC_PAGES.has(pathname) || PUBLIC_API.some(p => pathname.startsWith(p));
}

export default auth(req => {
  const { pathname, search } = req.nextUrl;
  if (req.auth?.user || isPublic(pathname)) return;

  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Sign in to use WiseGuy.', signin: true }, { status: 401 });
  }

  const url = new URL('/account', req.nextUrl.origin);
  url.searchParams.set('next', pathname + search);
  return Response.redirect(url);
});

export const config = {
  // Skip Next's own files and anything in public/ (icons, manifest, service
  // worker), which must load before anyone has signed in.
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|json|js|txt|webmanifest)$).*)'],
};
