#!/usr/bin/env node
/**
 * FFmpeg字幕编码支持检查脚本
 * 用于验证FFmpeg是否支持charenc参数
 */

const { execSync } = require('child_process');

console.log('🔍 检查FFmpeg字幕编码支持情况...\n');

try {
  // 1. 检查FFmpeg版本
  console.log('1️⃣ 检查FFmpeg版本:');
  const versionOutput = execSync('ffmpeg -version 2>&1', { encoding: 'utf8', timeout: 5000 });
  const versionMatch = versionOutput.match(/ffmpeg version (\d+\.\d+\.\d+)/);
  const version = versionMatch ? versionMatch[1] : 'unknown';
  console.log(`   ✅ FFmpeg版本: ${version}`);
  
  // 解析版本号
  const [major, minor] = version.split('.').map(Number);
  const isSupported = version !== 'unknown' && (major > 2 || (major === 2 && minor >= 0));
  console.log(`   ${isSupported ? '✅' : '⚠️'} 版本支持情况: ${isSupported ? '支持（FFmpeg 2.0+）' : '可能不支持（需要FFmpeg 2.0+）'}`);
  
  // 2. 检查subtitles滤镜是否存在
  console.log('\n2️⃣ 检查subtitles滤镜:');
  try {
    const filtersOutput = execSync('ffmpeg -filters 2>&1 | grep subtitles', { encoding: 'utf8', timeout: 5000 });
    console.log('   ✅ subtitles滤镜可用');
    console.log(`   输出: ${filtersOutput.trim()}`);
  } catch (e) {
    console.log('   ❌ 无法找到subtitles滤镜');
  }
  
  // 3. 检查charenc参数支持
  console.log('\n3️⃣ 检查charenc参数支持:');
  try {
    const filterHelp = execSync('ffmpeg -h filter=subtitles 2>&1', { encoding: 'utf8', timeout: 5000 });
    
    if (filterHelp.includes('charenc')) {
      console.log('   ✅ 支持charenc参数');
      // 提取charenc相关说明
      const charencMatch = filterHelp.match(/charenc[^\n]*/);
      if (charencMatch) {
        console.log(`   说明: ${charencMatch[0].trim()}`);
      }
    } else if (filterHelp.includes('character encoding') || filterHelp.includes('encoding')) {
      console.log('   ⚠️  可能支持字符编码参数（但未找到charenc关键字）');
      console.log('   建议：查看完整帮助文档确认');
    } else {
      console.log('   ⚠️  未找到charenc参数说明');
      console.log('   注意：某些FFmpeg版本可能使用其他参数名');
    }
    
    // 显示部分帮助信息
    console.log('\n   📋 subtitles滤镜帮助信息（前500字符）:');
    console.log(`   ${filterHelp.substring(0, 500).replace(/\n/g, '\n   ')}...`);
    
  } catch (e) {
    console.log('   ❌ 无法获取subtitles滤镜帮助信息');
    console.log(`   错误: ${e.message}`);
  }
  
  // 4. 测试实际使用charenc参数
  console.log('\n4️⃣ 测试charenc参数使用:');
  console.log('   建议测试命令:');
  console.log('   ffmpeg -i input.mp4 -vf "subtitles=sub.srt:charenc=UTF-8" output.mp4');
  console.log('\n   如果命令执行成功且字幕正确显示，说明charenc参数可用');
  
  // 5. 总结
  console.log('\n📊 总结:');
  const charencSupported = filterHelp && filterHelp.includes('charenc');
  console.log(`   FFmpeg版本: ${version}`);
  console.log(`   charenc参数支持: ${charencSupported ? '✅ 确认支持' : '⚠️ 未确认（但可能支持）'}`);
  console.log('\n💡 建议:');
  if (charencSupported) {
    console.log('   ✅ 可以使用charenc=UTF-8参数');
    console.log('   ✅ 字幕文件应使用UTF-8 BOM编码');
    console.log('   ✅ 双重保障确保中文字幕正确显示');
  } else if (isSupported) {
    console.log('   ✅ 版本支持，建议测试charenc参数');
    console.log('   ✅ 字幕文件应使用UTF-8 BOM编码');
  } else {
    console.log('   ⚠️  建议升级FFmpeg到2.0或更高版本');
    console.log('   ⚠️  或者仅依赖UTF-8 BOM编码（不指定charenc参数）');
  }
  
} catch (error) {
  console.error('❌ 检查失败:', error.message);
  console.error('\n💡 可能的原因:');
  console.error('   1. FFmpeg未安装或不在PATH中');
  console.error('   2. FFmpeg版本过旧');
  console.error('   3. 系统权限问题');
  process.exit(1);
}

