# 我的网络配置仓库 (My Network Configs)

这是一个用于存放我个人 [mihomo](https://github.com/MetaCubeX/mihomo) 和 [sing-box](https://github.com/SagerNet/sing-box) 配置文件的仓库，主要用于个人备份和跨设备同步。

---

## 📂 目录结构

```
.
├── mihomo/
│   └── Override.js       # mihomo 的主配置文件
│
├── sing-box/
│   └── config.json       # sing-box 的主配置文件
│   └── config.js         # 配套脚本,可以在sub-store组合成完整配置文件。
│
└── README.md             # 


## 🚀 使用说明

### Mihomo

1.  **本地使用**:
    将 `mihomo/` 目录下的 `Override.js` 用于sub-store。


### sing-box

1.  **本地使用**:
    将 `sing-box/` 目录下的 `config.json` 文件复制到你的 sing-box 配置文件夹中。

2.  **远程订阅**:
    sing-box 同样支持通过 URL 远程加载配置文件。
    * `config.json` 的 Raw 链接示例: `https://raw.githubusercontent.com/你的用户名/你的仓库名/main/sing-box/config.json`

---

## ⚠️ 注意事项

* **隐私安全**: 这些配置文件**可能包含**个人服务器节点信息或私密的订阅链接。如果你 Fork 或使用本仓库，请**务必**将其中的敏感信息修改为你自己的，避免隐私泄露。
* **适用性**: 本仓库的配置仅为我个人使用习惯的备份，不保证适用于所有网络环境，请根据你的实际需求进行调整。
