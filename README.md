# 我的网络配置仓库

此仓库用于存放我个人的 [mihomo](https://github.com/MetaCubeX/mihomo) (一个兼容 Clash 的核心) 和 [sing-box](https://github.com/SagerNet/sing-box) 的配置文件。它作为个人备份，并用于在我的设备之间同步配置。

## 🚀 特性

*   **广告拦截:** 集成规则集以拦截常见广告。
*   **区域分流:** 为特定地区（如中国大陆）的流量进行分流，以提高速度和可访问性。
*   **服务专用规则:** 包括针对 OpenAI、Google 等服务的专用规则。
*   **动态配置:** 使用 JavaScript 和 [sub-store](https://github.com/sub-store-org/Sub-Store) 动态生成 `sing-box` 配置。

## 📂 目录结构

```
.
├── clash/
│   ├── mydirect.yaml       # Clash 的自定义直连规则
│   └── Override.js         # Clash 的主配置覆盖脚本 (与 sub-store 配合使用)
│
├── singbox/
│   ├── 1.11.x/             # sing-box v1.11.x 的配置
│   │   ├── 1.11.js         # v1.11.x 的 sub-store 脚本
│   │   ├── 1.11.json       # v1.11.x 的配置模板
│   │   └── ios.json        # v1.11.x 的 iOS 专用配置模板
│   ├── 1.12.x/             # sing-box v1.12.x 的配置
│   │   ├── 1.12.js         # v1.12.x 的 sub-store 脚本
│   │   └── 1.12.json       # v1.12.x 的配置模板
│   ├── 1.13.x/             # sing-box v1.13.x 的配置
│   │   ├── 1.13.js         # v1.13.x 的 sub-store 脚本
│   │   └── 1.13.json       # v1.13.x 的配置模板
│   └── direct.json         # sing-box 的自定义直连规则
│
└── README.md               # 本文件
```

## 🛠️ 使用说明

### Clash (mihomo)

`Override.js` 脚本设计用于与 `sub-store` 配合使用。您可以将以下 URL 用作 `sub-store` 的“远程脚本”：

```
https://raw.githubusercontent.com/你的用户名/你的仓库名/main/clash/Override.js
```

此脚本将使用脚本中定义的设置覆盖默认配置。

### sing-box

`sing-box` 配置也设计用于与 `sub-store` 配合使用，以生成完整的配置文件。

1.  **选择版本:** 选择与您的 `sing-box` 版本匹配的配置版本。
2.  **与 sub-store 配合使用:** 在 `sub-store` 中，创建一个新的配置，并使用您选择版本的 `.js` 脚本的 URL 作为“远程脚本”。例如，对于 v1.13.x：

    ```
    https://raw.githubusercontent.com/你的用户名/你的仓库名/main/singbox/1.13.x/1.13.js
    ```

3.  **模板:** `.js` 脚本将获取相应的 `.json` 模板，并将您的代理节点注入其中。

## 🎨 自定义

您可以通过编辑以下文件来自定义规则：

*   **Clash:** `clash/mydirect.yaml`
*   **sing-box:** `singbox/direct.json`

在这些文件中添加任何您希望强制直接连接的域名。

## ⚠️ 免责声明

*   **隐私:** 这些配置可能包含个人服务器信息或私人订阅链接。如果您复刻或使用此仓库，请**务必**将任何敏感信息替换为您自己的信息，以避免隐私泄露。
*   **适用性:** 这些配置基于我个人的使用习惯，不保证适用于所有网络环境。请根据您自己的需求进行调整。
