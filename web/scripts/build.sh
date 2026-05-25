#!/usr/bin/env bash
set -euo pipefail

# Neon's compute endpoint can be scaled-to-zero when a Vercel build starts.
# Prisma's default connect timeout is too short to outwait the cold-start
# wake-up, so `migrate deploy` returns P1001 on the first try. Retry with
# exponential backoff before giving up — keeps deploys green without
# disabling Neon's scale-to-zero.

pnpm exec prisma generate

attempts=5
delay=3
for i in $(seq 1 "$attempts"); do
  if pnpm exec prisma migrate deploy; then
    break
  fi
  if [ "$i" -eq "$attempts" ]; then
    echo "prisma migrate deploy failed after $attempts attempts" >&2
    exit 1
  fi
  echo "prisma migrate deploy attempt $i failed (neon cold start?), retrying in ${delay}s..." >&2
  sleep "$delay"
  delay=$((delay * 2))
done

pnpm exec next build
