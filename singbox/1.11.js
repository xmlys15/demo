/**
 * @fileoverview
 * Sub-Store compatible script to generate a full sing-box profile from a remote template.
 * v3: Adheres to Sub-Store script specification.
 * - Uses `async function main(params)` as the entry point.
 * - Fetches the template from a user-defined URL instead of local $files.
 *
 * @author Gemini
 */

// S-S-Step 1: 将您的模板文件上传到 GitHub Gist 等平台，并在此处替换成您的 Raw 链接
const TEMPLATE_URL = 'https://raw.githubusercontent.com/xmlys15/demo/refs/heads/master/singbox/1.11.json';

// S-S-Step 2: Sub-Store 脚本的主入口函数
async function main(params) {
    // 所有的代码逻辑都必须在这个 main 函数内部

    // 1. 通过网络链接获取模板内容
    // http 对象由 sub-store 环境提供
    let config;
    try {
        const resp = await http.get(TEMPLATE_URL);
        if (resp.status !== 200) {
            throw new Error(`无法下载模板，HTTP 状态码: ${resp.status}`);
        }
        config = JSON.parse(resp.body);
    } catch (error) {
        console.error("获取远程模板文件失败: " + error.message);
        // 获取失败则返回一个空配置，防止 sub-store 出错
        return {};
    }

    // 2. 获取订阅中的代理节点
    // 'produceArtifact' 由 sub-store 环境提供，功能强大
    const { type, name } = params;
    let proxies = []; // 默认为空数组
    try {
        proxies = await produceArtifact({
            name,
            type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
            platform: 'sing-box',
            produceType: 'internal',
        });
        if (!proxies) { proxies = []; } // 确保 proxies 是一个数组
    } catch (error) {
        console.error("获取订阅节点失败: " + error.message);
        // 即使节点获取失败，我们依然可以返回一个仅包含模板内容的配置
    }

    // 3. 将节点信息注入到模板中（这部分逻辑和之前一样）
    const proxyTags = proxies.map(p => p.tag);
    config.outbounds.push(...proxies);

    config.outbounds.forEach(outbound => {
      if (Array.isArray(outbound.outbounds)) {
        const placeholderIndex = outbound.outbounds.indexOf('{all}');
        if (placeholderIndex !== -1) {
          outbound.outbounds.splice(placeholderIndex, 1, ...proxyTags);
        }
      }
    });

    // 4. 返回处理完成的、字符串化的完整配置
    return JSON.stringify(config, null, 2);
}