// 【1. 获取参数】
// 从 Sub-Store 传入的全局变量 $arguments 中解构出 type 和 name。
// 这两个值来自于你手动在 URL 末尾添加的 #type=...&name=...
const { type, name } = $arguments;

// 【2. 定义备用出站】
// 定义一个“直连”出站，作为后备。如果某个分组没匹配到任何节点，就用它填充，防止出错。
const fallbackOutbound = {
  tag: 'COMPATIBLE',
  type: 'direct',
};

// 【3. 加载配置文件】
// $files[0] 包含了你作为模板提供的那个完整配置文件的内容。
// 这里把它从文本解析成一个 JavaScript 对象，方便后续操作。
let config = JSON.parse($files[0]);

// 【4. 获取所有节点】
// 根据传入的 name 和 type，调用 Sub-Store 的核心函数 produceArtifact 来获取订阅链接中的所有节点。
// produceArtifact 会返回一个包含所有节点对象的数组。
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription', // 正则判断是组合订阅还是单个订阅
  platform: 'sing-box',
  produceType: 'internal',
});

// 【5. 关键步骤一：注入所有节点定义】
// 将获取到的所有节点对象（proxies）完整地添加到配置文件的 outbounds 数组末尾。
// 这一步至关重要，它使得所有节点在最终的配置文件中都有了定义，这样后续才能通过名字引用它们。
config.outbounds.push(...proxies);

// 【6. 核心步骤：定义分组规则并填充】
// 创建一个“分组地图”，键是你在配置文件里定义的策略组的 tag，值是用于匹配节点名字的正则表达式。
const groupMap = {
  '🚀 默认出站': /./, // /./ 表示匹配所有字符，即所有节点
  '🇭🇰 香港节点': /港|hk|hongkong|🇭🇰/i, // /i 表示不区分大小写
  '🇼🇸 台湾节点': /台|tw|taiwan|🇹🇼/i,
  '🇯🇵 日本节点': /日本|jp|japan|🇯🇵/i,
  '🇺🇲 美国节点': /美|us|united\s?states|🇺🇸/i, // \s? 表示可能有空格也可能没有
  '🇸🇬 新加坡节点': /新|sg|singapore|🇸🇬/i,
  '📌 单选节点': /^.*$/, // /^.*$/ 也是匹配所有节点的意思
};

// 遍历配置文件中的每一个出站规则（包括你预设的策略组和刚刚添加的节点）
config.outbounds.forEach(group => {
  // 如果这个出站规则不是一个数组（比如它是一个节点而不是策略组），就跳过
  if (!Array.isArray(group.outbounds)) return;

  // 根据当前策略组的 tag (例如 '🇭🇰 香港节点')，去 groupMap 里查找对应的正则表达式
  const regex = groupMap[group.tag];
  // 调用下面的 getTags 函数，根据正则表达式筛选出所有符合条件的节点的 “名字(tag)”
  const tags = getTags(proxies, regex);
  // 将筛选出的节点名字，添加到当前策略组的 outbounds 数组中
  group.outbounds = tags;
});

// 【7. 收尾工作：处理空分组】
// 再次遍历所有策略组，确保没有“空”组
config.outbounds.forEach(group => {
  // 如果一个组的 outbounds 数组还是空的 (长度为0)
  if (Array.isArray(group.outbounds) && group.outbounds.length === 0) {
    // 检查备用的“直连”出站是否已存在，如果不存在，就添加进去
    if (!config.outbounds.find(o => o.tag === fallbackOutbound.tag)) {
      config.outbounds.push(fallbackOutbound);
    }
    // 把备用出站的名字添加到这个空组里，防止客户端出错
    group.outbounds.push(fallbackOutbound.tag);
  }
});

// 【8. 输出最终结果】
// 将被我们修改得非常完美的 config 对象，转换回 JSON 文本格式。
// $content 是 Sub-Store 的一个特殊变量，它的值就是最终生成的配置文件内容。
$content = JSON.stringify(config, null, 2);

// 【辅助函数】
// 一个用于筛选节点并返回节点名字的函数
function getTags(proxies, regex) {
  return proxies
    // 如果没有提供正则表达式(regex为null/undefined)，或者正则表达式能匹配节点名字(p.tag)
    .filter(p => !regex || regex.test(p.tag)) 
    // 返回所有筛选后节点的 tag 属性（即节点名字）
    .map(p => p.tag);
}