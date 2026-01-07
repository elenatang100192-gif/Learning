// 修复数据库中点赞数为负数的问题
require('dotenv').config();
const AV = require('leancloud-storage');

// 初始化LeanCloud
AV.init({
  appId: process.env.LEANCLOUD_APP_ID || 'RDeCDLtbY5VWuuVuOV8GUfbl-gzGzoHsz',
  appKey: process.env.LEANCLOUD_APP_KEY || '1w0cQLBZIaJ32tjaU7RkDu3n',
  masterKey: process.env.LEANCLOUD_MASTER_KEY || 'Ub2GDZGGNo0NuUOvDRheK04Y',
  serverURL: process.env.LEANCLOUD_SERVER_URL || 'https://rdecdltb.lc-cn-n1-shared.com'
});

AV.Cloud.useMasterKey();

async function fixNegativeLikes() {
  try {
    console.log('🔍 开始检查并修复负数点赞数...');
    
    const query = new AV.Query('Video');
    const videos = await query.find({ useMasterKey: true });
    
    let fixedCount = 0;
    let negativeVideos = [];
    
    for (const video of videos) {
      const likeCount = video.get('likeCount') || 0;
      const title = video.get('title') || '未知标题';
      const videoId = video.id;
      
      if (likeCount < 0) {
        negativeVideos.push({
          id: videoId,
          title: title,
          oldLikeCount: likeCount
        });
        
        // 修复负数点赞数
        video.set('likeCount', 0);
        await video.save(null, { useMasterKey: true });
        fixedCount++;
        
        console.log(`✅ 已修复: ${title} (ID: ${videoId}) - 从 ${likeCount} 修复为 0`);
      }
    }
    
    console.log('\n📊 修复统计:');
    console.log(`   总视频数: ${videos.length}`);
    console.log(`   负数点赞数视频: ${negativeVideos.length}`);
    console.log(`   已修复: ${fixedCount}`);
    
    if (negativeVideos.length > 0) {
      console.log('\n📋 修复的视频列表:');
      negativeVideos.forEach(v => {
        console.log(`   - ${v.title} (ID: ${v.id}): ${v.oldLikeCount} → 0`);
      });
    }
    
    console.log('\n✨ 修复完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixNegativeLikes();

