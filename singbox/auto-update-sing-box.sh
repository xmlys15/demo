#!/bin/sh
set -eu

# ==============================================================================
# sing-box 智能更新与双槽备份管理工具 (All-in-One 单脚本方案)
# 适用环境: ImmortalWrt / OpenWrt (sing-box 原生核心 + procd 守护服务)
# ==============================================================================

BIN="/usr/bin/sing-box"
CONFIG="/etc/sing-box/config.json"
BACKUP_LAST="/root/sing-box.bak.last"
BACKUP_STABLE="/root/sing-box.bak.stable"
CONF="/root/update-sing-box.conf"
LOG="/root/update-sing-box.log"
LOCK="/tmp/update-sing-box.lock"
TMP="/tmp/sing-box-update.$$"
NEW_BIN="${BIN}.new"

SINGBOX_WAS_RUNNING=0
STOPPED=0
REPLACED=0
SUCCESS=0

# ==============================================================================
# 版本追踪模式（留空为官方最新稳定版，填写大版本号则追踪尝鲜分支）
# 示例：
#   TRACK_BRANCH=""       -> 自动追踪最新正式发布版 (latest)
#   TRACK_BRANCH="1.15"   -> 自动追踪 1.15 分支的最新版（含 beta/rc/alpha）
# ==============================================================================
TRACK_BRANCH="1.15"

# 外部配置读取（支持 PROXY_IP, GITHUB_TOKEN, TRACK_BRANCH 等自定义配置）
PROXY_IP=""
GITHUB_TOKEN=""
if [ -f "$CONF" ]; then
    . "$CONF"
fi

# 日志初始化：仅在脚本启动时做一次轮转截断，保护 Flash 空间与弱 CPU
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG" 2>/dev/null || echo 0)" -gt 500 ]; then
    tail -n 200 "$LOG" > "${LOG}.tmp" && mv -f "${LOG}.tmp" "$LOG"
fi

# 统一日志输出函数
log() {
    msg="$(date '+%F %T') $1"
    echo "$msg"
    echo "$msg" >> "$LOG"
}

usage() {
    echo "=================================================================="
    echo "sing-box 智能更新与双槽备份管理工具 (All-in-One)"
    echo "=================================================================="
    echo "常用指令："
    echo "  $0                          自动检测最新版并升级（有更新才更）"
    echo "  $0 [-p|--proxy <代理>]      使用指定代理自动检测并升级到最新版"
    echo "  $0 <版本号> [-p <代理>]     手动升级到指定版本"
    echo "  $0 auto [-p <代理>]         显式指定自动巡检模式（供 cron 定时任务使用）"
    echo ""
    echo "双槽运维指令："
    echo "  $0 status                   查看当前运行版本与各槽位备份状态"
    echo "  $0 set-stable               将当前运行核心固化为【黄金稳定版】"
    echo "  $0 rollback-last            一键紧急回滚到【上一版本 (last)】"
    echo "  $0 rollback-stable          一键紧急回滚到【黄金稳定版 (stable)】"
    echo ""
    echo "参数示例："
    echo "  $0 1.15.0"
    echo "  $0 1.15.0 192.168.2.2:7890"
    echo "  $0 -p 192.168.2.2:7890"
    echo "  $0 192.168.2.2:7890"
    echo "=================================================================="
}

# 检查 sing-box 系统服务是否设为开机自启
is_singbox_service_enabled() {
    if [ -x "/etc/init.d/sing-box" ]; then
        /etc/init.d/sing-box enabled 2>/dev/null
    else
        return 1
    fi
}

check_singbox_status() {
    if pidof sing-box >/dev/null 2>&1; then
        SINGBOX_WAS_RUNNING=1
    else
        SINGBOX_WAS_RUNNING=0
    fi
}

# 统一服务生命周期管理函数：安全重启并校验进程状态
restart_singbox_service() {
    if [ "$SINGBOX_WAS_RUNNING" -eq 1 ] || is_singbox_service_enabled; then
        log "重启 sing-box 系统服务 (procd)..."
        /etc/init.d/sing-box restart || true
        sleep 5
        if pidof sing-box >/dev/null 2>&1; then
            log "sing-box 服务已成功拉起 (PID: $(pidof sing-box))"
            return 0
        else
            log "警告：未检测到 sing-box 进程，可能启动异常！"
            logread | grep -Ei 'sing-box|fatal|error' | tail -n 50 || true
            return 1
        fi
    else
        log "sing-box 未配置自启且此前未运行，保持停止状态"
        return 0
    fi
}

