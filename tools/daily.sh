#!/usr/bin/env bash
# The daily run of Trani, 05:00 Vietnam time (trani.timer): write the recipes of the next days, test, build,
# commit and push. GitHub Actions then puts the new page online in about a minute.
#   tools/daily.sh            the real run
#   tools/daily.sh --dry-run  only say what would change
set -euo pipefail
cd "$(dirname "$0")/.."
export TZ=Asia/Ho_Chi_Minh
git pull --ff-only -q
node tools/next-day.ts "$@"
if [ "${1:-}" = "--dry-run" ]; then exit 0; fi
if git diff --quiet -- days && [ -z "$(git ls-files --others --exclude-standard days)" ]; then
  echo "nothing to push"
  exit 0
fi
npm test >/dev/null
npm run build >/dev/null
git add days
days=$(git diff --cached --name-only -- days | sed 's#days/##; s#\.json##' | tr '\n' ' ')
git -c user.name=Alpha -c user.email=tdtrinh.web@gmail.com commit -q -m "Plan: $days"
git push -q origin main
echo "pushed: $days"
