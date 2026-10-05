import { execSync } from 'node:child_process';

// Stamp every build with the commit it was made from, so the app can show
// which version it is running (Settings → App Version, and /api/version).
//
// On Vercel the commit details come from Vercel's own build variables. On a
// local machine they come from git. If neither is available the values are
// empty and the app says so instead of guessing.
function git(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

const owner = process.env.VERCEL_GIT_REPO_OWNER;
const slug  = process.env.VERCEL_GIT_REPO_SLUG;

const build = {
  BUILD_SHA:     process.env.VERCEL_GIT_COMMIT_SHA || git('git rev-parse HEAD'),
  BUILD_MESSAGE: (process.env.VERCEL_GIT_COMMIT_MESSAGE || git('git log -1 --pretty=%s')).split('\n')[0].slice(0, 120),
  BUILD_BRANCH:  process.env.VERCEL_GIT_COMMIT_REF || git('git rev-parse --abbrev-ref HEAD'),
  BUILD_TIME:    new Date().toISOString(),
  BUILD_REPO:    owner && slug ? `${owner}/${slug}` : 'bellasdaddy30/WiseGuy-AI',
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.*.*', '100.*.*.*'],
  // Values here are written into the code at build time, on the server and in
  // the browser bundle alike. None of them are secrets.
  env: build,
};

export default nextConfig;
