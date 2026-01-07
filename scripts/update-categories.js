#!/usr/bin/env node

const AV = require("leancloud-storage");

const LEANCLOUD_CONFIG = {
    appId: "RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz",
    appKey: "1w0cQLBZIaJ32tjaU7RkDu3n",
    masterKey: "1w0cQLBZIaJ32tjaU7RkDu3n",
    serverURL: "https://rdecdltb.lc-cn-n1-shared.com"
};

const categoryMapping = {
    "tech": "Tech",
    "arts": "Arts",
    "business": "Business"
};

async function initLeanCloud() {
    console.log("🔗 初始化LeanCloud连接...");
    AV.init(LEANCLOUD_CONFIG);
    AV.Cloud.useMasterKey(true);
    console.log("✅ LeanCloud SDK初始化成功（使用Master Key）");
    return true;
}

async function updateCategories() {
    console.log("\n📂 更新分类名称...");
    const Category = AV.Object.extend("Category");
    const query = new AV.Query(Category);
    const categories = await query.find({ useMasterKey: true });
    let updatedCount = 0;
    
    for (const cat of categories) {
        const oldName = cat.get("name");
        const newName = categoryMapping[oldName];
        if (newName && oldName !== newName) {
            console.log(`  🔄 更新分类: ${oldName} -> ${newName}`);
            cat.set("name", newName);
            await cat.save(null, { useMasterKey: true });
            updatedCount++;
        } else if (!newName) {
            console.log(`  ⚠️  跳过未知分类: ${oldName}`);
        } else {
            console.log(`  ✓ 分类已是最新: ${oldName}`);
        }
    }
    
    console.log(`\n✅ 分类更新完成，共更新 ${updatedCount} 个分类`);
    return true;
}

(async () => {
    await initLeanCloud();
    await updateCategories();
})();
