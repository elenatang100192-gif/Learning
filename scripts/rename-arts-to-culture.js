#!/usr/bin/env node

/**
 * 数据库迁移脚本：将Category "Arts" 重命名为 "Culture"
 * 同时更新所有关联的Video和Book记录
 * 
 * 使用方法:
 * node scripts/rename-arts-to-culture.js
 */

const AV = require('leancloud-storage');

// LeanCloud配置
const LEANCLOUD_CONFIG = {
    appId: process.env.LEANCLOUD_APP_ID || 'RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz',
    appKey: process.env.LEANCLOUD_APP_KEY || '1w0cQLBZIaJ32tjaU7RkDu3n',
    masterKey: process.env.LEANCLOUD_MASTER_KEY || 'Ub2GDZGGNo0NuUOvDRheK04Y',
    serverURL: process.env.LEANCLOUD_SERVER_URL || 'https://rdecdltb.lc-cn-n1-shared.com'
};

async function initLeanCloud() {
    console.log('🔗 初始化LeanCloud连接...');
    try {
        AV.init(LEANCLOUD_CONFIG);
        AV.Cloud.useMasterKey();
        console.log('✅ LeanCloud SDK初始化成功');
        return true;
    } catch (error) {
        console.error('❌ LeanCloud连接失败:', error.message);
        return false;
    }
}

async function renameCategory() {
    console.log('\n📂 查找并更新Category记录...');
    
    try {
        // 查找name为'Arts'的Category
        const Category = AV.Object.extend('Category');
        const query = new AV.Query(Category);
        query.equalTo('name', 'Arts');
        const categories = await query.find();
        
        if (categories.length === 0) {
            console.log('⚠️  未找到name为"Arts"的Category记录');
            // 尝试查找name为'Culture'的记录，可能已经更新过了
            const cultureQuery = new AV.Query(Category);
            cultureQuery.equalTo('name', 'Culture');
            const cultureCategories = await cultureQuery.find();
            if (cultureCategories.length > 0) {
                console.log('✅ 发现name为"Culture"的Category记录，可能已经更新过了');
                return cultureCategories[0];
            }
            return null;
        }
        
        if (categories.length > 1) {
            console.log(`📊 发现${categories.length}条name为"Arts"的Category记录，将全部更新`);
        }
        
        // 更新所有Arts记录为Culture
        let updatedCount = 0;
        for (const artsCategory of categories) {
            console.log(`📝 更新Category记录: ID=${artsCategory.id}, name=${artsCategory.get('name')}, nameCn=${artsCategory.get('nameCn')}`);
            artsCategory.set('name', 'Culture');
            await artsCategory.save(null, { useMasterKey: true });
            updatedCount++;
        }
        
        console.log(`✅ 成功更新${updatedCount}条Category记录: name已改为"Culture"`);
        return categories[0]; // 返回第一条作为主要记录
    } catch (error) {
        console.error('❌ 更新Category失败:', error.message);
        throw error;
    }
}

async function updateVideos(category) {
    console.log('\n🎬 更新Video记录中的category...');
    
    if (!category) {
        console.log('⚠️  未找到Category，跳过Video更新');
        return;
    }
    
    try {
        const Video = AV.Object.extend('Video');
        const query = new AV.Query(Video);
        query.equalTo('category', category);
        const videos = await query.find();
        
        console.log(`📊 找到${videos.length}条关联的Video记录`);
        
        // Video记录的category字段是指向Category的指针，不需要更新
        // 因为我们已经更新了Category本身，所有指向它的Video会自动关联到新的Category
        console.log('✅ Video记录的category关联已自动更新（通过Category指针）');
        
        return videos.length;
    } catch (error) {
        console.error('❌ 更新Video记录失败:', error.message);
        throw error;
    }
}

async function updateBooks(category) {
    console.log('\n📚 更新Book记录中的category...');
    
    if (!category) {
        console.log('⚠️  未找到Category，跳过Book更新');
        return;
    }
    
    try {
        const Book = AV.Object.extend('Book');
        const query = new AV.Query(Book);
        query.equalTo('category', category);
        const books = await query.find();
        
        console.log(`📊 找到${books.length}条关联的Book记录`);
        
        // Book记录的category字段是指向Category的指针，不需要更新
        // 因为我们已经更新了Category本身，所有指向它的Book会自动关联到新的Category
        console.log('✅ Book记录的category关联已自动更新（通过Category指针）');
        
        return books.length;
    } catch (error) {
        console.error('❌ 更新Book记录失败:', error.message);
        throw error;
    }
}

async function main() {
    console.log('🚀 开始Category重命名迁移...\n');
    console.log('📋 迁移内容:');
    console.log('   - Category.name: "Arts" → "Culture"');
    console.log('   - Category.nameCn: "艺术人文" (保持不变)');
    console.log('   - 所有关联的Video和Book记录会自动更新\n');
    
    // 连接LeanCloud
    if (!(await initLeanCloud())) {
        process.exit(1);
    }
    
    try {
        // 1. 更新Category
        const category = await renameCategory();
        
        if (!category) {
            console.log('\n⚠️  未找到需要更新的Category记录，迁移完成');
            return;
        }
        
        // 2. 更新关联的Video和Book（实际上不需要，因为是指针关系）
        const videoCount = await updateVideos(category);
        const bookCount = await updateBooks(category);
        
        console.log('\n' + '='.repeat(50));
        console.log('🎉 Category重命名迁移完成！');
        console.log('\n📊 迁移结果:');
        console.log(`   - Category更新: 1条`);
        console.log(`   - Video记录关联: ${videoCount}条（自动更新）`);
        console.log(`   - Book记录关联: ${bookCount}条（自动更新）`);
        console.log('\n📋 下一步操作:');
        console.log('   1. 更新前端代码中的"Arts"为"Culture"');
        console.log('   2. 更新数据库初始化脚本');
        console.log('   3. 测试前端功能是否正常');
        console.log('='.repeat(50));
    } catch (error) {
        console.error('\n❌ 迁移过程中发生错误:', error);
        process.exit(1);
    }
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
    console.error('❌ 迁移过程中发生错误:', error);
    process.exit(1);
});

