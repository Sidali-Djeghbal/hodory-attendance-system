#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-hodory}"
DB_USER="${DB_USER:-hodory}"
DB_PASSWORD="${DB_PASSWORD:-hodory}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"

has_cmd() { command -v "$1" >/dev/null 2>&1; }

generate_secret() {
  if has_cmd python3; then
    python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
  elif has_cmd python; then
    python - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
  else
    # Fallback: not cryptographically ideal, but better than empty
    date +%s | sha256sum | awk '{print $1}'
  fi
}

ensure_env_file() {
  if [[ -f "${ENV_FILE}" ]]; then
    echo "✅ ${ENV_FILE} already exists. Skipping creation."
    return
  fi

  local secret
  secret="$(generate_secret)"

  cat > "${ENV_FILE}" <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
SECRET_KEY=${secret}
EOF

  echo "✅ Created ${ENV_FILE}"
}

create_role_and_db() {
  local psql_cmd=()
  if has_cmd sudo; then
    psql_cmd=(sudo -u postgres psql)
  else
    psql_cmd=(psql -U postgres)
  fi

  # Check role
  if "${psql_cmd[@]}" -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    echo "✅ Role '${DB_USER}' already exists."
  else
    "${psql_cmd[@]}" -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';"
    echo "✅ Created role '${DB_USER}'."
  fi

  # Check database
  if "${psql_cmd[@]}" -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    echo "✅ Database '${DB_NAME}' already exists."
  else
    "${psql_cmd[@]}" -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
    echo "✅ Created database '${DB_NAME}'."
  fi
}

echo "➡️  Setting up local PostgreSQL for Hodory..."
echo "   DB_NAME=${DB_NAME}"
echo "   DB_USER=${DB_USER}"
echo "   DB_HOST=${DB_HOST}"
echo "   DB_PORT=${DB_PORT}"

create_role_and_db
ensure_env_file

echo "✅ Local DB setup complete."
echo "Next:"
echo "  cd ${ROOT_DIR}"
echo "  INIT_DB_ON_STARTUP=1 RELOAD=0 python runserver.py"
