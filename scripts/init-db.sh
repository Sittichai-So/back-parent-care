#!/usr/bin/env bash
# Applies scripts/init-db.js (collection validators + indexes) to the
# database pointed at by MONGODB_URI. Reads that variable from ../.env if
# it isn't already set in the environment. Safe to re-run.
#
# Usage:
#   ./scripts/init-db.sh                       # uses MONGODB_URI from ../.env
#   MONGODB_URI="mongodb://..." ./scripts/init-db.sh   # explicit override

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -z "${MONGODB_URI:-}" ] && [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [ -z "${MONGODB_URI:-}" ]; then
  echo "MONGODB_URI is not set (checked the environment and $ENV_FILE)." >&2
  exit 1
fi

if ! command -v mongosh >/dev/null 2>&1; then
  echo "mongosh is not installed or not on PATH. Install the MongoDB Shell: https://www.mongodb.com/docs/mongodb-shell/install/" >&2
  exit 1
fi

echo "Applying $SCRIPT_DIR/init-db.js to $MONGODB_URI ..."
mongosh "$MONGODB_URI" "$SCRIPT_DIR/init-db.js"
