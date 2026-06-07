#!/bin/bash
# 数据库备份脚本
# 用法: ./scripts/backup.sh [backup_dir]
# 默认备份到 ./backups/

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
DB_DIR="./apps/api"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
DB_FILE="${DB_DIR}/data.db"
BACKUP_PATH="${BACKUP_DIR}/data-${TIMESTAMP}.db"

mkdir -p "${BACKUP_DIR}"

if [ -f "${DB_FILE}" ]; then
  sqlite3 "${DB_FILE}" ".backup '${BACKUP_PATH}'"
  echo "Backup created: ${BACKUP_PATH}"

  find "${BACKUP_DIR}" -name "*.db" -mtime +7 -delete
  echo "Cleaned up backups older than 7 days"
else
  echo "Database file not found: ${DB_FILE}"
  exit 1
fi