// 参考 Verge Rev 示例 Script 配置
//
// Clash Verge Rev (Version ≥ 17.2) & Mihomo-Party (Version ≥ 0.5.8)
//
// 最后更新时间: 2024-11-3 19:00

// 规则集通用配置
const ruleProviderCommon = {
  "type": "http",
  "format": "text",
  "interval": 86400
};

// 策略组通用配置
const groupBaseOption = {
  "interval": 300,
  "url": "http://connectivitycheck.gstatic.com/generate_204",
  "max-failed-times": 3,
};

// 程序入口
function main(config) {
  const proxyCount = config?.proxies?.length ?? 0;
  const proxyProviderCount =
    typeof config?.["proxy-providers"] === "object" ? Object.keys(config["proxy-providers"]).length : 0;
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何代理");
  }

  // 覆盖通用配置
  config["mixed-port"] = "7890";
  config["tcp-concurrent"] = true;
  config["allow-lan"] = true;
  config["ipv6"] = true;
  config["log-level"] = "info";
  config["unified-delay"] = "true";
  config["find-process-mode"] = "strict";
  config["global-client-fingerprint"] = "chrome";

  // 覆盖 dns 配置
  config["dns"] = {
    "enable": true,
    "listen": "0.0.0.0:1053",
    "ipv6": false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": ["+.lan","+.local","localhost.ptlogin2.qq.com","+.direct","+.msftconnecttest.com", "+.msftncsi.com"],
    "nameserver": ["223.5.5.5", "119.29.29.29"]
  };

  // 覆盖 geodata 配置
  config["geodata-mode"] = true;
  config["geox-url"] = {
    "geoip": "https://mirror.ghproxy.com/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat",
    "geosite": "https://mirror.ghproxy.com/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
    "mmdb": "https://mirror.ghproxy.com/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country-lite.mmdb",
    "asn": "https://mirror.ghproxy.com/https://github.com/xishang0128/geoip/releases/download/latest/GeoLite2-ASN.mmdb"
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
    }
  };

  // 覆盖 tun 配置
  config["tun"] = {
    "enable": true,
    "stack": "mixed",
    "dns-hijack": ["any:53"]
  };

  // 覆盖策略组
  config["proxy-groups"] = [
    {
      ...groupBaseOption,
      "name": "节点选择",
      "type": "select",
      "proxies": ["自建节点","香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点", "DIRECT"],
      "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/lighttpd.png"
    },
    {
      ...groupBaseOption,
      "name": "Openai",
      "type": "select",
      "proxies": ["节点选择", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点", "DIRECT"],
      "icon": "https://raw.githubusercontent.com/Orz-3/mini/master/Color/OpenAI.png"
    },
    {
      ...groupBaseOption,
      "name": "Instagram",
      "type": "select",
      "proxies": ["节点选择", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点", "DIRECT"],
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Instagram.png"
    },
    {
      ...groupBaseOption,
      "name": "Onedrive",
      "type": "select",
      "proxies": ["节点选择", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点", "DIRECT"],
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/OneDrive.png"
    },    
    {
      ...groupBaseOption,
      "name": "Apple",
      "type": "select",
      "proxies": ["节点选择", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点", "DIRECT"],
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Apple_1.png"
    },
    {
      ...groupBaseOption,
      "name": "Oracle",
      "type": "select",
      "proxies": ["节点选择", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点", "DIRECT"],
      "icon": "https://image.501388.xyz/i/2024/11/29/6749874f1767c.png"
    },
    {
      ...groupBaseOption,
      "name": "Amazon",
      "type": "select",
      "proxies": ["节点选择", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点", "DIRECT"],
      "icon": "https://image.501388.xyz/i/2024/11/29/6749874f7c6d6.png"
    },
    {
      ...groupBaseOption,
      "name": "兜底分流",
      "type": "select",
      "proxies": ["节点选择", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点", "DIRECT"],
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Final.png"
    },
    // 地区分组
    {
      ...groupBaseOption,
      "name": "自建节点",
      "type": "select",
      "include-all": true,
      "filter": "^(?!.*(日|美|新|台|港|剩|过|直)).*$",
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Speedtest.png"
    },
    {
      ...groupBaseOption,
      "name": "香港节点",
      "type": "url-test",
      "tolerance": 0,
      "include-all": true,
      "filter": "(?i)香港|(\b(HK|Hong)\b)",
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Hong_Kong.png"
    },
    {
      ...groupBaseOption,
      "name": "美国节点",
      "type": "url-test",
      "tolerance": 0,
      "include-all": true,
      "filter": "(?i)美国|圣何塞|(\b(US|United States)\b)",
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/United_States.png"
    },
    {
      ...groupBaseOption,
      "name": "新加坡节点",
      "type": "url-test",
      "tolerance": 0,
      "include-all": true,
      "filter": "(?i)新加坡|狮|(\b(SG|Singapore)\b)",
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Singapore.png"
    },
    {
      ...groupBaseOption,
      "name": "日本节点",
      "type": "url-test",
      "tolerance": 0,
      "include-all": true,
      "filter": "(?i)日本|(\b(JP|Japan)\b)",
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Japan.png"
    },
    {
      ...groupBaseOption,
      "name": "台湾节点",
      "type": "url-test",
      "tolerance": 0,
      "include-all": true,
      "filter": "(?i)台湾|(\b(TW|Tai|Taiwan)\b)",
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Taiwan.png"
    }
  ];

  // 覆盖规则集
  config["rule-providers"] = {
    "myself": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://github.com/xmlys15/demo/raw/master/clash/mydirect.yaml",
      "path": "./rules/myself.yaml"
    },
    "private_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.yaml",
      "path": "./rules/private_domain.yaml"
    },
    "openai_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo-lite/geosite/openai.yaml",
      "path": "./rules/openai_domain.yaml"
    },
    "instagram_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/instagram.yaml",
      "path": "./rules/instagram_domain.yaml"
    },
    "onedrive_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.yaml",
      "path": "./rules/onedrive_domain.yaml"
    },
    "apple_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.yaml",
      "path": "./rules/apple_domain.yaml"
    },

    "oracle_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/oracle.yaml",
      "path": "./rules/oracle_domain.yaml"
    },
    "amazon_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/amazon.yaml",
      "path": "./rules/amazon_domain.yaml"
    },
    "geolocation_!cn": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.yaml",
      "path": "./rules/geolocation_!cn.yaml"
    },
    "cn_domain": {
      ...ruleProviderCommon,
      "behavior": "domain",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.yaml",
      "path": "./rules/cn_domain.yaml"
    },
    "cn_ip": {
      ...ruleProviderCommon,
      "behavior": "ipcidr",
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.yaml",
      "path": "./rules/cn_ip.yaml"
    }
  };

  // 覆盖规则
  config["rules"] = [
    "RULE-SET,myself,DIRECT",
    "RULE-SET,private_domain,DIRECT",
    "RULE-SET,openai_domain,Openai",
    "RULE-SET,instagram_domain,Instagram",
    "RULE-SET,onedrive_domain,Onedrive",
    "RULE-SET,apple_domain,Apple",
    "RULE-SET,oracle_domain,Oracle",
    "RULE-SET,amazon_domain,Amazon",
    "RULE-SET,geolocation_!cn,节点选择",
    "RULE-SET,cn_domain,DIRECT",
    "RULE-SET,cn_ip,DIRECT",
    "MATCH,兜底分流"
  ];

  // 返回修改后的配置
  return config;
}