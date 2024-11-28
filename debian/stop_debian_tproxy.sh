#!/bin/bash
#################################################
# 描述: 停止 Deiban/Ubuntu sing-box TProxy 服务并清理
# 版本: 1.0.0
# 作者: Youtube: 七尺宇
#################################################
# 检查是否以 root 权限运行
if [ "$(id -u)" != "0" ]; then
   echo "此脚本需要 root 权限" 
   exit 1
fi

# 定义变量（需要与 tproxy.sh 中的值保持一致）
PROXY_FWMARK=1
PROXY_ROUTE_TABLE=100

# 清理防火墙规则
cleanup_firewall() {
    echo "正在清理防火墙规则..."
    
    # 删除 sing-box 相关的 nftables 表
    if nft list tables | grep -q "inet sing-box"; then
        nft delete table inet sing-box
        echo "已删除 sing-box 防火墙表"
    else
        echo "未找到 sing-box 防火墙表"
    fi
    
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
    
    echo "防火墙规则已重置为默认状态"
}

# 清理路由规则
cleanup_routes() {
    echo "正在清理路由规则..."
    
    # 删除 fwmark 规则
    if ip rule show | grep -q "fwmark $PROXY_FWMARK lookup $PROXY_ROUTE_TABLE"; then
        ip rule delete fwmark $PROXY_FWMARK table $PROXY_ROUTE_TABLE
        echo "已删除 fwmark 规则"
    fi
    
    # 删除路由表中的规则
    if ip route show table $PROXY_ROUTE_TABLE 2>/dev/null | grep -q "local default"; then
        ip route flush table $PROXY_ROUTE_TABLE
        echo "已清空路由表 $PROXY_ROUTE_TABLE"
    fi
}

# 更新持久化
update_persistent_config() {
    echo "更新持久化规则到 /etc/nftables.conf..."
    nft list ruleset > /etc/nftables.conf
    if [ $? -eq 0 ]; then
        echo "持久化规则已更新"
    else
        echo "持久化规则更新失败，请检查权限或磁盘状态"
        exit 1
    fi
}


# 主函数
main() {
    echo "开始清理 sing-box 相关规则..."
    
    cleanup_firewall
    cleanup_routes
    update_persistent_config
    
    echo "清理完成"
}

# 执行主函数
main