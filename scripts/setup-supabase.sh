#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="nlaxpnbbtczqpaxcgvea"
BUCKET="ilaama-tracks"
AUDIO_FILE="assets/audio/I mean hello.wav"
STORAGE_PATH="I mean hello.wav"
FUNCTION_SLUG="get-track-url"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is not set."
  echo ""
  echo "1. Open https://supabase.com/dashboard/account/tokens"
  echo "2. Create a token"
  echo "3. Run: export SUPABASE_ACCESS_TOKEN='sbp_...'"
  echo "4. Run this script again"
  exit 1
fi

if [[ ! -f "$AUDIO_FILE" ]]; then
  echo "ERROR: Missing $AUDIO_FILE"
  exit 1
fi

SUPABASE_CMD=(npx --yes supabase@2)

echo "==> Linking project $PROJECT_REF"
"${SUPABASE_CMD[@]}" link --project-ref "$PROJECT_REF"

echo "==> Creating private storage bucket"
"${SUPABASE_CMD[@]}" db execute --file supabase/schema.sql --linked

echo "==> Uploading audio to $BUCKET/$STORAGE_PATH"
"${SUPABASE_CMD[@]}" storage cp "$AUDIO_FILE" "ss:///$BUCKET/$STORAGE_PATH" --linked --experimental

echo "==> Deploying Edge Function: $FUNCTION_SLUG"
"${SUPABASE_CMD[@]}" functions deploy "$FUNCTION_SLUG" --project-ref "$PROJECT_REF" --use-api

echo "==> Setting allowed origin for GitHub Pages"
"${SUPABASE_CMD[@]}" secrets set ALLOWED_ORIGINS="https://spinspinspinyou.github.io" --project-ref "$PROJECT_REF"

echo ""
echo "Done. Test with:"
echo "curl -X POST 'https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_SLUG}' \\"
echo "  -H 'apikey: YOUR_PUBLISHABLE_KEY' \\"
echo "  -H 'Authorization: Bearer YOUR_PUBLISHABLE_KEY' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"trackId\":\"i-mean-hello\"}'"
