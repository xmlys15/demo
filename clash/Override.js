// 最后更新时间: 2025-08-11 23:00

// 规则集通用配置
const ruleProviderCommon = {
  type: "http",
  interval: 86400,
};

// 策略组通用配置
const groupBaseOption = {
  "interval": 3600,
  "url": "https://www.gstatic.com/generate_204",
  "max-failed-times": 3,
};

// 程序入口
function main(config) {
  const proxyCount = config?.proxies?.length ?? 0;
  const proxyProviderCount =
    typeof config?.["proxy-providers"] === "object" ? Object.keys(config["proxy-providers"]).length : 0;
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何节点");
  }

  // 覆盖全局配置
  config["mixed-port"] = 7890;
  config["port"] = 8080;
  config["socks-port"] = 1080;
  config["redir-port"] = 7891;
  config["tproxy-port"] = 7892;
  config["tcp-concurrent"] = true;
  config["allow-lan"] = true;
  config["bind-address"] = "*";
  config["ipv6"] = true;
  config["log-level"] = "info";
  config["unified-delay"] = true;
  config["find-process-mode"] = "off";
  config["global-client-fingerprint"] = "chrome";
  config["keep-alive-interval"] = 15;
  config["profile"] = {
    "store-selected": true,
    "store-fake-ip": true
  };

  // 覆盖GEO及更新相关配置
  config["geodata-mode"] = true;
  config["geodata-loader"] = "standard";
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["geox-url"] = {
    "geoip": "https://proxy.501388.xyz/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat",
    "geosite": "https://proxy.501388.xyz/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
    "mmdb": "https://proxy.501388.xyz/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country.mmdb",
    "asn": "https://proxy.501388.xyz/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb"
  };

  // 覆盖控制面板
  config["external-controller"] = "0.0.0.0:9090",
    config["secret"] = "",
    config["external-ui"] = "ui",
    config["external-ui-name"] = "zashboard",
    config["external-ui-url"] = "https://proxy.501388.xyz/https://github.com/Zephyruso/zashboard/archive/gh-pages.zip"

  // 覆盖 dns 配置
  config["dns"] = {
    "enable": true,
    "listen": "0.0.0.0:1053",
    "ipv6": true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
      "+.lan",
      "+.local",
      "time.*.com",
      "+.msftncsi.com",
      "+.windowsupdate.com",
      "+.msftconnecttest.com"
    ],
    "default-nameserver":["223.5.5.5"],
    "proxy-server-nameserver": ["https://223.5.5.5/dns-query"],
    "nameserver": ["221.12.1.227", "221.12.33.227"],
  };

  // 覆盖 sniffer 配置
  config["sniffer"] = {
    "enable": true,
    "parse-pure-ip": true,
    "sniff": {
      "TLS": {
        "ports": ["443", "8443"]
      },
      "HTTP": {
        "ports": ["80", "8080-8880"],
        "override-destination": true
      },
      "QUIC": {
        "ports": ["443", "8443"]
      }
    },
    "force-domain": ["+.v2ex.com"],
    "skip-domain": ["+.push.apple.com"]
  };

  // 覆盖 tun 配置
  config["tun"] = {
    "enable": true,
    "stack": "system",
    "dns-hijack": [
      "any:53",
      "tcp://any:53"
    ],
    "auto-route": true,
    "auto-redirect": true,
    "auto-detect-interface": true
  };

  // 覆盖策略组
  config["proxy-groups"] = [
    {
      ...groupBaseOption,
      "name": "proxy",
      "type": "select",
      "include-all": true
    }
  ];

  // 覆盖规则集
  config["rule-providers"] = {
    "myself": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "yaml",
      "url": "https://proxy.501388.xyz/https://raw.githubusercontent.com/xmlys15/demo/master/clash/mydirect.yaml",
      "path": "./rules/myself.yaml"
    },
    "ads_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "yaml",
      "url": "https://gcore.jsdelivr.net/gh/TG-Twilight/AWAvenue-Ads-Rule@main/Filters/AWAvenue-Ads-Rule-Clash.yaml",
      "path": "./rules/ads_domain.yaml"
    }
  };

  // 覆盖规则
  config["rules"] = [
    "GEOIP,private,DIRECT,no-resolve",
    "GEOSITE,private,DIRECT",
    "RULE-SET,myself,DIRECT",
    "RULE-SET,ads_domain,REJECT",
    "GEOSITE,category-pt,DIRECT",
    "GEOSITE,onedrive,DIRECT",
    "GEOSITE,microsoft@cn,DIRECT",
    "GEOSITE,steam@cn,DIRECT",
    "GEOSITE,category-games@cn,DIRECT",
    "GEOSITE,apple,DIRECT",
    "GEOSITE,oracle,DIRECT",
    "GEOSITE,amazon,DIRECT",
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",

    "MATCH,proxy"
  ];

  // 返回修改后的配置
  return config;
}
