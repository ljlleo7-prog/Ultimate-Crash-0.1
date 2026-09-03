#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env not found at $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

export SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${VITE_SUPABASE_SERVICE_ROLE_KEY:-}}"

: "${SUPABASE_URL:?SUPABASE_URL or VITE_SUPABASE_URL is required in .env}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY is required in .env}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found in PATH" >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "Applying Supabase migrations..."
supabase db push

echo ""
echo "AIP Supabase schema deployed."
echo ""
echo "Next steps:"
echo "  1. Run: npm run export:aip-supabase-csv"
echo "  2. Run: npm run import:aip-supabase-csv"
echo "  3. Test: npm run test:aip-supabase-rpc"
