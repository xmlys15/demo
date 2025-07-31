// 最后更新时间: 2025-07-25 23:00

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
  config["ipv6"] = false;
  config["log-level"] = "info";
  config["unified-delay"] = true;
  config["find-process-mode"] = "strict";
  config["global-client-fingerprint"] = "chrome";
  config["keep-alive-interval"] = 1800;
  config["profile"] =  {
    "store-selected": true,
    "store-fake-ip": true
  };
  
  // 覆盖控制面板
  config["external-controller"] = 9090,
  config["secret"] = "",
  config["external-ui"] = "ui",
  config["external-ui-name"] = "zashboard",
  config["external-ui-url"] = "https://github.com/Zephyruso/zashboard/archive/gh-pages.zip"

  // 覆盖 dns 配置
  config["dns"] = {
    "enable": true,
    "listen": "0.0.0.0:1053",
    "ipv6": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
        "*",
        "+.lan",
        "+.local",
        "rule-set:myself",
        "rule-set:private_domain",
        "rule-set:apple_domain",
        "rule-set:oracle_domain",
        "rule-set:amazon_domain",
        "rule-set:cn_domain"
    ],
    "default-nameserver": ["tls://223.5.5.5:853"],
    "proxy-server-nameserver": ["tls://8.8.8.8:853"], 
    "nameserver": ["221.12.1.227", "221.12.33.227"]
  };

  // 覆盖 geodata 配置
  config["geodata-mode"] = true;
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["geox-url"] = {
    "geoip": "https://github.zjzzy.cloudns.org/https://raw.githubusercontent.com/Loyalsoldier/geoip/release/geoip.dat",
    "geosite": "https://github.zjzzy.cloudns.org/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat"
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
    "skip-domain": ["Mijia Cloud","+.push.apple.com"]
  };

  // 覆盖 tun 配置
  config["tun"] = {
    "enable": true,
    "stack": "mixed",
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
      "name": "PROXY",
      "type": "select",
      "include-all": true,
      "filter": "^(?!.*(剩|过|直)).*$"
    },
    {
      ...groupBaseOption,
      "name": "OpenAI",
      "type": "select",
      "include-all": true,
      "filter": "^(?!.*(剩|过|直)).*$"
    },
    {
      ...groupBaseOption,
      "name": "Instagram",
      "type": "select",
      "include-all": true,
      "filter": "^(?!.*(剩|过|直)).*$"
    }
  ];

  // 覆盖规则集
  config["rule-providers"] = {
    "myself": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "yaml",
      "url": "https://raw.github.com/xmlys15/demo/master/clash/mydirect.yaml",
      "path": "./rules/myself.yaml"
    },
    "ads_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/refs/heads/main/Filters/AWAvenue-Ads-Rule-Clash.mrs",
      "path": "./rules/ads_domain.mrs"
    },
    "private_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs",
      "path": "./rules/private_domain.mrs"
    },
    "openai_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.mrs",
      "path": "./rules/openai_domain.mrs"
    },
    "google-gemini_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google-gemini.mrs",
      "path": "./rules/google-gemini_domain.mrs"
    },
    "tiktok_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs",
      "path": "./rules/tiktok_domain.mrs"
    },
    "instagram_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/instagram.mrs",
      "path": "./rules/instagram_domain.mrs"
    },
    "apple_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs",
      "path": "./rules/apple_domain.mrs"
    },
    "oracle_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/oracle.mrs",
      "path": "./rules/oracle_domain.mrs"
    },
    "amazon_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/amazon.mrs",
      "path": "./rules/amazon_domain.mrs"
    },
    "gfw_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.mrs",
      "path": "./rules/gfw_domain.mrs"
    },
    "geolocation_!cn": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs",
      "path": "./rules/geolocation_!cn.mrs"
    },
    "cn_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs",
      "path": "./rules/cn_domain.mrs"
    },
    "cn_ip": {
      ...ruleProviderCommon,
      "behavior": "ipcidr",
      "format": "mrs",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs",
      "path": "./rules/cn_ip.mrs"
    }
  };

  // 覆盖规则
  config["rules"] = [
      // 禁用非中国 QUIC（UDP 443）流量，防泄露
    "AND,(AND,(DST-PORT,443),(NETWORK,UDP)),(NOT,((GEOSITE,cn))),REJECT",
    "AND,(AND,(DST-PORT,443),(NETWORK,UDP)),(NOT,((GEOIP,CN))),REJECT",
    "RULE-SET,myself,DIRECT",
    "RULE-SET,ads_domain,REJECT",    
    "RULE-SET,private_domain,DIRECT",
    "RULE-SET,openai_domain,OpenAI",
    "RULE-SET,google-gemini_domain,OpenAI",
    "RULE-SET,tiktok_domain,Instagram",
    "RULE-SET,instagram_domain,Instagram",
    "RULE-SET,apple_domain,DIRECT",
    "RULE-SET,oracle_domain,DIRECT",
    "RULE-SET,amazon_domain,DIRECT",
    "RULE-SET,gfw_domain,PROXY",
    "RULE-SET,geolocation_!cn,PROXY",
    "RULE-SET,cn_domain,DIRECT",
    "RULE-SET,cn_ip,DIRECT",
    "MATCH,PROXY"
  ];
  // 返回修改后的配置
  return config;
}