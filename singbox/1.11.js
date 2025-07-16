// 【1. 获取参数】
const { type, name } = $arguments;

// 【2. 定义备用出站】
const fallbackOutbound = {
  tag: 'COMPATIBLE',
  type: 'direct',
};

// 【3. 加载配置文件】
let config = JSON.parse($files[0]);

// 【4. 获取所有节点】
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

// 【5. 注入所有节点定义】
config.outbounds.push(...proxies);

// 【6. 核心步骤：遍历、替换、清理】
config.outbounds.forEach(group => {
  // 必须是含有 outbounds 数组的策略组才处理
  if (!Array.isArray(group.outbounds)) return;
  
  let newTags = null;

  // 使用 if...else if... 结构来判断分组
  if (group.tag === '🚀 默认出站') {
    newTags = getTags(proxies, /^((?![日美新台港剩过直]).)*$/);
  } else if (group.tag === '📌 单选节点') {
    newTags = getTags(proxies, /^((?![剩过直]).)*$/);
  } else if (group.tag === '🇭🇰 香港节点') {
    newTags = getTags(proxies, /港|hk|hongkong|🇭🇰/i);
  } else if (group.tag === '🇼🇸 台湾节点') {
    newTags = getTags(proxies, /台|tw|taiwan|🇹🇼/i);
  } else if (group.tag === '🇯🇵 日本节点') {
    newTags = getTags(proxies, /日本|jp|japan|🇯🇵/i);
  } else if (group.tag === '🇺🇲 美国节点') {
    newTags = getTags(proxies, /美|us|united\s?states|🇺🇸/i);
  } else if (group.tag === '🇸🇬 新加坡节点') {
    newTags = getTags(proxies, /新|sg|singapore|🇸🇬/i);
  }
  
  // 如果上面的 if 条件有任何一个匹配成功了
  if (newTags !== null) {
    // 步骤1：执行“原地替换”操作，清空并填充节点
    group.outbounds.length = 0; 
    group.outbounds.push(...newTags);

    // 【新增的核心步骤】
    // 步骤2：在填充完节点后，删除该组多余的 filter 字段
    delete group.filter;
  }
});

// 【7. 收尾工作：处理空分组】
config.outbounds.forEach(group => {
  if (group.type === 'selector' && Array.isArray(group.outbounds) && group.outbounds.length === 0) {
    if (!config.outbounds.find(o => o.tag === fallbackOutbound.tag)) {
      config.outbounds.push(fallbackOutbound);
    }
    group.outbounds.push(fallbackOutbound.tag);
  }
});

// 【8. 输出最终结果】
$content = JSON.stringify(config, null, 2);

// 【辅助函数】
function getTags(proxies, regex) {
  return proxies
    .filter(p => !regex || regex.test(p.tag)) 
    .map(p => p.tag);
}