# 0. 基础依赖环境先验检测 (仅保留 apk 支持)
for dep in curl tar; do
    if ! command -v "$dep" >/dev/null 2>&1; then
        if command -v apk >/dev/null 2>&1; then
            INSTALL_HINT="apk update && apk add $dep"
        else
            INSTALL_HINT="安装 $dep"
        fi
        echo "错误：系统缺少必要工具【$dep】，请先执行: $INSTALL_HINT"
        exit 1
    fi
done

# ------------------------------------------------------------------------------
# 1. 命令行参数解析与消歧处理
# ------------------------------------------------------------------------------
TARGET_VERSION=""

while [ $# -gt 0 ]; do
    case "$1" in
        status)
            echo "=== sing-box 版本与双槽备份状态 ==="
            [ -x "$BIN" ] && echo "当前运行核心 ($BIN): $("$BIN" version 2>/dev/null | head -n 1)" || echo "当前运行核心: [不存在或不可执行]"
            [ -x "$BACKUP_LAST" ] && echo "上一版本槽 (last: $BACKUP_LAST): $("$BACKUP_LAST" version 2>/dev/null | head -n 1)" || echo "上一版本槽 (last): [空]"
            [ -x "$BACKUP_STABLE" ] && echo "黄金稳定版槽 (stable: $BACKUP_STABLE): $("$BACKUP_STABLE" version 2>/dev/null | head -n 1)" || echo "黄金稳定版槽 (stable): [未初始化]"
            exit 0
            ;;

        set-stable)
            if [ -x "$BIN" ] && "$BIN" version >/dev/null 2>&1; then
                cp -pf "$BIN" "$BACKUP_STABLE"
                chmod 0755 "$BACKUP_STABLE"
                sync
                log "成功！已将当前运行核心固化为【黄金稳定版】：$BACKUP_STABLE ($("$BACKUP_STABLE" version 2>/dev/null | head -n 1))"
                exit 0
            else
                log "错误：当前 $BIN 无效，无法设为稳定版"
                exit 1
            fi
            ;;

        rollback-last)
            check_singbox_status
            if [ -x "$BACKUP_LAST" ] && "$BACKUP_LAST" version >/dev/null 2>&1; then
                log "正在回滚至【上一版本 (last)】..."
                [ "$SINGBOX_WAS_RUNNING" -eq 1 ] && /etc/init.d/sing-box stop || true
                cp -pf "$BACKUP_LAST" "$BIN"
                chmod 0755 "$BIN"
                sync
                log "回滚完成，当前版本：$("$BIN" version 2>/dev/null | head -n 1)"
                restart_singbox_service
                exit 0
            else
                log "错误：上一版本备份 ($BACKUP_LAST) 不存在或无效！"
                exit 1
            fi
            ;;

        rollback-stable)
            check_singbox_status
            if [ -x "$BACKUP_STABLE" ] && "$BACKUP_STABLE" version >/dev/null 2>&1; then
                log "正在回滚至【黄金稳定版 (stable)】..."
                [ "$SINGBOX_WAS_RUNNING" -eq 1 ] && /etc/init.d/sing-box stop || true
                cp -pf "$BACKUP_STABLE" "$BIN"
                chmod 0755 "$BIN"
                sync
                log "回滚完成，当前版本：$("$BIN" version 2>/dev/null | head -n 1)"
                restart_singbox_service
                exit 0
            else
                log "错误：黄金稳定版备份 ($BACKUP_STABLE) 不存在或无效！"
                exit 1
            fi
            ;;

        -h|--help|help)
            usage
            exit 0
            ;;

        -p|--proxy)
            if [ -n "${2:-}" ]; then
                PROXY_IP="$2"
                shift 2
                continue
            else
                echo "错误：选项 $1 缺少代理地址参数"
                exit 1
            fi
            ;;

        auto)
            TARGET_VERSION=""
            ;;

        *)
            # 智能消歧：精准区分代理地址 vs 语义化版本号
            case "$1" in
                http://*|https://*|socks5://*|*:*)
                    # 包含 URL Scheme 或冒号端口（如 192.168.1.1:7890）-> 代理
                    PROXY_IP="$1"
                    ;;
                *-*|v[0-9]*)
                    # 包含连字符（如 1.15.0-rc.1）或以 v 开头 -> 目标版本号
                    TARGET_VERSION="${1#v}"
                    ;;
                [0-9]*.[0-9]*.[0-9]*)
                    # 数字点分形式：4段纯IP（如 192.168.1.1）vs 3段版本号（如 1.15.0, 10.0.0）
                    case "$1" in
                        *.*.*.*)
                            PROXY_IP="$1"
                            ;;
                        *)
                            TARGET_VERSION="${1#v}"
                            ;;
                    esac
                    ;;
                *)
                    TARGET_VERSION="${1#v}"
                    ;;
            esac
            ;;
    esac
    shift
