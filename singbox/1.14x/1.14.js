/**
 * @name Sing-Box 模板动态注入脚本
 * @description
 *   - 动态获取订阅节点，并将其注入到模板的指定策略组中（如 'proxy', 'GLOBAL'）。
 *   - 自动移除策略组中原有的 'filter' 筛选规则。
 *   - 确保所有策略组在节点为空时至少有一个备用出站，防止客户端出错。
 * @author (xmlys15)
 *
 * @param {string} name - 组合或者订阅的名称。
 * @param {string} type - '1' 或 '2' (表示组合或者订阅)。
 */

// 使用 try...catch 包裹整个脚本，以捕获任何可能发生的错误，增强稳定性。
try {
  const log = (message) => console.log(`[动态注入脚本] - ${message}`);

  log("脚本启动...");

  const { name, type } = $arguments;
  if (!name || !type) throw new Error("运行失败：必须提供 'name' 和 'type' 参数！");

  if (!$files || !$files[0]) throw new Error("运行失败：未提供模板文件。");

  const parser = (typeof ProxyUtils !== 'undefined' && ProxyUtils.JSON5) ? ProxyUtils.JSON5 : JSON;
  const config = parser.parse($files[0]);

  log(`正在获取订阅 [${name}] 的节点...`);

  const proxies = await produceArtifact({
    name,
    type: /^1$|col/i.test(type ?? '') ? 'collection' : 'subscription',
    platform: 'sing-box',
    produceType: 'internal',
  });

  if (!Array.isArray(proxies)) throw new Error("获取到的节点数据格式不正确，不是一个有效的数组。");
  log(`成功获取到 ${proxies.length} 个节点。`);

  const allProxyTags = proxies.map(p => p.tag).filter(Boolean);

  config.outbounds = config.outbounds || [];

  // 只改 proxy / GLOBAL 两个组
  config.outbounds.forEach(group => {
    if (!group || !['selector', 'url-test'].includes(group.type)) return;

    if (group.tag === 'proxy') {
      log(`正在填充策略组 [${group.tag}]...`);
      group.outbounds = [...new Set(["direct", ...allProxyTags])];
      delete group.filter;
      return;
    }

    if (group.tag === 'GLOBAL') {
      log(`正在填充策略组 [${group.tag}]...`);
      group.outbounds = [...new Set(["proxy","direct", ...allProxyTags])];
      delete group.filter;
      return;
    }
  });

  // 空 selector 兜底
  config.outbounds.forEach(group => {
    if (group && group.type === 'selector' && Array.isArray(group.outbounds) && group.outbounds.length === 0) {
      log(`检测到空策略组 [${group.tag}]，为其添加 'direct' 作为备用。`);
      group.outbounds.push('direct');
    }
  });

  // 最后再把节点对象追加到 outbounds
  config.outbounds.push(...proxies);

  log("处理完成，生成最终配置。");
  $content = JSON.stringify(config, null, 2);

} catch (err) {
  console.error(`[动态注入脚本] - 发生致命错误: ${err.message}`);
  $content = JSON.stringify({ error: "脚本执行失败", message: err.message }, null, 2);
}
