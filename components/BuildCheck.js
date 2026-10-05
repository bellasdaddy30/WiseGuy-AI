'use client';

import { useEffect, useState } from 'react';
import { BUILD, shortSha } from '../lib/buildInfo';
import styles from './BuildCheck.module.css';

// Answers "is my app actually up to date?" by comparing three things:
//
//   1. This screen   the commit baked into the page you are looking at
//   2. The server    the commit the address is serving right now (/api/version)
//   3. GitHub        the newest commit on the branch
//
// The two ways an update goes missing show up as different mismatches:
//   screen ≠ server   the phone is holding an old copy. Reopen the app.
//   server ≠ GitHub   Vercel has not put the newest build on this address.
//                     Either it is still building, or it failed, or a
//                     rollback has frozen the address.

const STILL_BUILDING_MS = 4 * 60 * 1000;   // a build normally takes a minute or two

function ago(iso, now) {
  const then = Date.parse(iso);
  if (!then) return '';
  const mins = Math.round((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function clock(iso) {
  const then = Date.parse(iso);
  if (!then) return '';
  return new Date(then).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function fetchServer() {
  try {
    // /api/ requests skip the service worker, so this always reaches the server
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (res.status === 404) return { state: 'old' };
    if (!res.ok) return { state: 'error' };
    return { state: 'ok', ...(await res.json()) };
  } catch {
    return { state: 'error' };
  }
}

async function fetchLatest(repo, branch) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`,
      { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return { state: 'error', status: res.status };
    const data = await res.json();
    return {
      state: 'ok',
      sha: data.sha,
      message: (data.commit?.message || '').split('\n')[0],
      time: data.commit?.committer?.date || '',
    };
  } catch {
    return { state: 'error' };
  }
}

export default function BuildCheck() {
  // Times are only shown after the first paint: the server and the phone are in
  // different time zones, and rendering a time on both would not match.
  const [now, setNow] = useState(0);
  const [host, setHost] = useState('');
  const [checking, setChecking] = useState(false);
  const [server, setServer] = useState(null);
  const [latest, setLatest] = useState(null);

  const branch = BUILD.branch || 'main';

  async function check() {
    setChecking(true);
    const [s, l] = await Promise.all([fetchServer(), fetchLatest(BUILD.repo, branch)]);
    setServer(s);
    setLatest(l);
    setNow(Date.now());
    setChecking(false);
  }

  useEffect(() => {
    setNow(Date.now());
    setHost(window.location.host);
    check();
  }, []);

  // ── Work out the verdict ───────────────────────────────────────────
  const screenSha = BUILD.sha;
  const serverSha = server?.state === 'ok' ? server.sha : '';
  const latestSha = latest?.state === 'ok' ? latest.sha : '';

  const screenStale = Boolean(screenSha && serverSha && screenSha !== serverSha);
  const serverOld   = server?.state === 'old';
  const behind      = Boolean(serverSha && latestSha && serverSha !== latestSha);
  const fresh       = behind && now - Date.parse(latest.time) < STILL_BUILDING_MS;

  let verdict = { tone: 'wait', title: 'Checking…', help: '' };
  if (!checking && server && latest) {
    if (!screenSha) {
      verdict = { tone: 'unknown', title: 'This build has no version stamp',
        help: 'It was built without commit details, so there is nothing to compare.' };
    } else if (serverOld) {
      verdict = { tone: 'bad', title: 'The server is on an older build than this screen',
        help: 'The address has gone back to a version from before this check existed. Look in Vercel for a rollback.' };
    } else if (server.state === 'error') {
      verdict = { tone: 'unknown', title: "Couldn't reach the server",
        help: 'Check your connection and try again.' };
    } else if (screenStale) {
      verdict = { tone: 'bad', title: 'Your phone is showing an old copy',
        help: 'The server has a different build. Close the app completely and reopen it.' };
    } else if (latest.state === 'error') {
      verdict = { tone: 'unknown', title: "This screen matches the server, but GitHub couldn't be checked",
        help: latest.status === 403 ? 'GitHub limits how often this can be asked. Try again in a few minutes.'
            : 'So it is not known whether a newer commit is waiting.' };
    } else if (behind && fresh) {
      verdict = { tone: 'wait', title: 'A newer commit is still building',
        help: `It was pushed ${ago(latest.time, now)}. Give it a minute, then tap Check again.` };
    } else if (behind) {
      verdict = { tone: 'bad', title: 'The newest commit is not live here',
        help: `It was pushed ${ago(latest.time, now)}. Vercel has not put it on this address: look there for a failed build or a rollback that needs undoing.` };
    } else {
      verdict = { tone: 'good', title: 'Up to date',
        help: 'This screen, the server and GitHub all have the same commit.' };
    }
  }

  const mark = ok => (ok ? '✓' : '✗');

  return (
    <div className={styles.card}>
      <div className={`${styles.verdict} ${styles[verdict.tone]}`}>
        <span className={styles.title}>{verdict.title}</span>
        {verdict.help && <span className={styles.help}>{verdict.help}</span>}
      </div>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt>This screen</dt>
          <dd>
            <code>{shortSha(screenSha)}</code>
            {BUILD.message && <span className={styles.message}>{BUILD.message}</span>}
            {now > 0 && BUILD.time && <span className={styles.meta}>built {clock(BUILD.time)} · {ago(BUILD.time, now)}</span>}
          </dd>
        </div>

        <div className={styles.row}>
          <dt>Server</dt>
          <dd>
            {!server ? <span className={styles.meta}>checking…</span>
              : server.state === 'ok' ? (
                <>
                  <code>{shortSha(server.sha)}</code>
                  <span className={styles.meta}>{mark(!screenStale)} {screenStale ? 'different from this screen' : 'same as this screen'}</span>
                </>
              ) : server.state === 'old' ? <span className={styles.meta}>✗ an older build with no version check</span>
              : <span className={styles.meta}>couldn&apos;t reach it</span>}
          </dd>
        </div>

        <div className={styles.row}>
          <dt>GitHub</dt>
          <dd>
            {!latest ? <span className={styles.meta}>checking…</span>
              : latest.state === 'ok' ? (
                <>
                  <code>{shortSha(latest.sha)}</code>
                  {behind && <span className={styles.message}>{latest.message}</span>}
                  <span className={styles.meta}>
                    {serverSha ? `${mark(!behind)} ${behind ? 'newer than the server' : 'same as the server'}` : `newest on ${branch}`}
                  </span>
                </>
              ) : <span className={styles.meta}>couldn&apos;t check</span>}
          </dd>
        </div>
      </dl>

      <div className={styles.foot}>
        <span className={styles.meta}>{host}{branch !== 'main' ? ` · branch ${branch}` : ''}</span>
        <button className={styles.again} onClick={check} disabled={checking}>
          {checking ? 'Checking…' : 'Check again'}
        </button>
      </div>
    </div>
  );
}