done

# ------------------------------------------------------------------------------
# 2. 代理选项智能格式化
# ------------------------------------------------------------------------------
CURL_PROXY_ARGS=""
if [ -n "$PROXY_IP" ]; then
    case "$PROXY_IP" in
        http://*|https://*|socks5://*)
            CURL_PROXY_ARGS="-x $PROXY_IP"
            ;;
        *:*)
            CURL_PROXY_ARGS="-x http://${PROXY_IP}"
            ;;
        *)
            CURL_PROXY_ARGS="-x http://${PROXY_IP}:7890"
            ;;
    esac
fi

# ------------------------------------------------------------------------------
# 3. 架构检测与平台匹配
# ------------------------------------------------------------------------------
case "$(uname -m)" in
    x86_64)  PLATFORM="linux-amd64-musl" ;;
    aarch64) PLATFORM="linux-arm64" ;;
    armv7l)  PLATFORM="linux-armv7" ;;
    *)
        log "错误：暂不支持的 CPU 架构：$(uname -m)"
        log "当前脚本默认适配架构：x86_64 (amd64-musl), aarch64 (arm64), armv7l (armv7)"
        log "注：MIPS/MIPSEL 等老旧架构存在 hardfloat/softfloat 指令集差异，建议确认后手动适配部署"
        exit 1
        ;;
esac

CURRENT_VERSION=""
if [ -x "$BIN" ]; then
    CURRENT_VERSION="$("$BIN" version 2>/dev/null | awk '/^sing-box version / {print $3; exit}' || true)"
    if [ -z "$CURRENT_VERSION" ]; then
        # 兼容备用格式解析
        CURRENT_VERSION="$("$BIN" version 2>/dev/null | sed -nE 's/.*version[[:space:]]+([0-9]+\.[0-9]+[^[:space:]]*).*/\1/p' | head -n 1 || true)"
    fi
    if [ -z "$CURRENT_VERSION" ]; then
        log "警告：未能检测到当前 $BIN 的确切版本号"
    fi
fi

# 通用 GitHub 请求辅助函数（自动处理 GITHUB_TOKEN 与代理）
github_fetch() {
    url="$1"
    outfile="${2:-}"
    if [ -n "$GITHUB_TOKEN" ]; then
        if [ -n "$outfile" ]; then
            # shellcheck disable=SC2086
            curl -fsSL --connect-timeout 15 --max-time 30 --retry 3 $CURL_PROXY_ARGS -H "Authorization: Bearer $GITHUB_TOKEN" -o "$outfile" "$url"
        else
            # shellcheck disable=SC2086
            curl -fsSL --connect-timeout 15 --max-time 30 --retry 3 $CURL_PROXY_ARGS -H "Authorization: Bearer $GITHUB_TOKEN" "$url"
        fi
    else
        if [ -n "$outfile" ]; then
            # shellcheck disable=SC2086
            curl -fsSL --connect-timeout 15 --max-time 30 --retry 3 $CURL_PROXY_ARGS -o "$outfile" "$url"
        else
            # shellcheck disable=SC2086
            curl -fsSL --connect-timeout 15 --max-time 30 --retry 3 $CURL_PROXY_ARGS "$url"
        fi
    fi
}

mkdir -p "$TMP"
RELEASE_JSON="$TMP/release.json"
EXPECTED_DIGEST=""

