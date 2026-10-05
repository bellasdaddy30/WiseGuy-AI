// Which commit this copy of the app was built from. The values are written in
// at build time by next.config.mjs, so the copy running in the browser and the
// copy running on the server each carry their own, and comparing the two shows
// whether a phone is still holding an old version.
//
// Each process.env.X below has to be written out in full: the build replaces
// that exact text with the value, and it can't follow anything cleverer.
export const BUILD = {
  sha:     process.env.BUILD_SHA     || '',
  message: process.env.BUILD_MESSAGE || '',
  branch:  process.env.BUILD_BRANCH  || '',
  time:    process.env.BUILD_TIME    || '',
  repo:    process.env.BUILD_REPO    || '',
};

// Commits are usually quoted by their first seven characters
export function shortSha(sha) {
  return sha ? sha.slice(0, 7) : 'unknown';
}
