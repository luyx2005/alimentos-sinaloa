#!/usr/bin/env bash
# Arranque por cada boot: deja PostgreSQL listo para recibir conexiones.
# La instalación de paquetes y la carga de datos ocurren en install.sh, no aquí.
set -euo pipefail

PG_VERSION="$(pg_lsclusters -h | awk 'NR==1{print $1}')"

echo "==> Iniciando PostgreSQL ($PG_VERSION main)"
sudo pg_ctlcluster "$PG_VERSION" main start || true

# Espera a que acepte conexiones antes de devolver el control.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    echo "==> PostgreSQL disponible."
    exit 0
  fi
  sleep 1
done

echo "!! PostgreSQL no respondió a tiempo." >&2
exit 1