# ------------------------------------------------------------------------------
# 4. 版本决策与官方 Digest 提取
# ------------------------------------------------------------------------------
if [ -z "$TARGET_VERSION" ]; then
    log "正在获取 GitHub 最新 Release 版本信息..."

    if [ -z "$TRACK_BRANCH" ]; then
        # 【常规稳定版 (latest)】
        # 1. 优先尝试通过 API 获取完整元数据（包含 Digest 供应链签名）
        github_fetch "https://api.github.com/repos/SagerNet/sing-box/releases/latest" "$RELEASE_JSON" 2>/dev/null || true
        if [ -s "$RELEASE_JSON" ]; then
            TARGET_VERSION="$(sed -n 's/.*"tag_name":[[:space:]]*"v\{0,1\}\([^"]*\)".*/\1/p' "$RELEASE_JSON" | head -n 1 || true)"
        fi

        # 2. 若 API 失败，降级通过 Releases/latest HTTP 重定向头解析
        if [ -z "$TARGET_VERSION" ]; then
            # shellcheck disable=SC2086
            loc="$(curl -fsSI --connect-timeout 15 --max-time 30 --retry 3 $CURL_PROXY_ARGS "https://github.com/SagerNet/sing-box/releases/latest" 2>/dev/null | grep -i "^location:" | head -n 1 || true)"
            TARGET_VERSION="$(echo "$loc" | sed -n 's/.*tag\/v\{0,1\}\([^[:space:]\r\n]*\).*/\1/p')"
        fi
    else
        # 【分支尝鲜版 (指定 TRACK_BRANCH)】
        log "当前设置为追踪分支: $TRACK_BRANCH"
        # 严格转义点号，杜绝通配任意字符；要求紧跟字面意义的 .数字，封堵 1.150 前缀误匹配
        ESCAPED_BRANCH="$(echo "$TRACK_BRANCH" | sed 's/\./\\./g')"

        # 1. 优先尝试通过 API 获取近期 Release 元数据列表
        github_fetch "https://api.github.com/repos/SagerNet/sing-box/releases?per_page=30" "$RELEASE_JSON" 2>/dev/null || true
        if [ -s "$RELEASE_JSON" ]; then
            TARGET_VERSION="$(sed -n "s/.*\"tag_name\":[[:space:]]*\"v\{0,1\}\(${ESCAPED_BRANCH}\.[0-9][^\"]*\)\".*/\1/p" "$RELEASE_JSON" | head -n 1 || true)"
        fi

        # 2. 若 API 失败，降级通过页面 HTML 解析
        if [ -z "$TARGET_VERSION" ]; then
            TARGET_VERSION="$(github_fetch "https://github.com/SagerNet/sing-box/releases" 2>/dev/null | sed -n "s|.*releases/tag/v\{0,1\}\(${ESCAPED_BRANCH}\.[0-9][^\"/[:space:]]*\).*|\1|p" | head -n 1 || true)"
        fi
    fi

    if [ -z "$TARGET_VERSION" ]; then
        log "错误：无法获取最新版本号（网络连接失败或代理不可用）"
        exit 1
    fi

    # 自动模式下比对当前版本：已是最新版时标记 SUCCESS=1 并正常退出
    if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
        SUCCESS=1
        log "检测完成：当前已是最新版 ($CURRENT_VERSION)，无需重复更新。"
        exit 0
    fi

    log "检测到版本更新：${CURRENT_VERSION:-异常/不存在} -> $TARGET_VERSION"
fi

VERSION="${TARGET_VERSION#v}"
TARBALL_NAME="sing-box-${VERSION}-${PLATFORM}.tar.gz"

# 若通过 API 成功拿到 JSON，则顺带提取对应资产的官方 SHA256 签名 (digest)
if [ -s "$RELEASE_JSON" ]; then
    EXPECTED_DIGEST="$(awk -v name="$TARBALL_NAME" '
        BEGIN { RS="}"; FS="," }
        $0 ~ name {
            for (i=1; i<=NF; i++) {
                if ($i ~ /"digest"/) {
                    if (match($i, /[a-f0-9]{64}/)) {
                        print substr($i, RSTART, RLENGTH)
                        exit
                    }
                }
            }
        }
    ' "$RELEASE_JSON" 2>/dev/null || true)"
fi

# ------------------------------------------------------------------------------
# 5. 防并发任务锁（带 PID 活跃性检查）
# ------------------------------------------------------------------------------
if [ -e "$LOCK" ]; then
    LOCK_PID="$(cat "$LOCK" 2>/dev/null || echo "")"
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "已有更新任务正在运行 (PID: $LOCK_PID)，本次跳过"
        exit 0
    else
        rm -f "$LOCK"
    fi
fi
echo "$$" > "$LOCK"

# ------------------------------------------------------------------------------
# 6. 退出信号与失败保护性恢复函数
# ------------------------------------------------------------------------------
cleanup()
{
    RC=$?
    trap - EXIT INT TERM HUP

    # 核心修复：只有在退出码非 0 且未标记成功时，才判定为更新失败并执行恢复
    if [ "$SUCCESS" -ne 1 ] && [ "$RC" -ne 0 ]; then
        log "更新异常中断或失败 (退出码: $RC)，执行双槽保护性恢复处理..."

        if [ "$REPLACED" -eq 1 ]; then
            RESTORED=0
            # 一级恢复：优先尝试从最近一版 (last) 恢复
            if [ -x "$BACKUP_LAST" ] && "$BACKUP_LAST" version >/dev/null 2>&1; then
                log "一级恢复：从上一版本 (last) 恢复 sing-box..."
                cp -f "$BACKUP_LAST" "$BIN" || true
                chmod 0755 "$BIN" || true
                sync
                RESTORED=1
            fi

            # 二级恢复：如果 last 不可用，降级从黄金稳定版 (stable) 恢复
            if [ "$RESTORED" -ne 1 ] && [ -x "$BACKUP_STABLE" ] && "$BACKUP_STABLE" version >/dev/null 2>&1; then
                log "二级恢复：降级从黄金稳定版 (stable) 恢复..."
                cp -f "$BACKUP_STABLE" "$BIN" || true
                chmod 0755 "$BIN" || true
                sync
                RESTORED=1
            fi
        fi

        if [ "$STOPPED" -eq 1 ]; then
            log "异常中断，尝试恢复启动 sing-box 服务..."
            restart_singbox_service || true
        fi
    fi

    rm -rf "$TMP"
    rm -f "$NEW_BIN"
    rm -f "$LOCK"
    exit "$RC"
}

trap cleanup EXIT INT TERM HUP

# ------------------------------------------------------------------------------
# 7. 核心状态感知：记录更新前状态
# ------------------------------------------------------------------------------
check_singbox_status
if [ "$SINGBOX_WAS_RUNNING" -eq 1 ]; then
    log "检测到 sing-box 正在运行 (SINGBOX_WAS_RUNNING=1)"
else
    log "检测到 sing-box 当前未运行"
fi

URL="https://github.com/SagerNet/sing-box/releases/download/v${VERSION}/${TARBALL_NAME}"
TARBALL="$TMP/sing-box.tar.gz"
EXTRACT="$TMP/sing-box-${VERSION}-${PLATFORM}"
DOWNLOADED_BIN="$EXTRACT/sing-box"

rm -f "$NEW_BIN"

log "目标安装版本：$VERSION ($PLATFORM)"
[ -n "$CURL_PROXY_ARGS" ] && log "使用代理设置：$CURL_PROXY_ARGS" || log "本机透明代理下载中..."

# ------------------------------------------------------------------------------
# 8. 下载、解压与新核心自检
# ------------------------------------------------------------------------------
# shellcheck disable=SC2086
curl -fL --connect-timeout 15 --max-time 300 --retry 3 --retry-delay 5 $CURL_PROXY_ARGS -o "$TARBALL" "$URL"

# 计算压缩包本地 SHA256
ACTUAL_DIGEST="$(sha256sum "$TARBALL" 2>/dev/null | awk '{print $1}' || true)"

# 分级完整性校验策略
if [ -n "$EXPECTED_DIGEST" ]; then
    log "执行官方供应链签名强校验 (GitHub Release Attestation)..."
    if [ -n "$ACTUAL_DIGEST" ] && [ "$ACTUAL_DIGEST" = "$EXPECTED_DIGEST" ]; then
        log "官方 Digest 签名校验通过: $ACTUAL_DIGEST"
    else
        log "错误：压缩包 SHA256 签名与官方 Release 不符，拒绝解压替换！"
        log "预期值 (官方): $EXPECTED_DIGEST"
        log "实际值 (本地): ${ACTUAL_DIGEST:-计算失败}"
        exit 1
    fi
else
    log "提示：未从 API 获得官方 Digest 签名（已将本地 SHA256 存入日志备查: ${ACTUAL_DIGEST:-计算失败}）"
fi

log "校验压缩包完整性..."
tar -tzf "$TARBALL" >/dev/null
tar -xzf "$TARBALL" -C "$TMP"

if [ ! -f "$DOWNLOADED_BIN" ]; then
    log "错误：压缩包中未找到 sing-box 文件"
    exit 1
fi
chmod 0755 "$DOWNLOADED_BIN"

log "校验下载核心可执行性..."
if ! "$DOWNLOADED_BIN" version >/dev/null 2>&1; then
    log "错误：下载的 sing-box 无法在此系统上执行"
    exit 1
fi

# 目标安装分区磁盘空间防护
NEED_KB="$(du -k "$DOWNLOADED_BIN" | awk '{print $1}')"
FREE_KB="$(df -k "$(dirname "$BIN")" 2>/dev/null | awk 'END {print $4}')"
if [ -n "$FREE_KB" ] && [ "$FREE_KB" -lt $((NEED_KB + 4096)) ]; then
    log "错误：安装分区空间不足 (当前: ${FREE_KB} KB，需要: $((NEED_KB+4096)) KB)"
    exit 1
fi

# 配置兼容性校验
if [ -s "$CONFIG" ]; then
    log "检查 sing-box 配置兼容性..."
    if ! "$DOWNLOADED_BIN" check -c "$CONFIG" -D "/var/run/sing-box"; then
        log "错误：当前配置文件 ($CONFIG) 与新版 sing-box 不兼容，放弃替换！"
        exit 1
    fi
else
    log "提示：未找到有效的运行配置文件 ($CONFIG)，跳过配置检查"
fi

# ------------------------------------------------------------------------------
# 9. 双槽分级备份逻辑
# ------------------------------------------------------------------------------
if [ -x "$BIN" ] && "$BIN" version >/dev/null 2>&1; then
    log "刷新上一版本备份 (last) -> $BACKUP_LAST"
    cp -pf "$BIN" "$BACKUP_LAST"
    chmod 0755 "$BACKUP_LAST"

    # 若黄金稳定槽未初始化，以当前健康版本为基准自动初始化
    if [ ! -x "$BACKUP_STABLE" ]; then
        log "初始化黄金稳定版备份 (stable) -> $BACKUP_STABLE"
        cp -pf "$BIN" "$BACKUP_STABLE"
        chmod 0755 "$BACKUP_STABLE"
    fi
    sync
else
    log "当前 sing-box 不存在或不可用，跳过备份步骤"
fi

# ------------------------------------------------------------------------------
# 10. 安全原子替换核心
# ------------------------------------------------------------------------------
cp -f "$DOWNLOADED_BIN" "$NEW_BIN"
chmod 0755 "$NEW_BIN"
sync

if ! "$NEW_BIN" version >/dev/null 2>&1; then
    log "错误：写入目标分区的二进制校验失败，放弃替换"
    exit 1
fi

# 仅原先在运行才停止
if [ "$SINGBOX_WAS_RUNNING" -eq 1 ]; then
    log "停止 sing-box 服务..."
    /etc/init.d/sing-box stop || true
    STOPPED=1
    sleep 2
else
    log "sing-box 原本未运行，跳过停止步骤"
fi

log "替换 sing-box 核心..."
mv -f "$NEW_BIN" "$BIN"
chmod 0755 "$BIN"
sync
REPLACED=1

# ------------------------------------------------------------------------------
# 11. 状态保真与自愈拉起逻辑（统一调用）
# ------------------------------------------------------------------------------
if ! restart_singbox_service; then
    exit 1
fi

# 最终二进制验证
if ! "$BIN" version >/dev/null 2>&1; then
    log "错误：新替换的 sing-box 执行校验失败！"
    exit 1
fi

SUCCESS=1

log "=================================================================="
log "sing-box 升级成功！"
log "当前运行版本: $("$BIN" version 2>/dev/null | head -n 1)"
log "上一版本槽位 (last)  : $BACKUP_LAST"
log "黄金稳定槽位 (stable): $BACKUP_STABLE"
log "=================================================================="
