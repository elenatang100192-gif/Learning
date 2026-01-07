# 数据库初始化指南

本指南介绍如何初始化知识视频APP的LeanCloud数据库。

## 🚀 快速开始

### 方法一：浏览器工具（推荐新手）

1. **打开初始化工具**：
   ```bash
   # 在项目根目录中打开
   open init-leancloud-database.html
   ```

2. **按步骤执行**：
   - 点击"连接LeanCloud" → 验证连接
   - 点击"创建分类" → 创建视频分类
   - 点击"创建示例书籍" → 创建测试书籍
   - 点击"创建示例视频" → 创建测试视频
   - 点击"创建统计数据" → 创建统计记录

3. **验证结果**：
   - 进入 [LeanCloud控制台](https://leancloud.cn/dashboard/)
   - 查看各数据表是否创建成功

### 方法二：命令行工具（推荐开发者）

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **运行初始化**：
   ```bash
   npm run init:db
   # 或者直接运行
   node scripts/init-database.js
   ```

## 📋 初始化内容

脚本会创建以下数据：

### 分类数据 (Category)
- 科技 (tech)
- 艺术人文 (arts)
- 商业业务 (business)

### 示例书籍 (Book)
- 《深度学习》 - Ian Goodfellow
- 《百年孤独》 - 加西亚·马尔克斯
- 《影响力》 - 罗伯特·西奥迪尼

### 示例视频 (Video)
- 神经网络基础 (科技分类)
- 魔幻现实主义解析 (艺术人文分类)
- 说服力心理学 (商业业务分类)

### 统计数据 (StatisticsDaily)
- 当日的统计记录模板

## 🔧 配置说明

### 环境变量（可选）

如果需要自定义配置，可以设置环境变量：

```bash
# .env 文件
LEANCLOUD_APP_ID=RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz
LEANCLOUD_APP_KEY=1w0cQLBZIaJ32tjaU7RkDu3n
LEANCLOUD_SERVER_URL=https://rdecdltb.lc-cn-n1-shared.com
```

### 脚本配置

如需修改初始化数据，请编辑：
- `scripts/init-database.js` - Node.js脚本
- `init-leancloud-database.html` - 浏览器脚本

## 📊 验证结果

初始化完成后，在LeanCloud控制台应该看到：

- **Category表**: 3条记录
- **Book表**: 3条记录
- **Video表**: 3条记录
- **StatisticsDaily表**: 1条记录

## 🐛 故障排除

### 连接失败
- 检查网络连接
- 确认App ID和App Key正确
- 检查防火墙设置

### 数据创建失败
- 确认表结构已创建
- 检查ACL权限设置
- 查看浏览器控制台或命令行错误信息

### 脚本运行失败
- 确保Node.js版本 >= 16
- 重新安装依赖：`npm install`

## 📞 获取帮助

如果遇到问题，请：
1. 查看浏览器控制台错误信息
2. 检查网络连接和LeanCloud服务状态
3. 参考 [LeanCloud文档](https://leancloud.cn/docs/)

---

**注意**：初始化脚本会创建测试数据，请在生产环境中根据需要清理或修改这些数据。
