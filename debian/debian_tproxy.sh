#!/bin/bash

#################################################
# 描述: Debian/Ubuntu sing-box TProxy模式 配置脚本
# 版本: 1.0.0
# 作者: Youtube: 七尺宇
# 用途: 配置和启动 sing-box TProxy模式 代理服务
#################################################

# 检查是否以 root 权限运行
if [ "$(id -u)" != "0" ]; then
   echo "此脚本需要 root 权限" 
   exit 1
fi

sudo systemctl stop sing-box

# 配置参数
BACKEND_URL="http://192.168.10.12:5000"  # 转换后端地址
SUBSCRIPTION_URL=""  # 订阅地址
TEMPLATE_URL="https://raw.githubusercontent.com/qichiyuhub/rule/refs/heads/master/config/singbox/config_tproxy.json"  # 配置文件（规则模板)
SINGBOX_USER=$(systemctl show -p User sing-box | cut -d= -f2)  # 获取 sing-box 服务的运行用户
TPROXY_PORT=7895  # sing-box tproxy 端口，和配置文件（规则模板）里的端口一致！
PROXY_FWMARK=1
PROXY_ROUTE_TABLE=100

# 检查 sing-box 服务状态和执行权限
if ! command -v sing-box &> /dev/null; then
    echo "错误: sing-box 未安装"
    exit 1
fi


# 构建完整的URL
FULL_URL="${BACKEND_URL}/config/${SUBSCRIPTION_URL}&file=${TEMPLATE_URL}"

# 确保目录存在
if [ ! -d "/etc/sing-box" ]; then
    mkdir -p /etc/sing-box
fi

# 备份当前配置
if [ -f "/etc/sing-box/config.json" ]; then
    cp /etc/sing-box/config.json /etc/sing-box/config.json.backup
fi

# 下载新配置（添加超时控制）
if curl -L --connect-timeout 10 --max-time 30 "$FULL_URL" -o /etc/sing-box/config.json; then
    echo "配置文件下载成功"
    
    # 检查配置文件有效性
    if sing-box check -c /etc/sing-box/config.json; then
        echo "配置文件验证成功"
    else
        echo "配置文件验证失败，正在还原备份"
        if [ -f "/etc/sing-box/config.json.backup" ]; then
            cp /etc/sing-box/config.json.backup /etc/sing-box/config.json
            echo "已还原至备份配置"
        else
            echo "未找到备份配置文件"
        fi
        exit 1
    fi
else
    echo "配置文件下载失败"
    exit 1
fi

# 增加默认网络接口的健壮性检查
INTERFACE=$(ip route show default | awk '/default/ {print $5}')
if [ -z "$INTERFACE" ]; then
    echo "未找到默认网络接口，使用 lo 作为备选"
    INTERFACE="lo"
fi
# 清空当前防火墙规则
nft flush ruleset

# 应用基本的默认规则
cat <<EOF | nft -f -
table inet filter {
    chain input {
        type filter hook input priority 0; policy accept;
    }
    chain forward {
        type filter hook forward priority 0; policy accept;
    }
    chain output {
        type filter hook output priority 0; policy accept;
    }
}
EOF

# 保存防火墙规则
if [ -x "$(command -v systemctl)" ]; then
    systemctl restart nftables || echo "防火墙服务重启失败，请检查配置"
else
    echo "无法重启 nftables 服务，请手动检查防火墙配置"
fi

echo "防火墙规则已重置并应用"


# 配置 nftables 规则
cat > /etc/nftables.conf << EOF
#!/usr/sbin/nft -f

table inet sing-box {
    chain prerouting_tproxy {
        type filter hook prerouting priority mangle; policy accept;
        meta l4proto { tcp, udp } th dport 53 tproxy to :$TPROXY_PORT accept comment "DNS透明代理"
        fib daddr type local meta l4proto { tcp, udp } th dport $TPROXY_PORT reject with icmpx type host-unreachable comment "防止回环"
        fib daddr type local accept comment "本机流量绕过"
        ip daddr { 127.0.0.0/8, 10.0.0.0/16, 192.168.0.0/16, 100.64.0.0/10, 169.254.0.0/16, 172.16.0.0/12, 224.0.0.0/4, 240.0.0.0/4, 255.255.255.255/32 } accept comment "保留地址绕过"
        meta l4proto { tcp, udp } tproxy to :$TPROXY_PORT meta mark set $PROXY_FWMARK comment "其他流量透明代理"
    }

    chain output_tproxy {
        type route hook output priority mangle; policy accept;
        oifname != "$INTERFACE" accept comment "绕过本机内部通信的流量"
        meta mark $PROXY_FWMARK accept comment "绕过已标记流量"
        meta l4proto { tcp, udp } th dport 53 meta mark set $PROXY_FWMARK accept comment "DNS流量标记"
        ip daddr { 127.0.0.0/8, 10.0.0.0/16, 192.168.0.0/16, 100.64.0.0/10, 169.254.0.0/16, 172.16.0.0/12, 224.0.0.0/4, 240.0.0.0/4, 255.255.255.255/32 } accept comment "保留地址绕过"
        meta l4proto { tcp, udp } meta mark set $PROXY_FWMARK comment "其他流量标记"
    }
}
EOF

# 设置正确的权限
chmod 640 /etc/nftables.conf


# 配置路由规则
ip rule show | grep -q "fwmark $PROXY_FWMARK lookup $PROXY_ROUTE_TABLE" || ip rule add fwmark $PROXY_FWMARK table $PROXY_ROUTE_TABLE
ip route show table $PROXY_ROUTE_TABLE | grep -q "local default dev lo" || ip route add local default dev lo table $PROXY_ROUTE_TABLE


# 创建路由规则持久化脚本
cat > /etc/network/if-up.d/singbox-tproxy << EOF
#!/bin/bash
ip rule add fwmark $PROXY_FWMARK table $PROXY_ROUTE_TABLE
ip route add local default dev lo table $PROXY_ROUTE_TABLE
EOF

chmod +x /etc/network/if-up.d/singbox-tproxy

# 清理缓存
if [ -f "/var/lib/sing-box/cache.db" ]; then
   echo "正在清理 sing-box 缓存..."
   rm -f /var/lib/sing-box/cache.db
else
   echo "未找到 sing-box 缓存文件，跳过清理"
fi

# 重启服务并检查状态
echo "正在重启 nftables 服务..."
if ! systemctl restart nftables; then
    echo "nftables 服务重启失败"
    exit 1
fi

echo "正在重启 sing-box 服务..."
if ! systemctl restart sing-box; then
    echo "sing-box 服务重启失败"
    exit 1
fi

# 等待服务启动完成
sleep 2
if systemctl is-active sing-box > /dev/null && systemctl is-active nftables > /dev/null; then
    echo "sing-box 启动成功  运行模式--TProxy"
else
    echo "服务启动失败，请检查日志"
    exit 1
fi
echo "查看实时日志请运行 sudo journalctl -u sing-box --output cat -f"
