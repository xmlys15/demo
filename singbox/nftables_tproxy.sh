#!/bin/bash 

INTERFACE=$(ip route show default | awk '/default/ {print $5}')
TPROXY_PORT=7895  ## 和 tproxy模板 中定义的一致
ROUTING_MARK=666  ## 和 tproxy模板 中定义的一致
PROXY_FWMARK=1
PROXY_ROUTE_TABLE=100

# https://en.wikipedia.org/wiki/Reserved_IP_addresses
ReservedIP4='{ 127.0.0.0/8, 10.0.0.0/16, 192.168.0.0/16, 100.64.0.0/10, 169.254.0.0/16, 172.16.0.0/12, 224.0.0.0/4, 240.0.0.0/4, 255.255.255.255/32 }'
CustomBypassIP='{ 192.168.0.0/16 }' ## 添加你的代理IP地址或其他不想透明代理的地址

if [ $# != 1 ]
then
   echo "Use $(basename "$0") <set|clear>"
   exit 1;
fi

clearFirewallRules()
{
    IPRULE=$(ip rule show | grep $PROXY_ROUTE_TABLE)
    if [ -n "$IPRULE" ]
    then
        ip -f inet rule del fwmark $PROXY_FWMARK lookup $PROXY_ROUTE_TABLE
        ip -f inet route del local default dev $INTERFACE table $PROXY_ROUTE_TABLE
        echo "clear ip rule"
    fi

    nft flush ruleset
    echo "clear nftables"
}

if [ $1 = 'set' ]
then

    clearFirewallRules

    ip -f inet rule add fwmark $PROXY_FWMARK lookup $PROXY_ROUTE_TABLE
    ip -f inet route add local default dev $INTERFACE table $PROXY_ROUTE_TABLE
    sysctl -w net.ipv4.ip_forward=1 > /dev/null

nft -f - <<EOF
table inet sing-box {
    chain prerouting_tproxy {
        type filter hook prerouting priority mangle; policy accept;
        meta l4proto { tcp, udp } th dport 53 tproxy to :$TPROXY_PORT accept comment "DNS透明代理"
        ip daddr $CustomBypassIP accept comment "绕过某些地址"
        fib daddr type local meta l4proto { tcp, udp } th dport $TPROXY_PORT reject with icmpx type host-unreachable comment "直接访问tproxy端口拒绝, 防止回环"
        fib daddr type local accept comment "本机绕过"
        ip daddr $ReservedIP4 accept comment "保留地址绕过"
        meta l4proto tcp socket transparent 1 meta mark set $PROXY_FWMARK accept comment "绕过已经建立的透明代理"
        meta l4proto { tcp, udp } tproxy to :$TPROXY_PORT meta mark set $PROXY_FWMARK comment "其他流量透明代理"
    }

    chain output_tproxy {
        type route hook output priority mangle; policy accept;
        oifname != $INTERFACE accept comment "绕过本机内部通信的流量(接口lo)"
        meta mark $ROUTING_MARK accept comment "绕过本机sing-box发出的流量"
        meta l4proto { tcp, udp } th dport 53 meta mark set $PROXY_FWMARK accept comment "DNS重路由到prerouting"
        udp dport { netbios-ns, netbios-dgm, netbios-ssn } accept comment "绕过NBNS流量"
        ip daddr $CustomBypassIP accept comment "绕过某些地址"
        fib daddr type local accept comment "本机绕过"
        ip daddr $ReservedIP4 accept comment "保留地址绕过"
        meta l4proto { tcp, udp } meta mark set $PROXY_FWMARK comment "其他流量重路由到prerouting"
    }
}
EOF
    
    echo "set nftables"

elif [ $1 = 'clear' ]
then
    clearFirewallRules
fi