#!/bin/bash

# 基本参数
INTERFACE=$(ip route show default | awk '/default/ {print $5}')
TPROXY_PORT=7895
PROXY_FWMARK=1
PROXY_ROUTE_TABLE=100

# 指定需要绕过透明代理的地址（包括本地回环和你的局域网）
BYPASS_IP='{ 127.0.0.0/8, 192.168.2.0/24 }'

# 检查参数
if [ $# != 1 ]; then
   echo "Usage: $(basename "$0") <set|clear>"
   exit 1
fi

# 清理规则函数
clearRules() {
    echo "清理现有规则..."
    ip rule del fwmark $PROXY_FWMARK table $PROXY_ROUTE_TABLE 2>/dev/null
    ip route flush table $PROXY_ROUTE_TABLE
    nft flush ruleset
}

# 设置规则
if [ "$1" = 'set' ]; then
    clearRules

    echo "配置系统路由..."
    ip rule add fwmark $PROXY_FWMARK table $PROXY_ROUTE_TABLE
    ip route add local default dev lo table $PROXY_ROUTE_TABLE

    echo "启用 IPv4 转发..."
    sysctl -w net.ipv4.ip_forward=1 > /dev/null

    echo "设置 nftables 规则..."
    nft -f - <<EOF
table inet sing-box {
    chain prerouting_tproxy {
        type filter hook prerouting priority mangle; policy accept;
        # DNS流量透明代理
        meta l4proto { tcp, udp } th dport 53 tproxy to :$TPROXY_PORT accept comment "DNS透明代理"
        # 本地和局域网绕过
        ip daddr $BYPASS_IP accept comment "绕过本地和局域网流量"
        # 防止回环代理
        fib daddr type local meta l4proto { tcp, udp } th dport $TPROXY_PORT reject comment "避免回环"
        # 已标记流量直接接受
        meta mark $PROXY_FWMARK accept comment "已标记流量"
        # 其他流量透明代理
        meta l4proto { tcp, udp } tproxy to :$TPROXY_PORT meta mark set $PROXY_FWMARK comment "其他流量透明代理"
    }

    chain output_tproxy {
        type route hook output priority mangle; policy accept;
        # 本机直接访问流量绕过
        oifname != $INTERFACE accept comment "本地流量绕过"
        # sing-box 发出的流量绕过
        meta mark $PROXY_FWMARK accept comment "绕过本机发出的代理流量"
        # DNS 流量标记
        meta l4proto { tcp, udp } th dport 53 meta mark set $PROXY_FWMARK accept comment "DNS流量标记"
        # 本地和局域网绕过
        ip daddr $BYPASS_IP accept comment "绕过本地和局域网流量"
        # 其他流量标记
        meta l4proto { tcp, udp } meta mark set $PROXY_FWMARK comment "其他流量标记"
    }
}
EOF

    echo "规则已设置完成！"

elif [ "$1" = 'clear' ]; then
    clearRules
    echo "规则已清理完成！"
else
    echo "未知操作：$1"
    exit 1
fi
