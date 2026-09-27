# 网络配置与透明代理规范仓库

[![sing-box](https://img.shields.io/badge/sing--box-v1.15+-blue.svg)](https://github.com/SagerNet/sing-box)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Sub-Store](https://img.shields.io/badge/Sub--Store-Automated-orange.svg)](https://github.com/sub-store-org/Sub-Store)

本仓库用于存放个人网络代理与路由策略配置，主要面向 **[sing-box](https://github.com/SagerNet/sing-box) (重点迭代 v1.15.x 现代架构)** 与 **[mihomo](https://github.com/MetaCubeX/mihomo)**，配合 **[Sub-Store](https://github.com/sub-store-org/Sub-Store)** 实现订阅节点动态注入与多端配置同步。

---

## 🚀 核心架构与技术亮点 (v1.15.x)

最新 **`singbox/1.15x`** 针对 Linux 软路由（ImmortalWrt / OpenWrt）进行了深度优化与架构重构，兼顾极速吞吐与毫秒级低延迟：

* ⚡ **内核级 Bypass 绕过**：
  * 国内 IP（`geoip-cn`）与私有局域网通过 `action: bypass` 结合 `strict_route`，流量直接由 Linux 内核网络栈与物理网卡硬件级转发，实现零用户态上下文切换与零 CPU 开销。
* 🌐 **SagerNet 官方轻量规则集**：
  * 全面迁移至 SagerNet 官方原厂二进制 `.srs` 规则集，体积相比社区臃肿规则大幅缩减近 **8 倍**（`geosite-cn` 由 446 KB 缩减至 56 KB），彻底解决内存膨胀与加载延迟。
* 🛡️ **优雅阻断 ECH (RFC 标准 NODATA)**：
  * 采用 `action: predefined, rcode: NOERROR` 空响应处理 `HTTPS` / `SVCB` 记录，严格符合 RFC 规范。
  * 彻底破坏 ECH（Encrypted Client Hello），强制客户端降级为明文 SNI 以便代理精确嗅探；同时避免了传统 `action: reject` 触发的 50 次限流丢包机制，杜绝 iOS / macOS 打开网页偶发转圈卡顿。
* 🔍 **DNS 智能探测与分流引擎**：
  * **Dual-Stack Fake-IP**：分配 `198.18.0.0/15` (IPv4) 与 `fc00::/18` (IPv6) 虚拟网段，启用 `reverse_mapping` 域名反查。
  * **`evaluate` + `match_response` 漏网回落**：对未在规则集内的未知域名自动探测，解析结果若命中 `geoip-cn` 智能回落至本地物理网关解析，双重防污染。
* 🔒 **高可用工业级防御配置**：
  * **独立根证书库**：`"certificate": { "store": "chrome" }`，内置 Chrome 根证书库，摆脱宿主机 OpenWrt 缺失或过期 CA 证书导致的握手异常。
  * **进程级时间校准**：`"ntp": { "enabled": true, "server": "time.apple.com" }`，内部独立对齐时钟，免疫小主机重启时间重置为 1970 年导致的 TLS 握手全面瘫痪。
  * **协议嗅探白名单排除**：对 Telegram IP 范围与 Apple Push（APNs）协议反向排除，消除 100ms 嗅探超时卡顿。
  * **VPS 探针内核物理直通**：通过 `route_exclude_address` 静态排除运维 SSH 与 Uptime 监控 IP，测出真实的物理线路质量。
* 🎛️ **原生 API 与面板集成**：
  * 启用官方 `services.api`（监听 `9090` 端口），原生内嵌 `sing-box-dashboard`，支持实时日志、流量拓扑以及原生的 `clash_mode`（Direct / Global / Rule）状态切换。

---

## 📂 仓库目录结构

```text
.
├── clash/
│   ├── mydirect.yaml               # Clash 自定义直连规则
│   └── Override.js                 # Clash 主配置覆盖脚本 (Sub-Store 配合)
│
├── singbox/
│   ├── 1.15x/                     # 【主推】sing-box v1.15.x 现代全功能配置
│   │   ├── 1.15.json              # v1.15.x 路由、DNS、TUN 核心模板
│   │   ├── 1.15.js                # Sub-Store 动态订阅节点注入脚本
│   │   └── ios.json               # iOS / 移动端专用轻量化配置模板
│   ├── 1.14x/                     # sing-box v1.14.x 存档配置
│   ├── 1.13x/                     # sing-box v1.13.x 存档配置
│   ├── 1.12x/                     # sing-box v1.12.x 存档配置
│   ├── 1.11x/                     # sing-box v1.11.x 存档配置
│   ├── auto-update-sing-box.sh    # 软路由 / Linux 自动化编译与更新核心脚本
│   └── direct.json                # 通用自定义直连规则
│
└── README.md                      # 本文档
```

---

## 🛠️ Sub-Store 动态配置与部署指引

通过 [Sub-Store](https://github.com/sub-store-org/Sub-Store) 动态抓取订阅节点并注入模板，步骤如下：

### 1. 配置生产脚本 (Artifact)
在 Sub-Store 中新建配置或订阅生成任务：
* **平台类型 (Platform)**: `sing-box`
* **远程脚本 (Script URL)**:
  ```text
  https://raw.githubusercontent.com/xmlys15/demo/master/singbox/1.15x/1.15.js#name=你的订阅名&type=2
  ```
  *(注：若使用组合订阅，设置 `type=1`；若为普通单一订阅，设置 `type=2`)*
* **远程模板 (Template URL)**:
  ```text
  https://raw.githubusercontent.com/xmlys15/demo/master/singbox/1.15x/1.15.json
  ```

### 2. 注入逻辑说明
`1.15.js` 脚本会自动执行以下优化：
1. 提取所有订阅节点，动态填充至 `proxy` 策略组出站中；
2. 清除冗余的内置过滤器；
3. 为空的 `selector` 策略组自动填补 `direct` 兜底，防止客户端加载配置报错。

---

## ⚙️ 软路由自动化运维

仓库根目录下的 `singbox/auto-update-sing-box.sh` 脚本专为基于 OpenWrt / ImmortalWrt 的软路由环境打造：
* 自动检测 GitHub 上 sing-box 的最新 Release / Pre-release 版本；
* 支持多架构判断（x86_64 / aarch64 等），安全下载二进制并热更新；
* 自动进行语法与健康检测，若新版本核心启动失败自动回滚备份，保障家庭网络不失联。

---

## 🎨 规则个性化调整

如需添加个人专属直连域名或 IP，可直接在 `singbox/1.15x/1.15.json` 内进行微调：
* **自定义直连域名**：编辑 `route.rule_set` 中的 `geosite-direct` (inline 规则)；
* **物理内核直连 IP**：编辑 `inbounds[0].route_exclude_address`，添加需要绝对直连的探针/服务器 IP；
* **自定义私有后缀**：在 `dns.rules` 的 `domain_suffix` 中追加内网专用域名（如 `.lan`, `.local`, `.internal` 等）。

---

## ⚠️ 免责声明

* **隐私合规**：本仓库配置中的私有域名及探针 IP 为个人网络拓扑示例。若复刻（Fork）使用，请务必将其替换为你自己的网段与设备信息。
* **网络适应性**：相关配置基于原生双栈及旁路由/主路由透明代理场景调优，不同网络环境下请根据宽带与运营商特性按需调整。
