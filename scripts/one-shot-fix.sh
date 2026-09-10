#!/usr/bin/env bash
# One-shot: sync teacher password, commit code fix, and push to git.
# Run from repo root:
#   ! bash scripts/one-shot-fix.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1/4 Sync teacher password to DB ==="
node scripts/run-ensure-teacher.cjs

echo "=== 2/4 Stage files ==="
git add .gitignore src/lib/env.ts scripts/run-ensure-teacher.cjs scripts/one-shot-fix.sh || true

echo "=== 3/4 Commit ==="
git commit -m "fix(auth): align TEACHER_PASSWORD fallback; add teacher-sync script + login report

- env.ts: TEACHER_PASSWORD fallback now 'ChangeMe123!' (was 'teacher2024')
  to match prisma/ensure-teacher.ts default
- add scripts/run-ensure-teacher.cjs (one-off DB sync, reads .env, never
  prints secrets, upserts teacher studentId='0')
- reports/, prove-login.cjs, debug-session.cjs gitignored (contain creds)

Co-Authored-By: Claude <noreply@anthropic.com>" || echo "(nothing to commit or commit failed)"

echo "=== 4/4 Push to origin master ==="
git push origin master 2>&1 || echo "PUSH FAILED - run 'git push origin master' manually"

echo "=== DONE ==="