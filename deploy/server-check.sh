#!/usr/bin/env bash
# 部署前的只读检查：不安装、不修改、不重启任何东西，只打印服务器现状，
# 用来确定怎样部署 EduVerse 才不影响服务器上已有的服务（端口、nginx 站点、Docker 容器、内存与磁盘）。
#
# 用法（root 或有 sudo 权限的用户）：
#   bash deploy/server-check.sh
#   bash deploy/server-check.sh <子域名>.duckdns.org     # 同时检查该域名是否已解析到本机
#
# 输出里不包含密码与密钥：crontab 中的 token= / password= 等值会被替换为 ***。
set -u

DOMAIN="${1:-}"

section() {
  printf '\n===== %s =====\n' "$1"
}

run() {
  # 命令不存在或执行失败时只打印提示，继续检查下一项
  "$@" 2>&1 || printf '（命令不可用或执行失败：%s）\n' "$*"
}

redact() {
  sed -E 's/((token|password|passwd|secret|key)=)[^&" ]+/\1***/Ig'
}

section '系统'
run uname -srm
grep -E '^(PRETTY_NAME|VERSION_ID)=' /etc/os-release 2>/dev/null
run uptime

section 'CPU / 内存 / 交换分区'
run nproc
run free -h

section '磁盘'
run df -h / /var/lib/docker /srv 2>/dev/null

section '监听中的 TCP 端口（进程）'
if command -v ss > /dev/null; then
  ss -ltnp 2>/dev/null | awk 'NR==1 || /LISTEN/'
else
  run netstat -ltnp
fi

section 'Docker'
run docker --version
run docker compose version
if command -v docker > /dev/null; then
  docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>&1
  echo
  docker network ls 2>&1
  echo
  docker system df 2>&1
fi

section 'nginx'
run nginx -v
for dir in /etc/nginx/sites-enabled /etc/nginx/conf.d; do
  [ -d "$dir" ] && { echo "$dir:"; ls -la "$dir"; }
done
echo
echo 'server_name：'
grep -rhoE 'server_name[^;]+;' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | sort -u
echo
echo 'listen：'
grep -rhoE 'listen[^;]+;' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | sort | uniq -c
echo
echo 'http 级共享配置（避免重名）：'
grep -rhE '^\s*(limit_req_zone|proxy_cache_path|upstream|map) ' /etc/nginx/ 2>/dev/null | sed 's/^\s*//' | sort -u
echo
run nginx -t

section '其它 Web 服务器'
for name in apache2 httpd caddy traefik haproxy; do
  systemctl is-active --quiet "$name" 2>/dev/null && echo "$name：运行中"
done
echo '（未列出即未运行）'

section '证书（certbot）'
run certbot --version
if command -v certbot > /dev/null; then
  certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry Date'
fi
systemctl list-timers --all 2>/dev/null | grep -i certbot

section '防火墙'
run ufw status
iptables -S INPUT 2>/dev/null | head -20

section '运行中的服务（systemd）'
systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | awk '{print $1}'

section 'crontab（root，已隐去密钥）'
crontab -l 2>/dev/null | redact || echo '（无）'

if [ -n "$DOMAIN" ]; then
  section "域名 $DOMAIN"
  run getent hosts "$DOMAIN"
  echo "本机公网 IP：$(curl -s --max-time 5 https://api.ipify.org || echo 未知)"
fi

printf '\n检查完成（未做任何修改）。\n'
