#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${GITHUB_ENV:-}" ]]; then
  echo "GITHUB_ENV is required" >&2
  exit 1
fi

status_env="$(mktemp)"
supabase status -o env > "$status_env"

{
  sed -n 's/^API_URL=/NEXT_PUBLIC_SUPABASE_URL=/p' "$status_env"
  sed -n 's/^ANON_KEY=/NEXT_PUBLIC_SUPABASE_ANON_KEY=/p' "$status_env"
  sed -n 's/^SERVICE_ROLE_KEY=/SUPABASE_SERVICE_ROLE_KEY=/p' "$status_env"
} >> "$GITHUB_ENV"

rm -f "$status_env"
