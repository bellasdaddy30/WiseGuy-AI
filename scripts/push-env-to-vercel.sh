#!/usr/bin/env bash
# Pushes all env vars from .env.local to Vercel (production + preview).
# Run from ~/smartass-ai after `vercel login` and `vercel link`.
# AUTH_URL is set after deploy once we know the live URL.

set -e
ENV_FILE="$(dirname "$0")/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local not found at $ENV_FILE"
  exit 1
fi

# Keys to skip — set these manually after deploy
SKIP="AUTH_URL"

while IFS='=' read -r key rest; do
  # Skip comments, blanks, and manually-set keys
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  [[ "$SKIP" == *"$key"* ]] && echo "Skipping $key (set manually after deploy)" && continue

  value="${rest}"
  echo "Adding $key..."
  printf '%s' "$value" | vercel env add "$key" production --force 2>/dev/null || true
  printf '%s' "$value" | vercel env add "$key" preview    --force 2>/dev/null || true
done < "$ENV_FILE"

echo ""
echo "Done. Now deploy with: vercel --prod"
echo "After you get the live URL, run:"
echo "  vercel env add AUTH_URL production"
echo "  (paste your URL, e.g. https://wiseguy-ai.vercel.app)"
