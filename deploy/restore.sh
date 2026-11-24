#!/usr/bin/env bash
# EduVerse 恢复：用 deploy/backup.sh 生成的备份替换当前数据库与媒体文件。
#
# 用法：
#   deploy/restore.sh [--app-image=<镜像>] <备份目录>/eduverse-<时间>-db.dump [<备份目录>/eduverse-<时间>-media.tar.gz] --yes
#   媒体文件省略时只恢复数据库。必须带 --yes，否则只打印将要执行的操作。
#   --app-image：恢复后启动 app 所用的镜像（回滚时传旧镜像，如 --app-image=eduverse-app:prev）。
#     也可以用环境变量 APP_IMAGE，但 sudo 默认会丢掉环境变量，回滚时请用参数。
#
# 步骤：
#   1. 完整读一遍备份文件（截断或损坏的备份在这里就失败，现有数据不动）；
#   2. 恢复到临时数据库 <库名>_restore（站点照常运行；失败则删除临时库，现有数据不动）；
#   3. 停止 app → 现有数据库改名为 <库名>_before_restore 保留（上一次留下的同名库会先删除）→ 临时库改名为正式库名；
#   4. 清空并解压 media 卷（如有）；
#   5. 启动 app（入口脚本会执行迁移：备份早于当前代码时，缺少的迁移会补上）。
#   确认站点正常后，按最后打印的命令删除 <库名>_before_restore 释放空间。恢复期间磁盘上同时有两份数据库。
# 用于：误删数据、服务器迁移、以及升级后回滚（M2 迁移无法 migrate:down，回滚一律用“升级前的备份 + 旧镜像”，见 README）。
# 回滚时必须用 --app-image 指定旧镜像：最后一步启动的 app 会执行迁移，如果是新镜像，新版本的迁移会写进刚恢复的数据库。
# 只支持 compose 内的 db 服务：配置了 DATABASE_URL（外部数据库）时拒绝执行。
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

# 读取配置文件中的单个变量（不 source 整个文件：值里可能有 shell 特殊字符）
read_env() {
  local value
  value="$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

db_file=""
media_file=""
confirmed=false
app_image_arg=""
expect_image=false
for arg in "$@"; do
  if [ "$expect_image" = true ]; then
    app_image_arg="$arg"
    expect_image=false
    continue
  fi
  case "$arg" in
    --yes) confirmed=true ;;
    --app-image=*) app_image_arg="${arg#--app-image=}" ;;
    --app-image) expect_image=true ;;
    *.dump) db_file="$arg" ;;
    *.tar.gz) media_file="$arg" ;;
    *) die "无法识别的参数：$arg" ;;
  esac
done
[ "$expect_image" = false ] || die '--app-image 后缺少镜像名'

[ -n "$db_file" ] || die '用法：deploy/restore.sh [--app-image=<镜像>] <db.dump> [<media.tar.gz>] --yes'
[ -f "$db_file" ] || die "找不到数据库备份：$db_file（备份目录权限为 700，非 root 用户需要 sudo）"
[ -z "$media_file" ] || [ -f "$media_file" ] || die "找不到媒体备份：$media_file"
[ -f "$ENV_FILE" ] || die "找不到配置文件 $ENV_FILE"

external_db="${DATABASE_URL:-$(read_env DATABASE_URL)}"
[ -z "$external_db" ] || die '配置了 DATABASE_URL（外部数据库）：本脚本只恢复 compose 内的 db 服务，外部数据库请用其自身的恢复方案'

# 镜像：--app-image > shell 环境变量 APP_IMAGE > 配置文件 > docker-compose.yml 中的默认值（与 compose 的取值顺序一致）
if [ -n "$app_image_arg" ]; then
  export APP_IMAGE="$app_image_arg"
fi
app_image="${APP_IMAGE:-$(read_env APP_IMAGE)}"
app_image="${app_image:-eduverse-app:latest}"

compose() {
  docker compose --project-directory "$ROOT" -f "$ROOT/docker-compose.yml" --env-file "$ENV_FILE" "$@"
}

# 在 db 容器内执行 SQL（连接维护库 postgres；库名来自容器内的 POSTGRES_DB）
psql_admin() {
  compose exec -T -e PGOPTIONS='-c client_min_messages=warning' db \
    sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -qAt "$@"' sh "$@"
}

log "将恢复数据库：$db_file"
[ -z "$media_file" ] || log "将恢复媒体文件：$media_file"
log "恢复后用镜像 $app_image 启动 app 并执行迁移（回滚时应为旧镜像：加 --app-image=<旧镜像>）"
log '现有数据库会改名保留为 <库名>_before_restore（上一次留下的同名库会被删除）；媒体文件会被覆盖。'
if [ "$confirmed" != true ]; then
  log '未带 --yes，未做任何修改。'
  exit 0
fi

compose up -d --wait db
db_name="$(compose exec -T db sh -c 'printf %s "$POSTGRES_DB"')"
[[ "$db_name" =~ ^[A-Za-z_][A-Za-z0-9_]{0,40}$ ]] || die "库名不符合预期：$db_name"
restore_db="${db_name}_restore"
backup_db="${db_name}_before_restore"

log '检查备份文件（完整读取）'
compose exec -T db pg_restore -f /dev/null < "$db_file" || die '数据库备份无法完整读取（文件损坏或不完整），现有数据未改动'
[ -z "$media_file" ] || gzip -t "$media_file" || die '媒体备份无法读取，现有数据未改动'

log "恢复到临时数据库 $restore_db（站点照常运行）"
psql_admin -c "DROP DATABASE IF EXISTS \"$restore_db\" WITH (FORCE)"
psql_admin -c "CREATE DATABASE \"$restore_db\""
if ! compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --no-privileges --exit-on-error --single-transaction' sh "$restore_db" < "$db_file"; then
  psql_admin -c "DROP DATABASE IF EXISTS \"$restore_db\" WITH (FORCE)" || true
  die '恢复到临时数据库失败，已删除临时库，现有数据未改动'
fi

log '停止 app'
compose stop app

log "切换数据库：$db_name → $backup_db，$restore_db → $db_name"
psql_admin -c "DROP DATABASE IF EXISTS \"$backup_db\" WITH (FORCE)"
if [ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname = '$db_name'")" = 1 ]; then
  psql_admin -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db_name' AND pid <> pg_backend_pid()" > /dev/null
  psql_admin -c "ALTER DATABASE \"$db_name\" RENAME TO \"$backup_db\""
fi
psql_admin -c "ALTER DATABASE \"$restore_db\" RENAME TO \"$db_name\""

if [ -n "$media_file" ]; then
  log '恢复媒体文件'
  compose run --rm --no-deps -T --entrypoint sh app -c 'find /app/media -mindepth 1 -delete && tar -C /app -xzf -' \
    < "$media_file"
fi

log "启动 app（镜像 $app_image，会先执行迁移）"
compose up -d app
log '完成。用 docker compose logs -f app 查看启动日志。'
log "恢复前的数据库保留为 $backup_db；确认站点正常后删除以释放空间："
log "  docker compose --env-file $ENV_FILE exec db sh -c 'dropdb -U \"\$POSTGRES_USER\" $backup_db'"
