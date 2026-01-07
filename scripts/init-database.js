#!/usr/bin/env node

/**
 * LeanCloud数据库初始化脚本
 * 用于初始化知识视频APP的数据库结构和基础数据
 *
 * 使用方法:
 * 1. 确保已安装依赖: npm install leancloud-storage
 * 2. 配置环境变量或直接修改脚本中的配置
 * 3. 运行: node scripts/init-database.js
 */

const AV = require('leancloud-storage');

// LeanCloud配置
const LEANCLOUD_CONFIG = {
    appId: process.env.LEANCLOUD_APP_ID || 'RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz',
    appKey: process.env.LEANCLOUD_APP_KEY || '1w0cQLBZIaJ32tjaU7RkDu3n',
    serverURL: process.env.LEANCLOUD_SERVER_URL || 'https://rdecdltb.lc-cn-n1-shared.com'
};

async function initLeanCloud() {
    console.log('🔗 初始化LeanCloud连接...');

    try {
        AV.init(LEANCLOUD_CONFIG);
        console.log('✅ LeanCloud SDK初始化成功');
        console.log('📋 配置信息:');
        console.log('   - App ID:', LEANCLOUD_CONFIG.appId);
        console.log('   - Server URL:', LEANCLOUD_CONFIG.serverURL);
        return true;
    } catch (error) {
        console.error('❌ LeanCloud连接失败:', error.message);
        console.log('💡 请检查：');
        console.log('   - App ID 和 App Key 是否正确');
        console.log('   - 网络连接是否正常');
        console.log('   - LeanCloud 服务是否可用');
        return false;
    }
}

async function createCategories() {
    console.log('\n📂 创建分类数据...');

    try {
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
            console.log(`  ✅ 创建分类: ${cat.nameCn}`);
        }

        console.log('✅ 分类创建完成');
        return true;
    } catch (error) {
        console.error('❌ 创建分类失败:', error.message);
        return false;
    }
}

async function createSampleBooks() {
    console.log('\n📚 创建示例书籍...');

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
            console.log(`  ✅ 创建书籍: ${bookData.title}`);
        }

        console.log('✅ 示例书籍创建完成');
        return true;
    } catch (error) {
        console.error('❌ 创建示例书籍失败:', error.message);
        return false;
    }
}

async function createSampleVideos() {
    console.log('\n🎬 创建示例视频...');

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
            console.log(`  ✅ 创建视频: ${videoData.title}`);
        }

        console.log('✅ 示例视频创建完成');
        return true;
    } catch (error) {
        console.error('❌ 创建示例视频失败:', error.message);
        return false;
    }
}

async function createStatistics() {
    console.log('\n📊 创建每日统计记录...');

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
        console.log(`  ✅ 创建统计数据: ${today}`);
        console.log('✅ 统计数据创建完成');
        return true;
    } catch (error) {
        console.error('❌ 创建统计数据失败:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 开始LeanCloud数据库初始化...\n');

    // 连接LeanCloud
    if (!(await initLeanCloud())) {
        process.exit(1);
    }

    // 执行初始化步骤
    const steps = [
        { name: '分类数据', func: createCategories },
        { name: '示例书籍', func: createSampleBooks },
        { name: '示例视频', func: createSampleVideos },
        { name: '统计数据', func: createStatistics }
    ];

    let successCount = 0;
    for (const step of steps) {
        if (await step.func()) {
            successCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    if (successCount === steps.length) {
        console.log('🎉 数据库初始化全部完成！');
        console.log('\n📋 下一步操作:');
        console.log('1. 进入LeanCloud控制台验证数据');
        console.log('2. 启动前端应用测试功能');
        console.log('3. 开始开发和测试');
    } else {
        console.log(`⚠️  初始化部分完成 (${successCount}/${steps.length})`);
        console.log('请检查错误信息并重试失败的步骤');
    }
    console.log('='.repeat(50));
}

// 处理未捕获的错误
process.on('unhandledRejection', (error) => {
    console.error('❌ 未处理的Promise错误:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    process.exit(1);
});

// 运行主函数
main().catch(error => {
    console.error('❌ 初始化过程中发生错误:', error);
    process.exit(1);
});
