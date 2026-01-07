# LeanCloud + 阿里云OSS 配置指南

本指南详细说明如何配置 LeanCloud + 阿里云OSS 方案，适用于知识视频APP项目，包含用户端React应用和后台管理React应用，预计300人用户量、每天发布10条1分钟视频的应用场景。

## 📋 目录

1. [方案概述](#方案概述)
2. [LeanCloud 配置](#leancloud-配置)
3. [阿里云OSS 配置](#阿里云oss-配置)
4. [CDN 配置](#cdn-配置)
5. [数据库设计](#数据库设计)
6. [移动端集成](#移动端集成)
7. [成本优化建议](#成本优化建议)
8. [常见问题](#常见问题)
9. [🌍 其他BaaS服务备选方案](#-其他baas服务备选方案)

---

## 方案概述

### 架构图

```
前端React应用 (用户端)       后台管理React应用
        ↓                           ↓
LeanCloud API (认证、数据查询) ←─────→
        ↓                           ↓
MongoDB 数据库 (元数据存储)           ↓
        ↓                           ↓
阿里云OSS (视频文件存储) ←─────────────┐
        ↓                           ↓
CDN (视频加速分发) ←──────────────────┘
```

### 服务分工

- **LeanCloud**: 用户认证、数据库、API、云函数、推送服务
- **阿里云OSS**: 视频文件和封面图存储
- **CDN**: 视频内容加速分发
- **前端React应用**: 用户端视频浏览、发布、个人中心等功能
- **后台React应用**: 书籍管理、视频审核、用户管理、数据统计等功能

---

## LeanCloud 配置

### 0. 快速开始（推荐新用户）

如果您是首次使用LeanCloud，建议按以下步骤快速初始化：

1. **下载初始化工具**：
   - 下载项目中的 `init-leancloud-database.html` 文件
   - 或使用Node.js脚本：`node scripts/init-database.js`

2. **运行初始化**：
   - 打开HTML文件在浏览器中运行（简单易用）
   - 或运行Node.js脚本（适合开发者）

3. **验证结果**：
   - 进入LeanCloud控制台查看创建的数据
   - 数据创建完成后即可开始开发

**注意**：应用已预配置，App ID等信息已在脚本中设置。

---

### 1. 注册 LeanCloud 账号

1. 访问 [https://leancloud.cn](https://leancloud.cn)
2. 点击 "注册" 或 "登录"
3. 使用邮箱或手机号注册
4. 完成实名认证（必需，用于开通服务）

### 2. 创建应用

1. 登录后，点击 "创建应用"
2. 填写应用信息：
   - **应用名称**: knowledge-video-app（或自定义）
   - **开发环境**: 选择 **开发版**（免费套餐）
   - **应用类型**: 选择 **移动应用**

3. 创建成功后，进入应用控制台

### 3. 获取应用密钥

1. 进入应用后，点击 **设置** → **应用 Keys**
2. 记录以下信息：
   - **App ID**: `RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz`
   - **App Key**: `1w0cQLBZIaJ32tjaU7RkDu3n`
   - **Master Key**: `Ub2GDZGGNo0NuUOvDRheK04Y`（⚠️ 保密，仅服务器端使用）
   - **服务器地址**: `https://rdecdltb.lc-cn-n1-shared.com`（根据地域选择）

### 4. 配置数据模型

#### 4.1 创建数据表（Class）

LeanCloud使用Class（类）来存储数据，类似于数据库表。在控制台中创建以下Class：

**创建步骤**：
1. 进入 **数据存储** → **结构化数据**
2. 点击 **创建Class**，依次创建以下Class：

**需要创建的Class列表**：
- `Category`（分类表）
- `Book`（书籍表）
- `ExtractedContent`（AI提取内容表）
- `Video`（视频表）
- `Like`（点赞表）
- `Favorite`（收藏表）
- `Comment`（评论表）
- `WatchHistory`（播放历史表）
- `AuditLog`（审核日志表）
- `UserSession`（用户会话表）
- `Notification`（通知表）
- `StatisticsDaily`（每日统计表）
- `SystemLog`（系统日志表）

**字段设计说明**（以Video为例）：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| title | String | 视频标题 |
| description | String | 视频描述 |
| videoUrl | String | OSS视频URL |
| coverUrl | String | 封面图URL |
| duration | Number | 视频时长（秒） |
| fileSize | Number | 文件大小（字节） |
| category | Pointer → Category | 分类（关联） |
| book | Pointer → Book | 来源书籍（关联） |
| status | String | 状态：draft/published/archived |
| viewCount | Number | 播放次数 |
| likeCount | Number | 点赞数 |

**插入初始分类数据**：

### 方法一：控制台手动添加

1. 进入 **数据存储** → **结构化数据** → **Category表**
2. 点击 **添加行**，依次添加以下三条记录：

| name | nameCn | sortOrder |
|------|--------|-----------|
| tech | 科技 | 1 |
| arts | 艺术人文 | 2 |
| business | 商业业务 | 3 |

### 方法二：使用代码添加

#### 2.1 创建一个HTML文件来运行代码

创建一个 `init-categories.html` 文件：

```html
<!DOCTYPE html>
<html>
<head>
    <title>初始化分类数据</title>
</head>
<body>
    <h1>初始化分类数据</h1>
    <button onclick="initCategories()">初始化分类</button>
    <div id="result"></div>

    <script src="https://cdn.jsdelivr.net/npm/leancloud-storage@4/dist/av-min.js"></script>
    <script>
        // 初始化LeanCloud
        AV.init({
            appId: 'RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz',
            appKey: '1w0cQLBZIaJ32tjaU7RkDu3n',
            serverURL: 'https://rdecdltb.lc-cn-n1-shared.com'
        });

        async function initCategories() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '正在初始化分类数据...<br>';

            try {
                const Category = AV.Object.extend('Category');

                const categories = [
                    { name: 'tech', nameCn: '科技', sortOrder: 1 },
                    { name: 'arts', nameCn: '艺术人文', sortOrder: 2 },
                    { name: 'business', nameCn: '商业业务', sortOrder: 3 }
                ];

                for (const item of categories) {
                    const category = new Category();
                    category.set('name', item.name);
                    category.set('nameCn', item.nameCn);
                    category.set('sortOrder', item.sortOrder);
                    await category.save();
                    resultDiv.innerHTML += `✓ 已创建分类: ${item.nameCn}<br>`;
                }

                resultDiv.innerHTML += '<br><span style="color: green;">所有分类数据初始化完成！</span>';
            } catch (error) {
                resultDiv.innerHTML += `<br><span style="color: red;">错误: ${error.message}</span>`;
                console.error('初始化失败:', error);
            }
        }
    </script>
</body>
</html>
```

#### 2.2 运行初始化脚本

1. 将上述代码保存为 `init-categories.html` 文件
2. 在浏览器中打开此文件
3. 点击"初始化分类"按钮
4. 等待执行完成，查看结果

#### 2.3 在React应用中运行（推荐）

在你的React项目中创建一个初始化脚本：

```javascript
// src/utils/initCategories.js
import AV from 'leancloud-storage';

// 初始化LeanCloud（确保已在应用中配置）
const initCategories = async () => {
  try {
    console.log('开始初始化分类数据...');

    const Category = AV.Object.extend('Category');

    const categories = [
      { name: 'tech', nameCn: '科技', sortOrder: 1 },
      { name: 'arts', nameCn: '艺术人文', sortOrder: 2 },
      { name: 'business', nameCn: '商业业务', sortOrder: 3 }
    ];

    // 检查是否已存在数据
    const query = new AV.Query(Category);
    const existingCategories = await query.find();

    if (existingCategories.length > 0) {
      console.log('分类数据已存在，跳过初始化');
      return;
    }

    // 逐个创建分类
    for (const item of categories) {
      const category = new Category();
      category.set('name', item.name);
      category.set('nameCn', item.nameCn);
      category.set('sortOrder', item.sortOrder);

      await category.save();
      console.log(`✓ 已创建分类: ${item.nameCn}`);
    }

    console.log('所有分类数据初始化完成！');
  } catch (error) {
    console.error('初始化分类数据失败:', error);
    throw error;
  }
};

export default initCategories;
```

然后在应用启动时调用：

```javascript
// src/App.js 或 src/main.js
import initCategories from './utils/initCategories';

// 在应用启动时初始化数据
const initializeApp = async () => {
  try {
    await initCategories();
    console.log('应用数据初始化完成');
  } catch (error) {
    console.error('应用数据初始化失败:', error);
  }
};

// 调用初始化
initializeApp();
```

### 方法三：使用LeanCloud控制台的REST API

也可以直接使用curl命令：

```bash
# 先获取session token（需要先登录控制台获取）
curl -X POST \
  https://rdecdltb.lc-cn-n1-shared.com/1.1/classes/Category \
  -H "X-LC-Id: RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz" \
  -H "X-LC-Key: 1w0cQLBZIaJ32tjaU7RkDu3n" \
  -H "Content-Type: application/json" \
  -d '{"name": "tech", "nameCn": "科技", "sortOrder": 1}'
```

#### 4.2 配置ACL权限（访问控制）

1. 进入每个Class的 **权限设置**
2. 配置ACL规则：
   - **Video/Category表**: 所有人可读，仅管理员可写
   - **Book/ExtractedContent表**: 所有人可读，仅管理员可写
   - **Like/Favorite/Comment/WatchHistory**: 用户只能操作自己的数据
   - **AuditLog/StatisticsDaily/SystemLog**: 仅管理员访问
   - **Notification**: 用户只能查看自己的通知

### 5. 数据库初始化脚本

#### 5.1 创建初始化脚本

创建 `init-leancloud-database.html` 文件：

```html
<!DOCTYPE html>
<html>
<head>
    <title>LeanCloud数据库初始化</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .step { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background-color: #d4edda; border-color: #c3e6cb; }
        .error { background-color: #f8d7da; border-color: #f5c6cb; }
        .info { background-color: #d1ecf1; border-color: #bee5eb; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        .disabled { opacity: 0.5; cursor: not-allowed; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>LeanCloud数据库初始化工具</h1>
    <p>用于初始化知识视频APP的数据库结构和基础数据</p>

    <div id="status" class="step info">
        <strong>状态：</strong>准备就绪，请按顺序执行初始化步骤
    </div>

    <div class="step">
        <h3>步骤1: 初始化LeanCloud连接</h3>
        <button onclick="initLeanCloud()">连接LeanCloud</button>
        <div id="connection-status"></div>
    </div>

    <div class="step">
        <h3>步骤2: 创建分类数据</h3>
        <button onclick="createCategories()" id="createCategoriesBtn" disabled>创建分类</button>
        <div id="categories-status"></div>
    </div>

    <div class="step">
        <h3>步骤3: 创建示例书籍</h3>
        <button onclick="createSampleBooks()" id="createBooksBtn" disabled>创建示例书籍</button>
        <div id="books-status"></div>
    </div>

    <div class="step">
        <h3>步骤4: 创建示例视频</h3>
        <button onclick="createSampleVideos()" id="createVideosBtn" disabled>创建示例视频</button>
        <div id="videos-status"></div>
    </div>

    <div class="step">
        <h3>步骤5: 创建每日统计记录</h3>
        <button onclick="createStatistics()" id="createStatsBtn" disabled>创建统计数据</button>
        <div id="stats-status"></div>
    </div>

    <div class="step success">
        <h3>完成</h3>
        <p>初始化完成后，您可以在LeanCloud控制台查看创建的数据。</p>
        <p><strong>控制台地址：</strong> <a href="https://leancloud.cn/dashboard/" target="_blank">https://leancloud.cn/dashboard/</a></p>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/leancloud-storage@4/dist/av-min.js"></script>
    <script>
        let isConnected = false;

        // LeanCloud配置
        const LEANCLOUD_CONFIG = {
            appId: 'RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz',
            appKey: '1w0cQLBZIaJ32tjaU7RkDu3n',
            serverURL: 'https://rdecdltb.lc-cn-n1-shared.com'
        };

        async function initLeanCloud() {
            try {
                AV.init(LEANCLOUD_CONFIG);
                document.getElementById('connection-status').innerHTML =
                    '<span style="color: green;">✓ LeanCloud连接成功！</span>';
                document.getElementById('createCategoriesBtn').disabled = false;
                isConnected = true;
            } catch (error) {
                document.getElementById('connection-status').innerHTML =
                    '<span style="color: red;">✗ 连接失败: ' + error.message + '</span>';
            }
        }

        async function createCategories() {
            if (!isConnected) {
                alert('请先连接LeanCloud');
                return;
            }

            const statusDiv = document.getElementById('categories-status');
            statusDiv.innerHTML = '正在创建分类...';

            try {
                const categories = [
                    { name: 'tech', nameCn: '科技', sortOrder: 1 },
                    { name: 'arts', nameCn: '艺术人文', sortOrder: 2 },
                    { name: 'business', nameCn: '商业业务', sortOrder: 3 }
                ];

                for (const cat of categories) {
                    const Category = AV.Object.extend('Category');
                    const category = new Category();
                    category.set('name', cat.name);
                    category.set('nameCn', cat.nameCn);
                    category.set('sortOrder', cat.sortOrder);
                    await category.save();
                    statusDiv.innerHTML += `<br>✓ 创建分类: ${cat.nameCn}`;
                }

                statusDiv.innerHTML += '<br><span style="color: green;">分类创建完成！</span>';
                document.getElementById('createBooksBtn').disabled = false;

            } catch (error) {
                statusDiv.innerHTML += `<br><span style="color: red;">✗ 创建失败: ${error.message}</span>`;
            }
        }

        async function createSampleBooks() {
            const statusDiv = document.getElementById('books-status');
            statusDiv.innerHTML = '正在创建示例书籍...';

            try {
                // 获取分类
                const Category = AV.Object.extend('Category');
                const categoryQuery = new AV.Query(Category);
                const categories = await categoryQuery.find();

                const categoryMap = {};
                categories.forEach(cat => {
                    categoryMap[cat.get('name')] = cat;
                });

                const sampleBooks = [
                    {
                        title: '深度学习',
                        author: 'Ian Goodfellow',
                        isbn: '9787115434281',
                        category: 'tech',
                        description: '深度学习经典教材，全面介绍深度学习理论与实践'
                    },
                    {
                        title: '百年孤独',
                        author: '加西亚·马尔克斯',
                        isbn: '9787532768849',
                        category: 'arts',
                        description: '魔幻现实主义文学巅峰之作，讲述布恩迪亚家族七代人的传奇故事'
                    },
                    {
                        title: '影响力',
                        author: '罗伯特·西奥迪尼',
                        isbn: '9787508667168',
                        category: 'business',
                        description: '心理学与营销学的经典之作，揭示人类行为背后的规律'
                    }
                ];

                for (const bookData of sampleBooks) {
                    const Book = AV.Object.extend('Book');
                    const book = new Book();

                    book.set('title', bookData.title);
                    book.set('author', bookData.author);
                    book.set('isbn', bookData.isbn);
                    book.set('category', categoryMap[bookData.category]);
                    book.set('uploadDate', new Date().toISOString().split('T')[0]);
                    book.set('status', '待处理');

                    await book.save();
                    statusDiv.innerHTML += `<br>✓ 创建书籍: ${bookData.title}`;
                }

                statusDiv.innerHTML += '<br><span style="color: green;">示例书籍创建完成！</span>';
                document.getElementById('createVideosBtn').disabled = false;

            } catch (error) {
                statusDiv.innerHTML += `<br><span style="color: red;">✗ 创建失败: ${error.message}</span>`;
            }
        }

        async function createSampleVideos() {
            const statusDiv = document.getElementById('videos-status');
            statusDiv.innerHTML = '正在创建示例视频...';

            try {
                // 获取书籍和分类
                const Book = AV.Object.extend('Book');
                const bookQuery = new AV.Query(Book);
                const books = await bookQuery.find();

                const Category = AV.Object.extend('Category');
                const categoryQuery = new AV.Query(Category);
                const categories = await categoryQuery.find();

                const categoryMap = {};
                categories.forEach(cat => {
                    categoryMap[cat.get('name')] = cat;
                });

                const sampleVideos = [
                    {
                        title: '神经网络基础',
                        titleEn: 'Neural Network Basics',
                        category: 'tech',
                        duration: 180,
                        description: '深度学习入门：神经网络的基本概念和工作原理'
                    },
                    {
                        title: '魔幻现实主义解析',
                        titleEn: 'Analysis of Magical Realism',
                        category: 'arts',
                        duration: 240,
                        description: '文学分析：百年孤独中的魔幻现实主义手法'
                    },
                    {
                        title: '说服力心理学',
                        titleEn: 'Psychology of Persuasion',
                        category: 'business',
                        duration: 200,
                        description: '影响力剖析：六大说服原则在商业中的应用'
                    }
                ];

                for (let i = 0; i < sampleVideos.length; i++) {
                    const videoData = sampleVideos[i];
                    const Video = AV.Object.extend('Video');
                    const video = new Video();

                    video.set('title', videoData.title);
                    video.set('titleEn', videoData.titleEn);
                    video.set('category', categoryMap[videoData.category]);
                    video.set('book', books[i % books.length]); // 循环分配书籍
                    video.set('duration', videoData.duration);
                    video.set('fileSize', videoData.duration * 1024 * 1024); // 估算文件大小
                    video.set('status', '已发布');
                    video.set('disabled', false);
                    video.set('viewCount', Math.floor(Math.random() * 1000));
                    video.set('likeCount', Math.floor(Math.random() * 100));
                    video.set('uploadDate', new Date().toISOString().split('T')[0]);
                    video.set('publishDate', new Date().toISOString().split('T')[0]);
                    video.set('aiExtractDate', new Date().toISOString().split('T')[0]);
                    video.set('coverUrl', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400');

                    await video.save();
                    statusDiv.innerHTML += `<br>✓ 创建视频: ${videoData.title}`;
                }

                statusDiv.innerHTML += '<br><span style="color: green;">示例视频创建完成！</span>';
                document.getElementById('createStatsBtn').disabled = false;

            } catch (error) {
                statusDiv.innerHTML += `<br><span style="color: red;">✗ 创建失败: ${error.message}</span>`;
            }
        }

        async function createStatistics() {
            const statusDiv = document.getElementById('stats-status');
            statusDiv.innerHTML = '正在创建统计数据...';

            try {
                const StatisticsDaily = AV.Object.extend('StatisticsDaily');
                const stats = new StatisticsDaily();

                const today = new Date().toISOString().split('T')[0];

                stats.set('date', today);
                stats.set('totalUsers', 0);
                stats.set('activeUsers', 0);
                stats.set('newUsers', 0);
                stats.set('totalVideos', 3);
                stats.set('newVideos', 3);
                stats.set('publishedVideos', 3);
                stats.set('totalViews', 1500);
                stats.set('totalLikes', 200);
                stats.set('totalComments', 0);
                stats.set('pendingAudits', 0);

                await stats.save();
                statusDiv.innerHTML += `<br>✓ 创建统计数据: ${today}`;
                statusDiv.innerHTML += '<br><span style="color: green;">统计数据创建完成！</span>';

                document.getElementById('status').innerHTML =
                    '<strong>状态：</strong><span style="color: green;">所有初始化步骤已完成！您现在可以在LeanCloud控制台查看创建的数据。</span>';

            } catch (error) {
                statusDiv.innerHTML += `<br><span style="color: red;">✗ 创建失败: ${error.message}</span>`;
            }
        }
    </script>
</body>
</html>
```

#### 5.2 使用初始化脚本

1. **下载脚本**：将上述代码保存为 `init-leancloud-database.html` 文件
2. **打开文件**：在浏览器中打开此HTML文件
3. **按顺序执行**：
   - 点击"连接LeanCloud" → 确认连接成功
   - 点击"创建分类" → 创建三个分类（科技/艺术人文/商业业务）
   - 点击"创建示例书籍" → 创建三本示例书籍
   - 点击"创建示例视频" → 创建三个示例视频
   - 点击"创建统计数据" → 创建今日统计记录

4. **验证结果**：
   - 进入LeanCloud控制台 → 数据存储 → 结构化数据
   - 查看各表是否有数据

#### 5.3 控制台验证

进入LeanCloud控制台验证数据：

1. **查看分类表**：Category表应有3条记录
2. **查看书籍表**：Book表应有3条记录
3. **查看视频表**：Video表应有3条记录
4. **查看统计表**：StatisticsDaily表应有1条记录

#### 5.4 使用npm脚本（最便捷）

项目已配置了npm脚本，推荐使用以下方式：

```bash
# 1. 安装项目依赖
npm install

# 2. 运行数据库初始化
npm run init:db
```

#### 5.5 使用Node.js脚本

如果您更喜欢直接运行脚本：

```bash
# 1. 安装依赖（如果还没有安装）
npm install leancloud-storage

# 2. 运行初始化脚本
node scripts/init-database.js
```

所有脚本都会自动：
- ✅ 连接LeanCloud并验证配置
- ✅ 创建分类数据（科技/艺术人文/商业业务）
- ✅ 创建示例书籍（3本）
- ✅ 创建示例视频（3个）
- ✅ 创建统计数据
- ✅ 显示详细的执行日志和进度

### 6. 配置文件存储（用于封面图等小文件）

1. 进入 **存储** → **文件**
2. LeanCloud提供5GB免费存储空间
3. 可以上传封面图、用户头像等小文件
4. 视频文件建议直接存储到OSS（节省LeanCloud存储空间）

### 6. 配置用户认证

1. 进入 **用户** → **设置**
2. LeanCloud默认支持：
   - **用户名密码登录**: ✅ 默认启用
   - **邮箱登录**: ✅ 默认启用
   - **手机号登录**: 需要配置短信服务
   - **第三方登录**: 微信、QQ、微博等（需要配置）

---

## 阿里云OSS 配置

### 1. 注册阿里云账号

1. 访问 [https://www.aliyun.com](https://www.aliyun.com)
2. 注册/登录账号
3. 完成实名认证（必需）

### 2. 开通OSS服务

1. 进入 **产品** → **对象存储OSS**
2. 点击 "立即开通"
3. 选择计费方式：**按量付费**（推荐）或 **包年包月**

### 3. 创建存储桶（Bucket）

1. 进入 **OSS控制台** → **Bucket列表**
2. 点击 "创建Bucket"
3. 配置信息：
   - **Bucket名称**: `knowledge-video-app`（全局唯一，建议加随机后缀）
   - **地域**: 选择离用户最近的地域（如：华东1-杭州）
   - **存储类型**: **标准存储**
   - **读写权限**: **公共读**（视频需要公开访问）
   - **服务端加密**: 可选
   - **版本控制**: 关闭（节省成本）
   - **日志记录**: 可选开启

4. 点击 "确定" 创建

### 4. 配置跨域访问（CORS）

1. 进入Bucket → **权限管理** → **跨域设置**
2. 点击 "创建规则"
3. 配置：
   - **来源**: `*`（或指定域名）
   - **允许Methods**: `GET, HEAD`
   - **允许Headers**: `*`
   - **暴露Headers**: `ETag, x-oss-request-id`
   - **缓存时间**: `3600`

### 5. 配置生命周期规则（节省成本）

1. 进入Bucket → **数据管理** → **生命周期**
2. 点击 "创建规则"
3. 配置：
   - **规则名称**: `archive-old-videos`
   - **策略**: 30天后转为**低频访问存储**（节省约50%存储成本）
   - 或：90天后转为**归档存储**（节省约70%存储成本）

### 6. 获取访问密钥

1. 点击右上角头像 → **AccessKey管理**
2. 点击 "创建AccessKey"
3. 记录 AccessKey ID 和 AccessKey Secret（请妥善保管，不要泄露）
4. 在环境变量中配置：
   - `OSS_ACCESS_KEY_ID=你的AccessKey ID`
   - `OSS_ACCESS_KEY_SECRET=你的AccessKey Secret`

### 7. 配置CDN加速（可选但推荐）

#### 7.1 开通CDN服务

1. 进入 **产品** → **CDN**
2. 点击 "立即开通"
3. 选择计费方式：**按流量计费**

#### 7.2 添加加速域名

1. 进入 **CDN控制台** → **域名管理**
2. 点击 "添加域名"
3. 配置：
   - **加速域名**: `video.yourdomain.com`（需要先备案域名）
   - **业务类型**: **全站加速**
   - **源站信息**: 选择OSS，选择刚创建的Bucket
   - **加速区域**: **仅中国内地**（或全球）

4. 提交后，配置CNAME解析（按提示操作）

#### 7.3 配置缓存规则

1. 进入域名 → **缓存配置**
2. 添加规则：
   - **文件类型**: `mp4, m3u8, ts`
   - **缓存时间**: `30天`（视频文件不常更新）

---

## 数据库设计

### 表关系图

```
categories (分类)
    ↑
    │ category_id
    │
books (书籍) ←─────────────┐
    │                      │
    │ book_id              │
    │                      │
videos (视频) ──→ extracted_content (AI提取内容)
    │                      │
    ├──→ likes (点赞)      │
    ├──→ favorites (收藏)  │
    ├──→ comments (评论)   │
    └──→ watch_history (播放历史)
```

### 核心表说明

#### categories 表（分类表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(50) | 分类标识：tech/arts/business |
| nameCn | VARCHAR(50) | 中文名称：科技/艺术人文/商业业务 |
| sortOrder | INTEGER | 排序权重 |
| created_at | TIMESTAMP | 创建时间 |

#### books 表（书籍表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | VARCHAR(200) | 书名 |
| author | VARCHAR(100) | 作者 |
| isbn | VARCHAR(20) | ISBN号 |
| category | Pointer → Category | 分类关联 |
| coverUrl | TEXT | 封面图URL（可选） |
| fileUrl | TEXT | 电子书URL（可选） |
| uploadDate | DATE | 上传日期 |
| status | VARCHAR(20) | 状态：待处理/提取中/已完成 |
| created_at | TIMESTAMP | 创建时间 |

#### extracted_content 表（AI提取内容表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| book | Pointer → Book | 所属书籍 |
| chapterTitle | VARCHAR(200) | 章节标题 |
| summary | TEXT | 内容摘要 |
| keyPoints | Array | 关键要点数组 |
| estimatedDuration | INTEGER | 预计时长（秒） |
| videoStatus | VARCHAR(20) | 视频生成状态：pending/generating/completed/failed |
| videoTitleCn | VARCHAR(200) | 中文视频标题 |
| videoTitleEn | VARCHAR(200) | 英文视频标题 |
| videoUrl | TEXT | 生成的视频URL |
| created_at | TIMESTAMP | 创建时间 |

#### videos 表（视频表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| book | Pointer → Book | 来源书籍 |
| extractedContent | Pointer → ExtractedContent | AI提取内容 |
| title | VARCHAR(200) | 视频标题（中文） |
| titleEn | VARCHAR(200) | 英文标题 |
| category | Pointer → Category | 分类关联 |
| videoUrl | TEXT | OSS视频URL |
| coverUrl | TEXT | 封面图URL |
| duration | INTEGER | 时长（秒） |
| fileSize | BIGINT | 文件大小（字节） |
| status | VARCHAR(20) | 状态：待审核/已发布/已驳回/已禁用 |
| disabled | BOOLEAN | 是否禁用显示 |
| viewCount | INTEGER | 播放次数 |
| likeCount | INTEGER | 点赞数 |
| uploadDate | DATE | 上传日期 |
| publishDate | DATE | 发布时间 |
| aiExtractDate | DATE | AI提取日期 |
| author | Pointer → _User | 发布者（用户或系统管理员） |
| reviewNotes | TEXT | 审核备注 |
| created_at | TIMESTAMP | 创建时间 |

#### likes 表（点赞表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user | Pointer → _User | 用户 |
| video | Pointer → Video | 视频 |
| created_at | TIMESTAMP | 创建时间 |

#### favorites 表（收藏表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user | Pointer → _User | 用户 |
| video | Pointer → Video | 视频 |
| created_at | TIMESTAMP | 创建时间 |

#### comments 表（评论表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user | Pointer → _User | 用户 |
| video | Pointer → Video | 视频 |
| content | TEXT | 评论内容 |
| created_at | TIMESTAMP | 创建时间 |

#### watch_history 表（播放历史表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user | Pointer → _User | 用户 |
| video | Pointer → Video | 视频 |
| watchDuration | INTEGER | 观看时长（秒） |
| completed | BOOLEAN | 是否看完 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### audit_logs 表（审核日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| video | Pointer → Video | 审核的视频 |
| reviewer | Pointer → _User | 审核员 |
| action | VARCHAR(20) | 操作：approve/reject |
| notes | TEXT | 审核备注 |
| created_at | TIMESTAMP | 创建时间 |

#### user_sessions 表（用户会话表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user | Pointer → _User | 用户 |
| loginTime | TIMESTAMP | 登录时间 |
| logoutTime | TIMESTAMP | 登出时间 |
| deviceInfo | TEXT | 设备信息 |
| ipAddress | VARCHAR(45) | IP地址 |

#### notifications 表（通知表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user | Pointer → _User | 接收用户 |
| type | VARCHAR(50) | 通知类型：video_approved/video_rejected/new_video等 |
| title | VARCHAR(200) | 通知标题 |
| content | TEXT | 通知内容 |
| relatedVideo | Pointer → Video | 相关视频（可选） |
| isRead | BOOLEAN | 是否已读 |
| created_at | TIMESTAMP | 创建时间 |

#### statistics_daily 表（每日统计表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| date | DATE | 统计日期 |
| totalUsers | INTEGER | 总用户数 |
| activeUsers | INTEGER | 活跃用户数 |
| newUsers | INTEGER | 新增用户数 |
| totalVideos | INTEGER | 总视频数 |
| newVideos | INTEGER | 新增视频数 |
| publishedVideos | INTEGER | 已发布视频数 |
| totalViews | INTEGER | 总播放次数 |
| totalLikes | INTEGER | 总点赞数 |
| totalComments | INTEGER | 总评论数 |
| pendingAudits | INTEGER | 待审核视频数 |
| created_at | TIMESTAMP | 创建时间 |

#### system_logs 表（系统日志表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| level | VARCHAR(20) | 日志级别：info/warn/error |
| category | VARCHAR(50) | 日志分类：auth/upload/audit等 |
| message | TEXT | 日志消息 |
| user | Pointer → _User | 相关用户（可选） |
| metadata | TEXT | 额外元数据（JSON格式） |
| created_at | TIMESTAMP | 创建时间 |

---

### 数据库索引设计

为了优化查询性能，需要创建以下索引：

#### 核心查询索引

1. **videos表索引**
   - `status + category + publishDate DESC` - 分类视频列表查询
   - `author + uploadDate DESC` - 用户发布视频查询
   - `book` - 书籍相关视频查询
   - `viewCount DESC` - 热门视频查询

2. **likes表索引**
   - `user + video` - 检查用户是否点赞
   - `video + created_at DESC` - 视频点赞列表

3. **favorites表索引**
   - `user + video` - 检查用户是否收藏
   - `user + created_at DESC` - 用户收藏列表

4. **comments表索引**
   - `video + created_at DESC` - 视频评论列表
   - `user + created_at DESC` - 用户评论历史

5. **watch_history表索引**
   - `user + updated_at DESC` - 用户观看历史
   - `video` - 视频观看统计

6. **audit_logs表索引**
   - `video` - 视频审核历史
   - `reviewer + created_at DESC` - 审核员操作历史

#### 统计查询索引

7. **statistics_daily表索引**
   - `date DESC` - 按日期查询统计数据

8. **notifications表索引**
   - `user + isRead + created_at DESC` - 用户未读通知

#### 数据完整性约束

- **外键约束**: 确保关联数据的完整性
- **唯一约束**: `likes(user, video)`, `favorites(user, video)` 防止重复操作
- **枚举约束**: status, videoStatus 等字段使用预定义值

### 数据迁移脚本

#### 1. 创建数据表的JavaScript脚本

```javascript
// scripts/initDatabase.js
import AV from 'leancloud-storage';

// 初始化LeanCloud
AV.init({
  appId: 'RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz',
  appKey: '1w0cQLBZIaJ32tjaU7RkDu3n',
  serverURL: 'https://rdecdltb.lc-cn-n1-shared.com'
});

async function createCategories() {
  console.log('创建分类数据...');

  const categories = [
    { name: 'Tech', nameCn: '科技', sortOrder: 1 },
    { name: 'Arts', nameCn: '艺术人文', sortOrder: 2 },
    { name: 'Business', nameCn: '商业业务', sortOrder: 3 }
  ];

  for (const cat of categories) {
    const Category = AV.Object.extend('Category');
    const category = new Category();
    category.set('name', cat.name);
    category.set('nameCn', cat.nameCn);
    category.set('sortOrder', cat.sortOrder);
    await category.save();
    console.log(`✓ 创建分类: ${cat.nameCn}`);
  }
}

async function createSampleBook() {
  console.log('创建示例书籍...');

  const Category = AV.Object.extend('Category');
  const categoryQuery = new AV.Query(Category);
  categoryQuery.equalTo('name', 'Tech');
  const techCategory = await categoryQuery.first();

  const Book = AV.Object.extend('Book');
  const book = new Book();
  book.set('title', '深度学习');
  book.set('author', 'Ian Goodfellow');
  book.set('isbn', '9787115434281');
  book.set('category', techCategory);
  book.set('uploadDate', new Date().toISOString().split('T')[0]);
  book.set('status', '待处理');

  await book.save();
  console.log('✓ 创建示例书籍: 深度学习');
}

// 执行初始化
async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    await createCategories();
    await createSampleBook();
    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

initDatabase();
```

#### 2. LeanCloud控制台创建表

进入LeanCloud控制台，按以下步骤创建表：

1. **进入应用控制台** → **数据存储** → **结构化数据**
2. 点击 **创建Class**，依次创建以下表：

**创建顺序**（按依赖关系）：
1. `Category` - 分类表
2. `Book` - 书籍表
3. `ExtractedContent` - AI提取内容表
4. `Video` - 视频表
5. `Like` - 点赞表
6. `Favorite` - 收藏表
7. `Comment` - 评论表
8. `WatchHistory` - 播放历史表
9. `AuditLog` - 审核日志表
10. `UserSession` - 用户会话表
11. `Notification` - 通知表
12. `StatisticsDaily` - 每日统计表
13. `SystemLog` - 系统日志表

#### 3. 字段配置

为每个表添加相应的字段，设置正确的数据类型和关联关系。

#### 4. ACL权限配置

为每个表配置合适的访问权限：

- **Video表**: 所有人可读，仅管理员可写
- **Like/Favorite/Comment/WatchHistory**: 用户只能操作自己的数据
- **Book/ExtractedContent**: 管理员可读写，普通用户只读
- **AuditLog/StatisticsDaily/SystemLog**: 仅管理员访问

---

## 前端应用集成

### 1. 安装 LeanCloud SDK

#### React应用

```bash
# 安装LeanCloud JavaScript SDK
npm install leancloud-storage

# 如果需要实时功能
npm install leancloud-realtime
```

### 2. 初始化 LeanCloud 客户端

#### React应用示例

```javascript
// src/lib/leancloud.js
import AV from 'leancloud-storage';

// 初始化配置
const LEANCLOUD_CONFIG = {
  appId: process.env.REACT_APP_LEANCLOUD_APP_ID,
  appKey: process.env.REACT_APP_LEANCLOUD_APP_KEY,
  serverURL: process.env.REACT_APP_LEANCLOUD_SERVER_URL
};

// 初始化LeanCloud
AV.init(LEANCLOUD_CONFIG);

// 导出AV实例
export default AV;

// 配置React应用的环境变量文件
// .env.local
// REACT_APP_LEANCLOUD_APP_ID=your-app-id
// REACT_APP_LEANCLOUD_APP_KEY=your-app-key
// REACT_APP_LEANCLOUD_SERVER_URL=https://your-server-url.com
```

### 3. 用户认证

#### OTP邮箱登录示例

```javascript
import AV from 'leancloud-storage';

// 发送OTP验证码（注册/登录）
const sendOTPCode = async (email) => {
  try {
    // 验证邮箱域名（仅允许@ashleyfurniture.com）
    if (!email.endsWith('@ashleyfurniture.com')) {
      throw new Error('仅允许公司邮箱注册');
    }

    // LeanCloud提供邮箱验证码功能
    await AV.User.requestPasswordResetByEmail(email);
    return { success: true, message: '验证码已发送到邮箱' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// 使用验证码登录/注册
const loginWithOTP = async (email, code) => {
  try {
    // LeanCloud的邮箱验证码登录
    const user = await AV.User.logInWithEmail(email, code);
    return { success: true, user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// 获取当前用户
const getCurrentUser = () => {
  return AV.User.current();
};

// 登出
const logout = async () => {
  try {
await AV.User.logOut();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// 检查用户是否已登录
const isLoggedIn = () => {
  return AV.User.current() !== null;
};
```

### 4. 查询视频列表

```javascript
import AV from 'leancloud-storage';

// 获取指定分类的视频列表
const getVideosByCategory = async (categoryName, page = 1, limit = 20) => {
  try {
// 先获取分类对象
    const Category = AV.Object.extend('Category');
const categoryQuery = new AV.Query(Category);
    categoryQuery.equalTo('name', categoryName);
const category = await categoryQuery.first();

    if (!category) {
      throw new Error('分类不存在');
    }

// 查询视频
    const Video = AV.Object.extend('Video');
const videoQuery = new AV.Query(Video);

    // 条件筛选
videoQuery.equalTo('category', category);
    videoQuery.equalTo('status', '已发布');
    videoQuery.equalTo('disabled', false); // 未禁用

    // 排序和分页
    videoQuery.descending('publishDate');
    videoQuery.limit(limit);
    videoQuery.skip((page - 1) * limit);

    // 关联查询
videoQuery.include('book');
    videoQuery.include('extractedContent');

const videos = await videoQuery.find();

    return videos.map(video => ({
      id: video.id,
      title: video.get('title'),
      titleEn: video.get('titleEn'),
      videoUrl: video.get('videoUrl'),
      coverUrl: video.get('coverUrl'),
      duration: video.get('duration'),
      viewCount: video.get('viewCount'),
      likeCount: video.get('likeCount'),
      publishDate: video.get('publishDate'),
      book: video.get('book') ? {
        title: video.get('book').get('title'),
        author: video.get('book').get('author')
      } : null
    }));
  } catch (error) {
    console.error('获取视频列表失败:', error);
    throw error;
  }
};

// 获取单个视频详情
const getVideoDetail = async (videoId) => {
  try {
    const Video = AV.Object.extend('Video');
const videoQuery = new AV.Query(Video);

    // 关联查询所有相关信息
videoQuery.include('category');
videoQuery.include('book');
    videoQuery.include('extractedContent');
    videoQuery.include('author');

const video = await videoQuery.get(videoId);

    return {
      id: video.id,
      title: video.get('title'),
      titleEn: video.get('titleEn'),
      videoUrl: video.get('videoUrl'),
      coverUrl: video.get('coverUrl'),
      duration: video.get('duration'),
      viewCount: video.get('viewCount'),
      likeCount: video.get('likeCount'),
      category: video.get('category') ? {
        name: video.get('category').get('name'),
        nameCn: video.get('category').get('nameCn')
      } : null,
      book: video.get('book') ? {
        title: video.get('book').get('title'),
        author: video.get('book').get('author'),
        isbn: video.get('book').get('isbn')
      } : null,
      extractedContent: video.get('extractedContent') ? {
        chapterTitle: video.get('extractedContent').get('chapterTitle'),
        summary: video.get('extractedContent').get('summary'),
        keyPoints: video.get('extractedContent').get('keyPoints')
      } : null
    };
  } catch (error) {
    console.error('获取视频详情失败:', error);
    throw error;
  }
};
```

### 5. 视频播放（使用OSS URL）

```javascript
// 视频URL格式
// 如果配置了CDN: https://video.yourdomain.com/videos/video-id.mp4
// 如果直接使用OSS: https://bucket-name.oss-region.aliyuncs.com/videos/video-id.mp4

// React应用视频播放示例
const VideoPlayer = ({ videoUrl, poster, isVisible, onLoad }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isVisible) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVisible]);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      poster={poster}
      controls
      preload="metadata"
      onLoadedMetadata={(e) => {
        onLoad && onLoad({
          duration: e.target.duration,
          videoWidth: e.target.videoWidth,
          videoHeight: e.target.videoHeight
        });
      }}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      }}
    />
  );
};

// 使用示例
<VideoPlayer
  videoUrl={video.videoUrl}
  poster={video.coverUrl}
  isVisible={isCurrentVideo}
  onLoad={(data) => {
    setVideoDuration(data.duration);
  }}
/>
```

### 6. 点赞和收藏功能

```javascript
import AV from 'leancloud-storage';

// 点赞视频
const likeVideo = async (videoId) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    // 获取视频对象
    const Video = AV.Object.extend('Video');
    const video = AV.Object.createWithoutData('Video', videoId);

    // 检查是否已点赞
const Like = AV.Object.extend('Like');
    const likeQuery = new AV.Query(Like);
    likeQuery.equalTo('user', currentUser);
    likeQuery.equalTo('video', video);
    const existingLike = await likeQuery.first();

    if (existingLike) {
      // 已点赞，取消点赞
      await existingLike.destroy();

      // 更新视频点赞数
      video.increment('likeCount', -1);
      await video.save();

      return { liked: false, message: '已取消点赞' };
    } else {
      // 未点赞，添加点赞
const like = new Like();
      like.set('user', currentUser);
      like.set('video', video);
await like.save();

      // 更新视频点赞数
      video.increment('likeCount', 1);
      await video.save();

      return { liked: true, message: '点赞成功' };
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    throw error;
  }
};

// 收藏视频
const favoriteVideo = async (videoId) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    const Video = AV.Object.extend('Video');
    const video = AV.Object.createWithoutData('Video', videoId);

    // 检查是否已收藏
    const Favorite = AV.Object.extend('Favorite');
    const favoriteQuery = new AV.Query(Favorite);
    favoriteQuery.equalTo('user', currentUser);
    favoriteQuery.equalTo('video', video);
    const existingFavorite = await favoriteQuery.first();

    if (existingFavorite) {
      // 已收藏，取消收藏
      await existingFavorite.destroy();
      return { favorited: false, message: '已取消收藏' };
    } else {
      // 未收藏，添加收藏
      const favorite = new Favorite();
      favorite.set('user', currentUser);
      favorite.set('video', video);
      await favorite.save();
      return { favorited: true, message: '收藏成功' };
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    throw error;
  }
};

// 检查用户对视频的交互状态
const getVideoInteractionStatus = async (videoId) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      return { liked: false, favorited: false };
    }

    const Video = AV.Object.extend('Video');
    const video = AV.Object.createWithoutData('Video', videoId);

    // 检查点赞状态
    const Like = AV.Object.extend('Like');
    const likeQuery = new AV.Query(Like);
    likeQuery.equalTo('user', currentUser);
    likeQuery.equalTo('video', video);
const like = await likeQuery.first();

    // 检查收藏状态
    const Favorite = AV.Object.extend('Favorite');
    const favoriteQuery = new AV.Query(Favorite);
    favoriteQuery.equalTo('user', currentUser);
    favoriteQuery.equalTo('video', video);
    const favorite = await favoriteQuery.first();

    return {
      liked: !!like,
      favorited: !!favorite
    };
  } catch (error) {
    console.error('获取交互状态失败:', error);
    return { liked: false, favorited: false };
  }
};
```

### 7. 推送通知和实时更新

```javascript
import AV from 'leancloud-storage';

// Web应用推送通知（浏览器通知API）
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// 发送浏览器通知
const sendBrowserNotification = (title, body, icon = '/icon.png') => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon,
      tag: 'video-notification'
    });
  }
};

// 模拟推送通知（实际应用中应通过WebSocket或Server-Sent Events实现）
const setupNotifications = () => {
  // 监听新视频发布通知
  // 实际实现需要后端推送服务
  const checkNewVideos = async () => {
    try {
      const lastCheck = localStorage.getItem('lastVideoCheck');
      const Category = AV.Object.extend('Category');

      // 查询各分类最新视频
      const categories = ['tech', 'arts', 'business'];
      for (const categoryName of categories) {
        const categoryQuery = new AV.Query(Category);
        categoryQuery.equalTo('name', categoryName);
        const category = await categoryQuery.first();

        const Video = AV.Object.extend('Video');
        const videoQuery = new AV.Query(Video);
        videoQuery.equalTo('category', category);
        videoQuery.equalTo('status', '已发布');
        videoQuery.descending('publishDate');
        videoQuery.limit(1);

        const latestVideo = await videoQuery.first();
        if (latestVideo) {
          const publishDate = new Date(latestVideo.get('publishDate'));
          const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);

          if (publishDate > lastCheckDate) {
            sendBrowserNotification(
              '新视频发布',
              `${latestVideo.get('title')} - ${category.get('nameCn')}分类`,
              latestVideo.get('coverUrl')
            );
          }
        }
      }

      localStorage.setItem('lastVideoCheck', new Date().toISOString());
    } catch (error) {
      console.error('检查新视频失败:', error);
    }
  };

  // 每5分钟检查一次新视频
  setInterval(checkNewVideos, 5 * 60 * 1000);

  // 页面加载时检查一次
  checkNewVideos();
};
```

### 8. 视频发布功能

```javascript
import AV from 'leancloud-storage';

// 用户发布视频（前端调用）
const publishVideo = async (videoData) => {
  try {
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }

    // 验证邮箱域名
    const userEmail = currentUser.get('email');
    if (!userEmail || !userEmail.endsWith('@ashleyfurniture.com')) {
      throw new Error('仅允许公司用户发布视频');
    }

    const Video = AV.Object.extend('Video');
    const video = new Video();

    // 设置视频基本信息
    video.set('title', videoData.title);
    video.set('titleEn', videoData.titleEn);
    video.set('videoUrl', videoData.videoUrl);
    video.set('coverUrl', videoData.coverUrl);
    video.set('duration', videoData.duration);
    video.set('fileSize', videoData.fileSize);
    video.set('status', '待审核');
    video.set('uploadDate', new Date().toISOString().split('T')[0]);
    video.set('author', currentUser);

    // 关联分类
    const Category = AV.Object.extend('Category');
    const categoryQuery = new AV.Query(Category);
    categoryQuery.equalTo('name', videoData.category);
    const category = await categoryQuery.first();
    if (!category) {
      throw new Error('分类不存在');
    }
    video.set('category', category);

    // 如果有关联书籍
    if (videoData.bookId) {
      const Book = AV.Object.extend('Book');
      const book = AV.Object.createWithoutData('Book', videoData.bookId);
      video.set('book', book);
    }

    const savedVideo = await video.save();

    return {
      success: true,
      videoId: savedVideo.id,
      message: '视频已提交审核'
    };
  } catch (error) {
    console.error('发布视频失败:', error);
    throw error;
  }
};

// 文件上传到OSS（通过LeanCloud云函数处理）
const uploadFileToOSS = async (file, type = 'video') => {
  try {
    // 调用云函数获取OSS上传签名
    const uploadToken = await AV.Cloud.run('getOSSUploadToken', {
      fileName: file.name,
      fileSize: file.size,
      fileType: type
    });

    // 使用签名直接上传到OSS
    const formData = new FormData();
    Object.keys(uploadToken.fields).forEach(key => {
      formData.append(key, uploadToken.fields[key]);
    });
    formData.append('file', file);

    const response = await fetch(uploadToken.uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('文件上传失败');
    }

    return {
      success: true,
      url: uploadToken.fileUrl,
      fileName: file.name
    };
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
};
```

### 9. 后台管理API

```javascript
import AV from 'leancloud-storage';

// 获取书籍列表（后台管理）
const getBooks = async (filters = {}, page = 1, limit = 20) => {
  try {
    const Book = AV.Object.extend('Book');
    const query = new AV.Query(Book);

    // 应用筛选条件
    if (filters.title) {
      query.contains('title', filters.title);
    }
    if (filters.author) {
      query.contains('author', filters.author);
    }
    if (filters.category) {
      const Category = AV.Object.extend('Category');
      const category = AV.Object.createWithoutData('Category', filters.category);
      query.equalTo('category', category);
    }
    if (filters.status) {
      query.equalTo('status', filters.status);
    }

    // 分页
    query.limit(limit);
    query.skip((page - 1) * limit);
    query.descending('createdAt');

    const books = await query.find();

    return books.map(book => ({
      id: book.id,
      title: book.get('title'),
      author: book.get('author'),
      isbn: book.get('isbn'),
      category: book.get('category')?.get('nameCn'),
      status: book.get('status'),
      uploadDate: book.get('uploadDate'),
      coverUrl: book.get('coverUrl')
    }));
  } catch (error) {
    console.error('获取书籍列表失败:', error);
    throw error;
  }
};

// AI内容提取（后台管理）
const startAIExtraction = async (bookId) => {
  try {
    const result = await AV.Cloud.run('startAIExtraction', {
      bookId
    });
    return result;
  } catch (error) {
    console.error('启动AI提取失败:', error);
    throw error;
  }
};

// 视频审核（后台管理）
const reviewVideo = async (videoId, action, notes = '') => {
  try {
    const result = await AV.Cloud.run('reviewVideo', {
      videoId,
      action, // 'approve' 或 'reject'
      notes
    });
    return result;
  } catch (error) {
    console.error('视频审核失败:', error);
    throw error;
  }
};

// 获取统计数据（后台管理）
const getStatistics = async () => {
  try {
    const result = await AV.Cloud.run('getStatistics');
    return result;
  } catch (error) {
    console.error('获取统计数据失败:', error);
    throw error;
  }
};
```

### 10. 云函数调用（可选）

```javascript
// 调用云函数（例如：AI内容提取）
const result = await AV.Cloud.run('extractBookContent', {
  bookId: 'book-id',
  chapter: 'chapter-1'
});
```

---

## 成本优化建议

### 1. 存储优化

- ✅ **使用生命周期规则**: 30天后转为低频访问，节省50%存储成本
- ✅ **视频压缩**: 上传前压缩视频，减少存储空间
- ✅ **删除旧视频**: 定期清理不活跃的视频

### 2. 流量优化

- ✅ **启用CDN**: 虽然需要额外费用，但能提升用户体验
- ✅ **视频格式**: 使用HLS（m3u8）自适应码率，根据网络自动调整
- ✅ **预加载策略**: 只预加载下一个视频，避免浪费流量
- ✅ **缓存策略**: 客户端缓存已观看的视频

### 3. 数据库优化

- ✅ **索引优化**: 为常用查询字段创建索引
- ✅ **分页查询**: 避免一次性加载大量数据
- ✅ **数据归档**: 定期归档历史数据到归档表

### 4. 监控和告警

- 设置OSS流量告警（超过预期时通知）
- 监控LeanCloud API调用量（控制台可查看）
- 定期检查成本账单

---

## 常见问题

### Q1: LeanCloud 免费套餐够用吗？

**A**: 对于300用户量和每天10条视频发布完全够用：
- 数据库：5GB存储足够（视频元数据、用户信息、交互数据都很小）
- API请求：30,000次/天（约90万次/月）
  - 用户端：300用户 × 50次/天 × 30天 = 45万次
  - 后台管理：管理员操作约5万次
  - 总计约50万次/月，远低于90万次免费额度
- 文件存储：5GB免费（仅存封面图，视频文件存OSS）
- 云引擎：0.5核 512MB（免费，足够处理AI调用和业务逻辑）

### Q2: OSS存储成本会增长吗？

**A**: 会，但可控且成本可预测：
- 每天10条视频 × 20MB = 200MB/天
- 每月6GB，一年72GB
- 存储成本计算：
  - 标准存储：¥0.12/GB/月
  - 第一年累计：72GB × ¥0.12 = ¥8.64/月
  - 第二年：144GB × ¥0.12 = ¥17.28/月（存储量翻倍）
- 优化建议：
  - 使用生命周期规则：30天后转为低频访问（节省50%成本）
  - 定期清理无效视频
  - 监控存储使用量，设置告警

### Q3: CDN流量成本如何控制？

**A**:
- 使用HLS自适应码率，根据用户网络自动调整清晰度
- 设置合理的缓存时间（视频文件可缓存30天）
- 启用视频预加载但避免过度加载
- 监控流量使用情况，设置告警阈值
- React应用中实现懒加载和视频暂停机制

### Q4: 如何备份数据？

**A**: 
- LeanCloud: 可以手动导出数据（JSON格式）
- OSS: 可以配置跨区域复制（需要付费）
- 建议定期导出数据库备份

### Q5: 如何迁移到其他方案？

**A**: 
- LeanCloud数据可以导出JSON格式
- OSS文件可以迁移到其他对象存储
- 建议在项目初期就考虑迁移方案

### Q6: LeanCloud相比Supabase有什么优势？

**A**: 
- ✅ **国内访问快**: 服务器在国内，延迟低，用户体验好
- ✅ **中文文档**: 完整的中文文档和社区支持
- ✅ **技术支持**: 国内技术支持响应快
- ✅ **功能完整**: 数据存储、用户系统、云函数、推送一体化
- ✅ **成本透明**: 免费额度充足，超出部分按量付费

---

## 🌍 其他BaaS服务备选方案

如果需要其他技术栈或服务商，可以考虑以下方案：

### 方案对比

| 服务商 | 数据库 | 存储 | Web应用集成 | 月成本 | 推荐度 |
|--------|--------|------|----------|--------|--------|
| **LeanCloud** | MongoDB | 云存储 | 优秀（JS SDK） | ¥110-135 | ⭐⭐⭐⭐⭐ |
| **Supabase** | PostgreSQL | 云存储 | 优秀（React集成） | ¥115-145 | ⭐⭐⭐⭐ |
| **腾讯云开发** | 云数据库 | 云存储 | 良好（小程序优先） | ¥110-185 | ⭐⭐⭐⭐ |
| **阿里云Serverless** | 多种选择 | OSS | 一般（需额外配置） | ¥200-300 | ⭐⭐⭐ |

---

### 🥈 方案二：Supabase + 阿里云OSS（备选）

#### 为什么选择Supabase？

- ✅ **PostgreSQL数据库**: 关系型数据库，SQL查询灵活
- ✅ **开源生态**: 基于PostgreSQL，可自托管
- ✅ **实时订阅**: 支持实时数据同步
- ✅ **技术栈灵活**: RESTful API，支持多种语言

**注意**: Supabase服务器在海外，国内访问可能较慢

#### 成本分析

```
Supabase:
├── 数据库: ¥0（免费套餐500MB）
├── API请求: ¥0（500万次/月免费）
└── 文件存储: ¥0（1GB免费）

阿里云OSS（视频存储）:
├── 存储: ¥10-15/月
└── CDN流量: ¥100-120/月

总成本: ¥115-145/月
```

---

### 🥉 方案三：腾讯云开发（CloudBase）+ 腾讯云COS

#### 为什么选择腾讯云开发？

- ✅ **腾讯生态**: 与微信小程序无缝集成
- ✅ **国内访问快**: 腾讯云基础设施
- ✅ **功能丰富**: 云函数、云数据库、云存储一体化
- ✅ **成本可控**: 按量付费，有免费额度

#### 腾讯云开发配置

**1. 注册和开通**
- 访问 [https://cloud.tencent.com/product/tcb](https://cloud.tencent.com/product/tcb)
- 注册腾讯云账号并实名认证
- 开通云开发服务

**2. 免费套餐详情**
```
云数据库:
├── 存储空间: 2GB
└── 读次数: 5万次/天

云存储:
├── 存储空间: 5GB
└── 下载流量: 5GB/月

云函数:
├── 调用次数: 10万次/月
└── 资源使用量: 40万GBs/月
```

**3. 成本分析**

```
腾讯云开发:
├── 云数据库: ¥0-50/月（超出免费额度）
├── 云存储: ¥0（仅存封面图）
└── 云函数: ¥0（免费额度足够）

腾讯云COS（视频存储）:
├── 存储: ¥10-15/月
└── CDN流量: ¥100-120/月

总成本: ¥110-185/月
```

**4. 移动端集成示例**

```javascript
// 初始化
import cloud from '@cloudbase/js-sdk';

const app = cloud.init({
  env: 'your-env-id'
});

// 用户登录
await app.auth().anonymousAuthProvider().signIn();

// 查询视频
const db = app.database();
const videos = await db.collection('videos')
  .where({
    status: 'published',
    category_id: categoryId
  })
  .orderBy('created_at', 'desc')
  .limit(20)
  .get();

// 上传文件到云存储
const result = await app.uploadFile({
  cloudPath: 'videos/video-id.mp4',
  filePath: localFilePath
});
```

---

### 🥉 方案四：阿里云Serverless应用引擎（SAE）+ OSS

#### 适用场景

- 需要更多控制权
- 已有阿里云其他服务
- 需要自定义后端逻辑

#### 成本分析

```
SAE:
├── 应用实例: ¥0.00011111/GB*秒（按量付费）
└── 约¥50-100/月（根据使用量）

RDS数据库:
├── MySQL基础版: ¥88/月起
└── 或使用Serverless数据库（按量付费）

OSS（视频存储）:
├── 存储: ¥10-15/月
└── CDN流量: ¥100-120/月

总成本: ¥148-335/月
```

---

### 📊 BaaS方案对比总结

| 方案 | 月成本 | 访问速度 | 开发难度 | 推荐场景 |
|------|--------|----------|----------|----------|
| **LeanCloud + OSS** | ¥110-135 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 国内用户为主，快速开发 ⭐推荐 |
| **Supabase + OSS** | ¥115-145 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 海外用户或偏好PostgreSQL |
| **腾讯云开发 + COS** | ¥110-185 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 微信生态，小程序+APP |
| **阿里云SAE + OSS** | ¥148-335 | ⭐⭐⭐⭐⭐ | ⭐⭐ | 需要更多控制，已有阿里云服务 |

---

### 🎯 最终推荐

**首选：LeanCloud + 阿里云OSS** ⭐

**理由**:
1. ✅ **成本最低**: ¥110-135/月，适合初期启动
2. ✅ **访问最快**: 国内服务器，延迟低，用户体验好
3. ✅ **React集成优秀**: JavaScript SDK原生支持，开发便捷
4. ✅ **文档完善**: 中文文档完整，社区活跃，技术支持好
5. ✅ **功能完整**: 数据存储、用户认证、云函数、推送一体化
6. ✅ **OTP登录支持**: 原生支持邮箱验证码登录，符合项目需求
7. ✅ **稳定可靠**: 运营多年，服务稳定，国内合规

**备选：Supabase + 阿里云OSS**

**理由**:
1. ✅ **技术栈灵活**: PostgreSQL数据库，SQL查询灵活
2. ✅ **开源生态**: 基于PostgreSQL，可自托管
3. ✅ **实时订阅**: 支持实时数据同步
4. ⚠️ **注意**: 服务器在海外，国内访问可能较慢

---

## 下一步

1. ✅ 选择BaaS服务（Supabase或国内BaaS）
2. ✅ 完成BaaS和OSS配置
3. ✅ 创建数据库表结构
4. ✅ 测试API连接
5. ✅ 集成到移动端
6. ✅ 上传测试视频
7. ✅ 监控成本和性能

## 参考资源

- [LeanCloud官方文档](https://leancloud.cn/docs/)
- [LeanCloud JavaScript SDK](https://leancloud.cn/docs/leanstorage_guide-js.html)
- [阿里云OSS文档](https://help.aliyun.com/product/31815.html)
- [阿里云CDN文档](https://help.aliyun.com/product/27099.html)

---

### 数据库备份和恢复

#### 备份策略

1. **自动备份**：LeanCloud提供每日自动备份
2. **手动备份**：
   - 进入控制台 → 数据存储 → 数据导出
   - 选择需要备份的表，导出JSON格式
   - 下载备份文件并妥善保存

3. **OSS数据备份**：
   - 视频文件通过OSS的跨区域复制功能备份
   - 设置生命周期规则，自动备份到低频存储

#### 数据恢复

1. **控制台恢复**：
   - 进入控制台 → 数据存储 → 数据导入
   - 上传备份的JSON文件
   - 选择目标表进行恢复

2. **API恢复**：
   ```javascript
   // 使用LeanCloud SDK批量恢复数据
   const restoreData = async (backupData) => {
     for (const item of backupData) {
       const ObjectClass = AV.Object.extend(item.className);
       const obj = new ObjectClass();

       // 设置字段值
       Object.keys(item.data).forEach(key => {
         obj.set(key, item.data[key]);
       });

       await obj.save();
     }
   };
   ```

### 📝 注意事项

1. **API限制**：注意各API的调用频率限制和并发限制
2. **内容审核**：生成的视频内容仍需进行人工审核，确保内容质量
3. **版权问题**：确保生成的视频内容不侵犯他人版权
4. **成本控制**：根据实际使用量选择合适的计费方案
5. **备用方案**：建议准备至少一个备用API，以防主API服务不可用
6. **数据安全**：定期备份重要数据，保护用户隐私
7. **性能监控**：监控数据库查询性能，及时优化索引
8. **合规要求**：确保应用符合国内法律法规要求

---

**配置完成后，预计月成本：¥110-135/月**

如有问题，请参考官方文档或联系技术支持。

