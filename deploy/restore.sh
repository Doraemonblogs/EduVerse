#!/usr/bin/env bash
# EduVerse 恢复：用 deploy/backup.sh 生成的备份覆盖当前数据库与媒体文件。**会删除现有数据**。
#
# 用法：
#   deploy/restore.sh <备份目录>/eduverse-<时间>-db.dump [<备份目录>/eduverse-<时间>-media.tar.gz] --yes
#   媒体文件省略时只恢复数据库。必须带 --yes，否则只打印将要执行的操作。
#
# 步骤：停止 app → 重建数据库并 pg_restore → 清空并解压 media 卷 → 启动 app（入口脚本会执行迁移：
# 备份早于当前代码时，缺少的迁移会补上）。恢复前建议先执行一次 deploy/backup.sh 留底。
# 用于：误删数据、服务器迁移、以及升级后回滚（M2 迁移无法 migrate:down，回滚一律用“升级前的备份 + 旧镜像”，见 README）。
# 回滚时先 `export APP_IMAGE=eduverse-app:prev` 再执行本脚本：最后一步启动的 app 会执行迁移，必须是旧镜像，
# 否则新版本的迁移会写进刚恢复的数据库。
# APP_IMAGE、COMPOSE_PROJECT_NAME 等 shell 环境变量优先于配置文件，会传给下面的 docker compose。
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

db_file=""
media_file=""
confirmed=false
for arg in "$@"; do
  case "$arg" in
    --yes) confirmed=true ;;
    *.dump) db_file="$arg" ;;
    *.tar.gz) media_file="$arg" ;;
    *) die "无法识别的参数：$arg" ;;
  esac
done

[ -n "$db_file" ] || die '用法：deploy/restore.sh <db.dump> [<media.tar.gz>] --yes'
[ -f "$db_file" ] || die "找不到数据库备份：$db_file"
[ -z "$media_file" ] || [ -f "$media_file" ] || die "找不到媒体备份：$media_file"
[ -f "$ENV_FILE" ] || die "找不到配置文件 $ENV_FILE"

compose() {
  docker compose --project-directory "$ROOT" -f "$ROOT/docker-compose.yml" --env-file "$ENV_FILE" "$@"
}

log "将恢复数据库：$db_file"
[ -z "$media_file" ] || log "将恢复媒体文件：$media_file"
# 与 compose 的取值顺序一致：shell 环境变量 > 配置文件 > docker-compose.yml 中的默认值
app_image="${APP_IMAGE:-$(grep -E '^APP_IMAGE=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)}"
log "恢复后用镜像 ${app_image:-eduverse-app:latest} 启动 app 并执行迁移（回滚时应为旧镜像：先 export APP_IMAGE=…）"
log '当前数据库与媒体文件会被覆盖。'
if [ "$confirmed" != true ]; then
  log '未带 --yes，未做任何修改。'
  exit 0
fi

log '检查备份文件'
compose up -d --wait db
compose exec -T db pg_restore --list < "$db_file" > /dev/null || die '数据库备份无法读取'
[ -z "$media_file" ] || gzip -t "$media_file" || die '媒体备份无法读取'

log '停止 app'
compose stop app

log '重建数据库'
compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --exit-on-error' < "$db_file"

if [ -n "$media_file" ]; then
  log '恢复媒体文件'
  compose run --rm --no-deps -T --entrypoint sh app -c 'find /app/media -mindepth 1 -delete && tar -C /app -xzf -' \
    < "$media_file"
fi

log '启动 app（会先执行迁移）'
compose up -d app
log '完成。用 docker compose logs -f app 查看启动日志。'
