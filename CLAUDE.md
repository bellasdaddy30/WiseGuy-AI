# SmartAss AI — Project Handoff for Claude Code

This file carries context from a planning session (claude.ai cloud, Oct 2026) into
local Claude Code sessions on **Ragnarok**. Read it fully before doing anything.

## Who you're working with

- **Chris** (GitHub: `bellasdaddy30`). Capable, hands-on, learning as he builds.
- Explain the important parts plainly; don't over-explain trivial commands.
- Preferred loop: *what we're doing → run this → what it should show → verify → next.*
- Never claim something works without testing it. Never fabricate results.
- He's been burned by stacked untested changes. One verified step at a time.
- Humor is welcome; don't let it slow down the fix.

## Machine / environment (verified)

- Machine: **Ragnarok**, Lubuntu (apt, not Termux/pkg), user `fenrir`, controlled via RustDesk.
- Project path: `~/smartass-ai` (Next.js / React / Node). Contains `app/`, `node_modules/`,
  `package.json`, `package-lock.json`. Original handoff said it was on a Fire tablet —
  **it is actually on Ragnarok.**
- Firefox is a snap and spams harmless warnings (`cannot change mount namespace`,
  `Gtk-WARNING ... settings.ini: Permission denied`). Ignore them. Browser-based logins
  launched from the terminal are flaky — prefer doing web approvals on Chris's phone.
- `gh` 2.46.0 installed via apt. `gh auth status` shows logged in as `bellasdaddy30`
  (token in keyring).
- No API keys were found hardcoded in `app/` or `package.json` (`grep -rn "sk-"` was clean).

## GitHub repo

- Remote: `https://github.com/bellasdaddy30/Smartass-AI.git` — **private**.
- `main` has only a README commit. None of the project code has been pushed yet.
- This file lives on branch `claude/smartass-ai-handoff-6g7665`.

### Current blocker: git auth (state at handoff)

Already done in `~/smartass-ai`:
- `.gitignore` contains `node_modules/`, `.env*`, `!.env.example`, `.next/`
- `git init -b main` and `git remote add origin ...` — done
- `gh auth setup-git` — done (`~/.gitconfig` has a global `credential.helper store`, plus
  github.com-scoped helpers reset to `!/usr/bin/gh auth git-credential`)

Symptom: `git fetch origin main` → `remote: Invalid username or token. Password
authentication is not supported for Git operations.`

Evidence collected:
- `gh api repos/bellasdaddy30/Smartass-AI` works (private: true). Note: the `permissions`
  field there reflects the *account's* role, not the token's scopes — it proves nothing
  about the token's Contents access.
- `gh auth git-credential get` returns `username=bellasdaddy30` and the same
  `github_pat_...` token gh uses. So the helper wiring is fine.
- Leading hypothesis: the **fine-grained** PAT lacks **Contents: Read and write**
  (git refuses it while basic API metadata calls succeed). Test without exposing the token:
  `gh api repos/bellasdaddy30/Smartass-AI/contents/README.md --jq .name`
  → 403 "Resource not accessible by personal access token" confirms.
- Fix options (Chris may already have done one):
  1. Edit the fine-grained token on github.com → Repository permissions → Contents: Read and write.
  2. Or replace it with a **classic** token (`repo` + `read:org`, 30-day expiry) via
     `gh auth login` → Paste an authentication token.
- **Never print, echo, log, or commit a token.** Don't `cat ~/.git-credentials`.

### Push sequence once auth works

```bash
cd ~/smartass-ai
git fetch origin main
git reset origin/main          # adopt remote history; does NOT touch working files
git checkout -- README.md      # restore the remote README into the working tree
git add .
git status                     # SHOW CHRIS: no node_modules/, .next/, or .env* allowed
git commit -m "Baseline: existing SmartAss AI project"
git push -u origin main
```
Then bring this handoff file in: `git fetch origin claude/smartass-ai-handoff-6g7665 &&
git checkout origin/claude/smartass-ai-handoff-6g7665 -- CLAUDE.md` and commit it to main.

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
- Ask before destructive git operations (force-push, reset --hard, rm).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
