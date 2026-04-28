#!/usr/bin/env bash
set -a
. "$(dirname "$0")/../.env.local"
set +a

echo "--- LP Agent ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "x-api-key: ${LPAGENT_API_KEY}" \
  "${LPAGENT_BASE_URL}/open-api/v1/pools/discover?pageSize=1"

echo "--- Supabase ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  "${SUPABASE_URL}/auth/v1/settings"

echo "--- Helius devnet ---"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  "${HELIUS_DEVNET_RPC_URL}"
