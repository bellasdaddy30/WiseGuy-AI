#!/usr/bin/env bash
# Pushes every variable in .env.local to Vercel (production + preview).
# Run from the project folder after `vercel login` and `vercel link`.
# AUTH_URL is skipped: set it by hand once you know the live URL.
#
# Values are piped to the Vercel CLI and never printed.

set -u
ENV_FILE="$(dirname "$0")/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local not found at $ENV_FILE"
  exit 1
fi
if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: the Vercel CLI isn't installed (npm i -g vercel)."
  exit 1
fi

SKIP=(AUTH_URL)
failed=0

while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"                       # Windows line endings
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  line="${line#export }"
  key="${line%%=*}"
  value="${line#*=}"
  key="$(echo "$key" | xargs)"
  [[ -z "$key" || "$key" == "$line" ]] && continue

  # Strip one pair of wrapping quotes: KEY="value" or KEY='value'
  if [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]]; then value="${BASH_REMATCH[1]}"; fi

  for s in "${SKIP[@]}"; do
    if [[ "$key" == "$s" ]]; then echo "Skipping $key (set it by hand after deploy)"; continue 2; fi
  done
  if [[ -z "$value" ]]; then echo "Skipping $key (empty)"; continue; fi

  for target in production preview; do
    if out=$(printf '%s' "$value" | vercel env add "$key" "$target" --force 2>&1); then
      echo "OK      $key ($target)"
    else
      echo "FAILED  $key ($target): $(echo "$out" | tail -1)"
      failed=$((failed + 1))
    fi
  done
done < "$ENV_FILE"

echo ""
if [ "$failed" -gt 0 ]; then
  echo "$failed upload(s) failed — see above. Nothing was deployed."
  exit 1
fi
echo "All variables uploaded. Deploy with: vercel --prod"
echo "Then set the live URL:  vercel env add AUTH_URL production"
echo "  (e.g. https://wiseguy-ai.vercel.app)"
