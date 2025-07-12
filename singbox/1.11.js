/**
 * @fileoverview
 * This script is designed to work with a sing-box template that uses native filters for node classification.
 * It fetches proxy nodes from a subscription and injects their tags into selectors that use a "{all}" placeholder.
 *
 * @author Gemini
 */

const { type, name } = $arguments;

// 1. 解析模板文件
let config = JSON.parse($files[0]);

// 2. 从订阅链接获取所有代理节点
// 'produceArtifact' 是平台提供的函数，用于处理订阅链接并生成节点配置
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

// 如果没有获取到任何节点，则直接返回原始模板，防止出错
if (!proxies || proxies.length === 0) {
    $content = JSON.stringify(config, null, 2);
    return;
}

// 3. 提取所有节点的 tag（名称）
const proxyTags = proxies.map(p => p.tag);

// 4. 将获取到的所有代理节点完整配置添加到模板的 outbounds 列表末尾
config.outbounds.push(...proxies);

// 5. 遍历模板中的所有 outbounds
// 主要目的是找到并替换策略组(selector)中的 "{all}" 占位符
config.outbounds.forEach(outbound => {
  // 检查当前 outbound 是否包含一个 outbounds 数组（即是否为 selector 或 url-test 类型）
  if (Array.isArray(outbound.outbounds)) {
    // 查找 "{all}" 占位符在数组中的位置
    const placeholderIndex = outbound.outbounds.indexOf('{all}');

    // 如果找到了占位符
    if (placeholderIndex !== -1) {
      // 使用所有节点的 tag 列表替换掉 "{all}" 这个占位符
      // 'splice' 函数会移除占位符并在此位置插入所有新的节点 tag
      outbound.outbounds.splice(placeholderIndex, 1, ...proxyTags);
    }
  }
});

// 6. 将修改后的配置对象转换回 JSON 字符串，作为最终输出
$content = JSON.stringify(config, null, 2);