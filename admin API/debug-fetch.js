#!/usr/bin/env node

/**
 * 调试 fetch 请求问题
 * 用法: node debug-fetch.js <URL>
 */

const url = process.argv[2];

if (!url) {
  console.error('请提供URL作为参数');
  console.error('用法: node debug-fetch.js <URL>');
  process.exit(1);
}

console.log('🔍 调试 fetch 请求');
console.log('📍 目标URL:', url);
console.log('🌐 Node.js版本:', process.version);
console.log('');

async function testFetch() {
  try {
    console.log('1️⃣ 测试基础 fetch...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    console.log('✅ Fetch成功!');
    console.log('   状态码:', response.status);
    console.log('   状态文本:', response.statusText);
    console.log('   Content-Type:', response.headers.get('content-type'));
    console.log('   Content-Length:', response.headers.get('content-length'));
    
    if (response.ok) {
      console.log('');
      console.log('2️⃣ 测试读取数据...');
      const arrayBuffer = await response.arrayBuffer();
      const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
      console.log('✅ 数据读取成功!');
      console.log('   文件大小:', sizeMB, 'MB');
    } else {
      console.log('⚠️ 响应状态不是 OK');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Fetch失败!');
    console.error('   错误类型:', error.constructor.name);
    console.error('   错误消息:', error.message);
    console.error('   错误代码:', error.code || 'N/A');
    console.error('   错误原因:', error.cause || 'N/A');
    console.error('');
    console.error('完整错误对象:');
    console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    process.exit(1);
  }
}

testFetch().then(() => {
  console.log('');
  console.log('🎉 所有测试通过!');
  process.exit(0);
}).catch((err) => {
  console.error('');
  console.error('💥 未捕获的错误:', err);
  process.exit(1);
});

