# WiseGuy AI (formerly SmartAss AI) — Project Notes for Claude Code

Renamed from SmartAss AI to **WiseGuy AI** on 2026-10-05. The GitHub repo is
`bellasdaddy30/WiseGuy-AI` (the old `Smartass-AI` URL still redirects); the package
name is `wiseguy-ai`. Read this fully first.

## Who you're working with

- **Chris** (GitHub: `bellasdaddy30`). Capable, hands-on, learning as he builds.
- Explain the important parts plainly; don't over-explain trivial commands.
- Preferred loop: *what we're doing → run this → what it should show → verify → next.*
- Never claim something works without testing it. Never fabricate results.
- He's been burned by stacked untested changes. One verified step at a time.
- Humor is welcome; don't let it slow down the fix.

## Machine / environment

- Dev machine: **Ragnarok**, Lubuntu, user `fenrir`, project at `~/smartass-ai`.
- Chris mostly uses the app on an **iPhone**, often installed to the Home Screen (PWA).
  Safari's built-in speech recognition does NOT work in Home Screen apps (WebKit bug
  225298), so voice input falls back to recording + `/api/transcribe` (Whisper on Groq).
- Firefox on Ragnarok is a snap and spams harmless warnings. Prefer doing web logins
  on Chris's phone.
- Deploy target: Vercel (`vercel.json`, `scripts/push-env-to-vercel.sh`).
- **Never print, echo, log, or commit a token or API key.** Chris edits `.env.local` himself.

## Server-side secrets / env vars (names only)

`GROQ_API_KEY`, `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `OPENAI_API_KEY`,
`ELEVENLABS_API_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`,
`ADMIN_PIN`, `DATABASE_URL` (added to Vercel by the Neon integration; Ragnarok has none).
Optional: `HF_TOKEN` (Hugging Face read token, for the Qwen voice),
`QWEN_SPACE` (use a different Space than the default).

## Database (who has signed in, and their plan)

- Postgres on **Neon**, free plan, connected through Vercel's Marketplace. It sleeps after
  5 idle minutes and wakes itself on the next query, so the first request after a quiet
  spell is a second or two slower.
- **No passwords are stored, ever.** Sign-in is Google via Auth.js (`auth.js`). The app
  keeps one row per person in `users`, keyed on Google's permanent ID for them.
- `lib/db.js` is the only file that talks to Postgres (driver: `pg`). It creates missing
  tables the first time it is used, so there is no migration step. To add a table or a
  column, add an `IF NOT EXISTS` statement to `SCHEMA` there.
- `lib/users.js` writes the row at sign-in (`recordSignIn`) and reads it (`getUser`).
  Signing in never changes `plan`. Always pass values as `$1, $2` parameters.
- `/api/health` says whether the server can reach the database: `ok`, `not_configured` or
  `error`. Check it after a deploy that touches the database.
- With no `DATABASE_URL` the app still runs and sign-in still works; nothing is saved on
  the server and the Account page says so. A database outage must never block sign-in.
- Still on the device only (localStorage), not in the database yet: chat history, memory,
  settings, voice tuning.
- Not done yet: `/api/chat` and the free voices do not check who is calling, and
  `useIsPremium()` still returns true for everyone.

## Admin lock (paid voices)

ElevenLabs, OpenAI, Orpheus and Qwen voices and the voice designer spend Chris's credits or
quota. They are gated **on the server** by `lib/adminAuth.js`: `/api/admin-unlock`
checks `ADMIN_PIN` and sets a signed httpOnly cookie (signed with `AUTH_SECRET`); the
paid routes call `isAdmin(request)`. With no `ADMIN_PIN`, paid features are open in
`npm run dev` and closed in production. Never gate paid features only in the UI.

## Qwen voice

- Runs on Chris's own Hugging Face Space, `Moneynbanks/Qwen3-TTS`, a copy of Qwen's demo
  on the free shared GPU. `lib/qwen.js` is the client; `/api/tts` provider `qwen` uses it.
- The free GPU allowance is tiny (minutes per day), so chat sends a whole reply in ONE
  request instead of sentence by sentence, and steps down to Google when the allowance
  runs out. Don't add anything that calls the Space in a loop.
- `node scripts/qwen-check.mjs` tests the real Space from Ragnarok (one generation).
  Cloud sessions cannot reach Hugging Face, so that script is how it gets verified.

## Deploys (how to tell a change is live)

- Every push to `main` builds on Vercel and should go live at `wiseguy-ai.vercel.app`.
- **Settings → App Version** in the app (`components/BuildCheck.js`, `/api/version`,
  stamped in `next.config.mjs`) shows the commit this screen is running, the commit the
  server is serving, and the newest commit on GitHub. Check it after a push instead of
  assuming the deploy landed.
- This repo is also edited from cloud Claude sessions, so the copy on Ragnarok is often
  behind `main`.
- Vercel **Instant Rollback** turns off automatic updates for the public address until
  **Undo Rollback** is clicked on the project's production tile. That froze the address
  for a day on 2026-10-05. Don't roll back without telling Chris it has to be undone.

## Product vision (condensed from Chris's brief)

SmartAss AI: a real, monetizable AI assistant platform with a strong, *configurable*
personality — not a generic ChatGPT clone.

Planned sections: AI Chat, AI Model (provider-agnostic selection), Customization
(personality/tone/humor/sarcasm/length/creativity/persona → feeds the system prompt, not
just cosmetics), Paid Material (premium features/personalities — architecture only, no fake
payments), Account Management (real auth, no credentials in client storage), Settings
(organized, not one giant page). Also: voice input (browser `SpeechRecognition` /
`webkitSpeechRecognition` — an earlier demo worked when served with
`npm run dev -- --hostname 0.0.0.0`), conversation history, and a possible Alliteration.ai
integration (research what it actually offers/API/pricing first — never invent an API).

Architecture direction (create pieces only when needed):

```
User → UI (app/, components/) → app API routes (app/api/*) → provider layer (lib/ai, lib/providers) → model
```

- Secrets server-side only (`.env.local`, never in client components).
- UI must not know provider internals.
- Friendly error states ("The AI service isn't responding right now."), loading/empty states.
- Mobile/tablet usability matters.

History notes: an early `next.config.mjs` caused a module-format problem and was removed.
Inspect actual file contents before changing anything — don't overwrite blind.

## Phase plan

1. **Inspect & stabilize** existing project ← NEXT after the push
   (`ls -la app`, read `package.json`, every file in `app/`, `npm run dev`, confirm it loads,
   report what works / what's broken / what to keep)
2. App shell & navigation
3. Core chat UI
4. Secure chat backend
5. Model selection
6. Personality/customization
7. Voice input
8. Conversation history
9. Accounts/auth
10. Settings
11. Premium architecture
12. Alliteration.ai (research first)
13. UI polish
14. Security review
15. Deployment

## Hard rules

- Don't delete/recreate the project. Don't reinstall everything without evidence.
- No dumping hundreds of lines at once; build in small, verified steps.
- Don't add dependencies without a reason. Prefer free/open-source; flag any cost.
- No fake auth or payments presented as production-ready.
- Before changing anything, run `git pull --ff-only origin main`. If it refuses, stop and
  tell Chris; don't force it.
- Ask before destructive git operations (force-push, reset --hard, rm).
- After each step is verified working in the browser, commit with a descriptive message and push to main immediately. Never commit `.env` files of any kind.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
