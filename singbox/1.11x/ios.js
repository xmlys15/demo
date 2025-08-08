// 【1. 获取参数】
const { type, name } = $arguments;

// 【2. 定义备用出站】
const fallbackOutbound = {
  tag: 'COMPATIBLE',
  type: 'direct',
};

// 【3. 加载配置文件 - 升级版】
// 优先使用 JSON5 解析器，如果环境支持的话，以获得更强的容错性
const parser = (typeof ProxyUtils !== 'undefined' && ProxyUtils.JSON5) ? ProxyUtils.JSON5 : JSON;
log(`使用 ${parser === JSON ? '标准 JSON' : 'JSON5'} 解析器。`);

let config;
try {
  // $files[0] 包含模板文件的原始内容
  config = parser.parse($files[0]);
} catch (e) {
  log(`模板文件解析失败: ${e.message}`);
  // 抛出一个更友好的错误提示
  throw new Error("模板文件格式错误，请使用在线 JSON 校验器检查。");
}

// 【4. 获取所有节点】
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

// 【5. 注入所有节点定义】
config.outbounds.push(...proxies);

// 【6. 核心步骤：遍历、创建、替换、清理】
config.outbounds.forEach(group => {
  if (!group.type || !group.tag) return; // 跳过不规范的组

  let newTags = null;

  if (group.tag === 'proxy') {
    newTags = getTags(proxies, /^((?![剩过直]).)*$/);
  }
  
  if (newTags !== null) {
    // 步骤1：为这个组创建或重置 outbounds 属性为一个空数组
    group.outbounds = [];
    // 步骤2：在数组中添加筛选出的新节点
    group.outbounds.push(...newTags);
    // 步骤3：删除多余的 filter 字段
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

// 【新增辅助函数】用于输出带前缀的日志，方便调试
function log(message) {
  console.log(`[咱的脚本] - ${message}`);
}