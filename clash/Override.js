// 参考 Verge Rev 示例 Script 配置
//
// Clash Verge Rev (Version ≥ 17.2) & Mihomo-Party (Version ≥ 1.5.10)
//
// 最后更新时间: 2025-02-27 23:00

// 规则集通用配置
const ruleProviderCommon = {
  "type": "http",
  "format": "text",
  "interval": 86400
};

// 策略组通用配置
const groupBaseOption = {
  "interval": 300,
  "url": "http://1.1.1.1/generate_204",
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
    "ipv6": true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": ["*", "+.lan", "+.local"],
    "default-nameserver":"223.5.5.5",
    "proxy-server-nameserver": "https://223.5.5.5/dns-query", 
    "nameserver": ["221.12.1.227", "221.12.33.227"]
  };

  // 覆盖 geodata 配置
  config["geodata-mode"] = true;
  config["geox-url"] = {
    "geoip": "https://mirror.ghproxy.com/https://raw.githubusercontent.com/Loyalsoldier/geoip/release/geoip.dat",
    "geosite": "https://mirror.ghproxy.com/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
    "mmdb": "https://mirror.ghproxy.com/https://raw.githubusercontent.com/Loyalsoldier/geoip/release/Country.mmdb",
    "asn": "https://mirror.ghproxy.com/https://raw.githubusercontent.com/Loyalsoldier/geoip/release/GeoLite2-ASN.mmdb"
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
    "dns-hijack": ["any:53","tcp://any:53"],
    "auto-route": true,
    "auto-redirect": true,
    "auto-detect-interface": true
  };

  // 覆盖策略组
  config["proxy-groups"] = [
    {
      ...groupBaseOption,
      "name": "🚀 默认出站",
      "type": "select",
      "include-all": true,
      "filter": "^(?!.*(日|美|新|台|港|剩|过|直)).*$",
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Speedtest.png"
    },
    {
      ...groupBaseOption,
      "name": "Openai",
      "type": "select",
      "proxies": ["🚀 默认出站", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点"],
      "icon": "https://raw.githubusercontent.com/Orz-3/mini/master/Color/OpenAI.png"
    },
    {
      ...groupBaseOption,
      "name": "Instagram",
      "type": "select",
      "proxies": ["🚀 默认出站", "香港节点", "美国节点", "新加坡节点", "日本节点", "台湾节点"],
      "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Instagram.png"
    },
    // 地区分组
    {
      ...groupBaseOption,
      "name": "单选节点",
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
      "url": "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs",
      "path": "./rules/cn_ip.mrs"
    }
  };

  // 覆盖规则
  config["rules"] = [
    "RULE-SET,myself,DIRECT",
    "RULE-SET,private_domain,DIRECT",
    "RULE-SET,openai_domain,Openai",
    "RULE-SET,google-gemini_domain,Openai",
    "RULE-SET,tiktok_domain,Openai",
    "RULE-SET,instagram_domain,Instagram",
    "RULE-SET,apple_domain,DIRECT",
    "RULE-SET,oracle_domain,DIRECT",
    "RULE-SET,amazon_domain,DIRECT",
    "RULE-SET,gfw_domain,🚀 默认出站",
    "RULE-SET,geolocation_!cn,🚀 默认出站",
    "RULE-SET,cn_domain,DIRECT",
    "RULE-SET,cn_ip,DIRECT",
    "MATCH,🚀 默认出站"
  ];

  // 返回修改后的配置
  return config;
}