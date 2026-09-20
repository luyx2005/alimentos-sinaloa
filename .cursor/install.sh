#!/usr/bin/env bash
# Bootstrap idempotente del entorno para Cloud Agents.
# Instala PostgreSQL, prepara la base de datos y las dependencias del proyecto.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

DB_NAME="alimentos_sinaloa"
DB_USER="alimentos"
DB_PASSWORD="alimentos"

echo "==> Instalando PostgreSQL si hace falta"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

# Versión del cluster instalado (p. ej. 16).
PG_VERSION="$(pg_lsclusters -h | awk 'NR==1{print $1}')"

echo "==> Iniciando el cluster de PostgreSQL ($PG_VERSION main)"
sudo pg_ctlcluster "$PG_VERSION" main start || true

# Espera a que PostgreSQL acepte conexiones.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Creando rol y base de datos si no existen"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END \$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

echo "==> Escribiendo .env si no existe"
if [ ! -f .env ]; then
  cat > .env <<ENV
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
AUTH_SECRET="dev-secret-alimentos-sinaloa-change-me"
UPLOADS_DIR="./uploads"
ENV
fi

echo "==> Instalando dependencias de Node"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "==> Aplicando migraciones de Prisma"
npm run db:deploy

echo "==> Cargando datos iniciales (seed idempotente)"
npm run db:seed

echo "==> Listo. Entorno preparado."
