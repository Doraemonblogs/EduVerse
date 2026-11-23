#!/bin/sh
# EduVerse 容器入口（Dockerfile 复制为 /usr/local/bin/eduverse-entrypoint）。
#
#   start（默认）     数据库迁移 → 准备 .next → 预渲染页面 → 启动 Next.js 生产服务
#                     迁移失败则退出（不带着旧表结构启动）；预渲染失败只告警，退回按需渲染
#   migrate           只执行迁移
#   migrate:status    查看迁移状态
#   其它              原样执行，如 `docker compose run --rm app sh`
#
# 环境变量（完整说明见 deploy/.env.production.example）：
#   DATABASE_URL       未设置时用 POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_HOST / POSTGRES_PORT / POSTGRES_DB 拼出
#                      （用户名、密码与库名会做 URL 编码，可以包含特殊字符）
#   PAYLOAD_SECRET     必填，至少 32 个字符
#   RUN_MIGRATIONS     设为 false 时跳过迁移（例如迁移已单独执行）
#   PRERENDER_ON_START 设为 false 时不预渲染，全部页面在访问时渲染（启动最快，CPU 占用高一些）
set -eu

BUILD_DIR=/app/.next-build
NEXT_DIR=/app/.next

log() {
  printf '[eduverse] %s\n' "$*"
}

fail() {
  printf '[eduverse] 错误：%s\n' "$*" >&2
  exit 1
}

if [ -z "${DATABASE_URL:-}" ]; then
  [ -n "${POSTGRES_PASSWORD:-}" ] || fail '未设置 DATABASE_URL，也未设置 POSTGRES_PASSWORD，无法连接数据库'
  DATABASE_URL="$(node -e '
    const e = process.env
    const enc = encodeURIComponent
    const user = enc(e.POSTGRES_USER || "eduverse")
    const host = e.POSTGRES_HOST || "db"
    const port = e.POSTGRES_PORT || "5432"
    const db = enc(e.POSTGRES_DB || "eduverse")
    process.stdout.write(`postgresql://${user}:${enc(e.POSTGRES_PASSWORD)}@${host}:${port}/${db}`)
  ')"
  export DATABASE_URL
fi

secret_length="$(printf '%s' "${PAYLOAD_SECRET:-}" | wc -c)"
[ "$secret_length" -ge 32 ] || fail 'PAYLOAD_SECRET 未设置或少于 32 个字符（生成：openssl rand -hex 32）'

payload_cli() {
  node node_modules/payload/bin.js "$@"
}

next_cli() {
  node node_modules/next/dist/bin/next "$@"
}

# 用镜像里的编译产物重置 .next：丢弃上次运行留下的预渲染页面与数据缓存。
# 缓存标签的失效记录只保存在进程内存里，重启后沿用旧的磁盘缓存可能读到后台早已修改的内容。
reset_next_dir() {
  find "$NEXT_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -R "$BUILD_DIR/." "$NEXT_DIR/"
}

# 连上数据库后预渲染静态页（next build 的 generate 模式），行为与 pnpm build 一致：
# 首页、课程 / 专业 / 作品 / 讲师 / 资讯 / 校区详情等生成静态 HTML 并按 ISR 定时更新。
prerender() {
  log '预渲染页面…'
  if next_cli build --experimental-build-mode=generate; then
    log '预渲染完成'
  else
    printf '[eduverse] 警告：%s\n' '预渲染失败（见上面的日志），改为按需渲染：页面在访问时渲染，功能不受影响' >&2
    reset_next_dir
  fi
}

command="${1:-start}"
case "$command" in
  start)
    if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
      log '执行数据库迁移…'
      payload_cli migrate || fail '数据库迁移失败，服务未启动（检查数据库连接与上面的日志）'
      log '迁移完成'
    else
      log '已跳过数据库迁移（RUN_MIGRATIONS=false）'
    fi
    reset_next_dir
    if [ "${PRERENDER_ON_START:-true}" != "false" ]; then
      prerender
    else
      log '已跳过预渲染（PRERENDER_ON_START=false），页面在访问时渲染'
    fi
    log "启动服务：端口 ${PORT:-3000}"
    # exec：Next.js 成为主进程（tini 之下），直接收到 docker stop 的 SIGTERM 并处理完进行中的请求
    exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "${PORT:-3000}"
    ;;
  migrate | migrate:status)
    payload_cli "$command"
    ;;
  *)
    exec "$@"
    ;;
esac
