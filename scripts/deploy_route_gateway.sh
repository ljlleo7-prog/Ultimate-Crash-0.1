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

: "${SUPABASE_URL:?SUPABASE_URL is required in .env}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required in .env}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required in .env}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found in PATH" >&2
  exit 1
fi

cd "$ROOT_DIR"

supabase db push
supabase functions deploy route-provider-gateway
