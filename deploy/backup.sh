#!/usr/bin/env bash
# EduVerse 备份：数据库（pg_dump 自定义格式，已压缩）+ 媒体文件（tar.gz），保留最近 N 天。
#
# 用法（在项目根目录或任意目录执行均可）：
#   deploy/backup.sh
# 定时（root 的 crontab，每天 03:17）：
#   17 3 * * * /srv/eduverse/deploy/backup.sh >> /var/log/eduverse-backup.log 2>&1
#
# 读取 deploy/.env.production（可用 ENV_FILE 指定其它文件）中的：
#   BACKUP_DIR        备份目录，默认 /var/backups/eduverse（目录权限设为 700：备份含线索个人信息）
#   BACKUP_KEEP_DAYS  保留天数，默认 7
# compose 项目名默认 eduverse（docker-compose.yml 的 name），可用 COMPOSE_PROJECT_NAME 覆盖。
# 只备份 compose 内的 db 服务：配置了 DATABASE_URL（外部数据库）时拒绝执行，外部数据库请用其自身的备份方案（如云数据库快照）。
#
# 产物：<BACKUP_DIR>/eduverse-<时间>-db.dump、eduverse-<时间>-media.tar.gz。恢复见 deploy/restore.sh 与 README「运维」。
# 备份只在本机，建议另行同步到其它机器或对象存储（异地备份）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/deploy/.env.production}"

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

die() {
  printf '[%s] 错误：%s\n' "$(date '+%F %T')" "$*" >&2
  exit 1
}

[ -f "$ENV_FILE" ] || die "找不到配置文件 $ENV_FILE（从 deploy/.env.production.example 复制）"

# 只读取备份相关的两个变量（不 source 整个文件：值里可能有 shell 特殊字符）
read_env() {
  local value
  value="$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

# 外部数据库（DATABASE_URL）时 compose 里的 db 服务是一个未使用的空库：备份它会得到“成功”但没有数据的备份
external_db="${DATABASE_URL:-$(read_env DATABASE_URL)}"
[ -z "$external_db" ] || die '配置了 DATABASE_URL（外部数据库）：本脚本只备份 compose 内的 db 服务，外部数据库请用其自身的备份方案'

BACKUP_DIR="${BACKUP_DIR:-$(read_env BACKUP_DIR)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/eduverse}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-$(read_env BACKUP_KEEP_DAYS)}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
[[ "$BACKUP_KEEP_DAYS" =~ ^[0-9]+$ ]] || die "BACKUP_KEEP_DAYS 必须是整数：$BACKUP_KEEP_DAYS"

compose() {
  docker compose --project-directory "$ROOT" -f "$ROOT/docker-compose.yml" --env-file "$ENV_FILE" "$@"
}

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

stamp="$(date +%Y%m%d-%H%M%S)"
db_file="$BACKUP_DIR/eduverse-$stamp-db.dump"
media_file="$BACKUP_DIR/eduverse-$stamp-media.tar.gz"

# 先写临时文件，成功后再改名：中途失败不会留下看似完整的备份
cleanup() {
  rm -f "$db_file.partial" "$media_file.partial"
}
trap cleanup EXIT

log "备份数据库 → $db_file"
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  > "$db_file.partial"
# 校验：完整读一遍归档（--list 只读目录，截断的文件也能通过；输出到 /dev/null 会解压并读取全部数据块）
compose exec -T db pg_restore -f /dev/null < "$db_file.partial" || die '数据库备份校验失败'
mv "$db_file.partial" "$db_file"

log "备份媒体文件 → $media_file"
# 用一次性容器挂载 media 卷打包（app 是否在运行都可以）
compose run --rm --no-deps -T --entrypoint tar app -C /app -czf - media > "$media_file.partial"
gzip -t "$media_file.partial" || die '媒体备份校验失败'
mv "$media_file.partial" "$media_file"

log "清理 $BACKUP_KEEP_DAYS 天前的备份"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'eduverse-*' -mtime "+$BACKUP_KEEP_DAYS" -print -delete

log "完成：$(du -h "$db_file" | cut -f1) 数据库，$(du -h "$media_file" | cut -f1) 媒体"
