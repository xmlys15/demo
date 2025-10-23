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
  /**
   * 辅助函数：在控制台输出带前缀的日志，方便观察脚本执行流程。
   * @param {string} message - 要输出的日志信息。
   */
  const log = (message) => {
    console.log(`[动态注入脚本] - ${message}`);
  };

  // 1. ==================== 参数与环境准备 ====================
  log("脚本启动...");

  // 从 Sub-Store 全局变量中获取传入的参数
  const { name, type } = $arguments;
  if (!name || !type) {
    throw new Error("运行失败：必须提供 'name' 和 'type' 参数！");
  }

  // 从 Sub-Store 全局变量中获取模板文件内容
  if (!$files || !$files[0]) {
    throw new Error("运行失败：未提供模板文件。");
  }

  // 优先使用支持注释的 JSON5 解析器，如果环境不支持则回退到标准 JSON。
  const parser = (typeof ProxyUtils !== 'undefined' && ProxyUtils.JSON5)
    ? ProxyUtils.JSON5
    : JSON;
  const config = parser.parse($files[0]);

  // 2. ==================== 获取订阅节点 ====================
  log(`正在获取订阅 [${name}] 的节点...`);

  // 调用 Sub-Store 的核心函数 `produceArtifact` 来获取处理好的节点列表。
  // `produceType: 'internal'` 表示我们期望得到的是节点对象的数组，而不是最终的文本文件。
  const proxies = await produceArtifact({
    name,
    type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
    platform: 'sing-box',
    produceType: 'internal',
  });

  if (!Array.isArray(proxies)) {
    throw new Error("获取到的节点数据格式不正确，不是一个有效的数组。");
  }
  log(`成功获取到 ${proxies.length} 个节点。`);

  // 提取所有节点的 `tag`，后续会用到。
  const allProxyTags = proxies.map(p => p.tag);

  // 3. ==================== 核心处理逻辑 ====================

  // 关键步骤1: "先混合" - 将获取到的所有节点定义直接追加到配置的出站列表（outbounds）中。
  // 这样，`config.outbounds` 就同时包含了模板原有的策略组和我们刚获取的节点。
  config.outbounds.push(...proxies);

  // 关键步骤2: "再处理" - 遍历这个混合后的完整列表，查找并修改需要填充的策略组。
  config.outbounds.forEach(group => {
    // 只处理类型为 'selector' 或 'url-test' 的策略组
    if (!['selector', 'url-test'].includes(group.type)) {
      return;
    }

    // 定位到需要填充所有节点的策略组（这里是 'proxy' 和 'GLOBAL'）
    if (group.tag === 'proxy' || group.tag === 'GLOBAL') {
      log(`正在填充策略组 [${group.tag}]...`);

      // 将 'direct' 和所有获取到的节点 tag 注入到策略组的 `outbounds` 字段中。
      // 使用 `Set` 可以自动去除可能存在的重复项，保证列表干净。
      group.outbounds = [...new Set(["direct", ...allProxyTags])];

      // 因为我们已经手动指定了 `outbounds`，所以模板中原有的 `filter` 规则必须删除，
      // 否则可能会与手动设置冲突或导致非预期的行为。
      delete group.filter;
    }
  });

  // 4. ==================== 收尾与健壮性处理 ====================

  // 再次遍历所有出站，检查是否存在内容为空的 selector 策略组。
  config.outbounds.forEach(group => {
    if (group.type === 'selector' && group.outbounds && group.outbounds.length === 0) {
      log(`检测到空策略组 [${group.tag}]，为其添加 'direct' 作为备用。`);
      // 如果一个 selector 组没有任何可选节点，某些客户端会报错。
      // 为其添加一个必定存在的出站（如 'direct'）可以保证配置的有效性。
      group.outbounds.push('direct');
    }
  });

  // 5. ==================== 输出最终配置 ====================
  log("处理完成，生成最终配置。");

  // 将修改后的 JavaScript 对象转换回格式化的 JSON 字符串，作为脚本的最终输出。
  $content = JSON.stringify(config, null, 2);

} catch (err) {
  // 如果脚本在任何阶段发生错误，则捕获错误并输出一个包含错误信息的 JSON。
  console.error(`[动态注入脚本] - 发生致命错误: ${err.message}`);
  $content = JSON.stringify({
      error: "脚本执行失败",
      message: err.message
  }, null, 2);
} 