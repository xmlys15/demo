/**
 * @fileoverview
 * This script is designed to work with a sing-box template that uses native filters for node classification.
 * It fetches proxy nodes from a subscription and injects their tags into selectors that use a "{all}" placeholder.
 * v2: Wrapped in an async IIFE to resolve "await is only valid in async functions" error.
 *
 * @author Gemini
 */

// 将整个脚本包裹在一个立即执行的异步函数 (IIFE) 中，以解决 await 的语法错误
(async () => {
    const { type, name } = $arguments;

    // 1. 解析模板文件
    let config = JSON.parse($files[0]);
    let proxies;

    // 2. 尝试从订阅链接获取所有代理节点
    try {
        proxies = await produceArtifact({
            name,
            type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
            platform: 'sing-box',
            produceType: 'internal',
        });
    } catch (error) {
        // 如果获取节点失败，打印错误日志并直接返回原始模板内容
        console.error("获取订阅节点失败: " + error.message);
        $content = JSON.stringify(config, null, 2);
        return;
    }


    // 3. 如果没有获取到任何节点，则直接返回原始模板，防止后续出错
    if (!proxies || proxies.length === 0) {
        console.log("订阅中未发现任何有效节点。");
        $content = JSON.stringify(config, null, 2);
        return;
    }

    // 4. 提取所有节点的 tag（名称）
    const proxyTags = proxies.map(p => p.tag);

    // 5. 将获取到的所有代理节点完整配置添加到模板的 outbounds 列表末尾
    config.outbounds.push(...proxies);

    // 6. 遍历模板中的所有 outbounds，找到并替换策略组(selector)中的 "{all}" 占位符
    config.outbounds.forEach(outbound => {
      if (Array.isArray(outbound.outbounds)) {
        const placeholderIndex = outbound.outbounds.indexOf('{all}');
        if (placeholderIndex !== -1) {
          // 使用所有节点的 tag 列表替换掉 "{all}" 这个占位符
          outbound.outbounds.splice(placeholderIndex, 1, ...proxyTags);
        }
      }
    });

    // 7. 将修改后的配置对象转换回 JSON 字符串，作为最终输出
    $content = JSON.stringify(config, null, 2);

})().catch(error => {
    // 捕获任何未预料的全局错误
    console.error("脚本执行过程中发生意外错误: " + error.message);
});