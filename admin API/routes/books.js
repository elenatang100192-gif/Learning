// 确保环境变量已加载（如果server.js已经加载了dotenv，这里不会重复加载）
if (!process.env.DASHSCOPE_API_KEY && !process.env.ALIYUN_API_KEY) {
  require('dotenv').config();
}

const express = require('express');
const multer = require('multer');
const router = express.Router();
const AV = require('leancloud-storage');
const tencentcloud = require('tencentcloud-sdk-nodejs');
const OSS = require('ali-oss');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const pdfParse = require('pdf-parse');
const { EPub } = require('epub2');
// OCR功能暂时禁用，等待修复pdfjs-dist导入问题
// const { createWorker } = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');

// 配置multer用于文件上传
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB限制
});

// API配置（从环境变量读取）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-0abbe78f54d84a7f8a91c1e36bce0a97';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 阿里云百炼（DashScope）API配置
// 环境变量名：DASHSCOPE_API_KEY（符合阿里云官方文档规范）
// 文档：https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2803795
const ALIYUN_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.ALIYUN_API_KEY || 'sk-7d830956ecb642349f40833295dfd04c';

// 验证API Key是否已加载
if (!ALIYUN_API_KEY || ALIYUN_API_KEY.length < 20) {
  console.error('❌ 警告：阿里云API Key未正确加载，当前值:', ALIYUN_API_KEY ? `长度${ALIYUN_API_KEY.length}` : 'undefined');
  console.error('❌ 请确保已设置DASHSCOPE_API_KEY环境变量');
} else {
  console.log('✅ 阿里云API Key已加载，长度:', ALIYUN_API_KEY.length, '前4位:', ALIYUN_API_KEY.substring(0, 4));
}

const ALIYUN_IMAGE_GEN_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const ALIYUN_FACE_DETECT_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/face-detect';
const ALIYUN_VIDEO_GEN_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/generation';
// Doubao-Seedance-1.5-pro API配置（视频生成）
// 根据README.md配置：
// DOUBAO_MODEL_ID：doubao-seedance-1-5-pro-251215
// API Key：866a3f1e-a011-4f07-a5a8-01cd771f8552
// 文档: https://www.volcengine.com/docs/82379/1520758?lang=zh
const DOUBAO_API_KEY = process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || '866a3f1e-a011-4f07-a5a8-01cd771f8552';
// 模型ID：doubao-seedance-1-5-pro-251215
const DOUBAO_MODEL_ID = process.env.DOUBAO_MODEL_ID || 'doubao-seedance-1-5-pro-251215';
// volcengine API端点（视频生成）
const DOUBAO_TEXT_TO_VIDEO_URL = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';
const DOUBAO_TASK_STATUS_URL = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

// Doubao-Seedream-4-0 API配置（图片生成）
// 模型ID：doubao-seedream-4-0-250828
// API端点：https://ark.cn-beijing.volces.com/api/v3/images/generations
const DOUBAO_IMAGE_GEN_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const DOUBAO_IMAGE_MODEL_ID = process.env.DOUBAO_IMAGE_MODEL_ID || 'doubao-seedream-4-0-250828';

// 注意：已完全移除豆包TTS相关代码，只使用腾讯云TTS
// 以下变量定义保留仅用于兼容性，但不会被使用
// Doubao语音合成大模型API配置（已禁用，不再使用）
// const DOUBAO_TTS_APP_ID = process.env.DOUBAO_TTS_APP_ID || '7616870473';
// const DOUBAO_TTS_ACCESS_KEY = process.env.DOUBAO_TTS_ACCESS_KEY || process.env.DOUBAO_TTS_ACCESS_TOKEN || 'q8Fx7NRJOVxrl6486XjBKaTL4gqVwqXm';
// const DOUBAO_TTS_SECRET_KEY = process.env.DOUBAO_TTS_SECRET_KEY || 'd9ryy2RnuxT5wGmmA4EteU24fVRjcYSb';
// const DOUBAO_TTS_API_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
// const DOUBAO_TTS_RESOURCE_ID = process.env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-1.0';

// 阿里云OSS配置（从环境变量读取，必须配置）
const OSS_REGION = process.env.OSS_REGION || 'oss-cn-hangzhou';
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID;
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET;
const OSS_BUCKET = process.env.OSS_BUCKET || 'knowledge-video-app';

if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET) {
  console.error('❌ 警告：阿里云OSS AccessKey未配置，请设置OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET环境变量');
}

// 初始化OSS客户端（使用secure: true确保使用HTTPS）
const ossClient = new OSS({
  region: OSS_REGION,
  accessKeyId: OSS_ACCESS_KEY_ID,
  accessKeySecret: OSS_ACCESS_KEY_SECRET,
  bucket: OSS_BUCKET,
  secure: true  // 使用HTTPS
});

console.log('✅ 阿里云OSS客户端已初始化，Bucket:', OSS_BUCKET, 'Region:', OSS_REGION, 'Secure: true (HTTPS)');

// 辅助函数：将文件从URL下载并上传到OSS
async function uploadToOSS(fileUrl, fileName, contentType) {
  try {
    console.log('📥 开始下载文件:', fileUrl);
    
    // 下载文件
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`下载文件失败: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log('✅ 文件下载完成，大小:', buffer.length, 'bytes');
    
    // 上传到OSS
    const ossPath = `video-generation/${Date.now()}_${fileName}`;
    console.log('📤 上传文件到OSS:', ossPath);
    
    // 上传文件到OSS，并设置ACL为公共读（确保阿里云API可以访问）
    const result = await ossClient.put(ossPath, buffer, {
      contentType: contentType || 'application/octet-stream',
      headers: {
        'Cache-Control': 'public, max-age=31536000'
      },
      // 设置ACL为公共读，确保文件可以被公开访问
      acl: 'public-read'
    });
    
    // 确保返回HTTPS URL（阿里云API可能需要HTTPS）
    let finalUrl = result.url;
    if (finalUrl && finalUrl.startsWith('http://')) {
      finalUrl = finalUrl.replace('http://', 'https://');
      console.log('🔧 将OSS URL从HTTP转换为HTTPS');
    }
    
    // 验证URL是否可以访问（等待文件同步）
    console.log('⏳ 等待文件同步...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    
    // 验证URL可访问性
    try {
      const checkResponse = await fetch(finalUrl, { method: 'HEAD' });
      if (!checkResponse.ok) {
        console.warn('⚠️ OSS URL可能无法访问:', finalUrl, '状态码:', checkResponse.status);
        // 如果HEAD失败，尝试GET请求
        const getResponse = await fetch(finalUrl, { method: 'GET', headers: { 'Range': 'bytes=0-0' } });
        if (!getResponse.ok) {
          throw new Error(`OSS URL无法访问: ${finalUrl}, 状态码: ${getResponse.status}`);
        } else {
          console.log('✅ OSS URL可访问（通过GET请求验证）:', finalUrl);
        }
      } else {
        console.log('✅ OSS URL可访问:', finalUrl);
      }
    } catch (checkError) {
      console.error('❌ 无法验证OSS URL可访问性:', checkError.message);
      throw new Error(`OSS URL验证失败: ${checkError.message}`);
    }
    
    // 尝试生成签名URL（有效期1小时），某些API可能需要签名URL
    try {
      const signUrl = ossClient.signatureUrl(ossPath, {
        expires: 3600, // 1小时有效期
        method: 'GET'
      });
      console.log('🔐 生成OSS签名URL（备用）:', signUrl.substring(0, 80) + '...');
      // 注意：如果普通URL不行，可以尝试使用签名URL
      // 但目前先使用普通URL，如果失败再尝试签名URL
    } catch (signError) {
      console.warn('⚠️ 生成签名URL失败:', signError.message);
    }
    
    console.log('✅ 文件上传到OSS成功，URL:', finalUrl);
    return finalUrl;
  } catch (error) {
    console.error('❌ 上传文件到OSS失败:', error);
    throw error;
  }
}

// 腾讯云长语音合成API配置（从环境变量读取，必须配置）
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID;
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY;

if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
  console.error('❌ 警告：腾讯云TTS Secret未配置，请设置TENCENT_SECRET_ID和TENCENT_SECRET_KEY环境变量');
}
const TENCENT_TTS_ENDPOINT = 'tts.tencentcloudapi.com';
const TENCENT_TTS_REGION = 'ap-guangzhou';
const TENCENT_TTS_SERVICE = 'tts';
const TENCENT_TTS_VERSION = '2019-08-23';

// 注意：阿里云API可能需要使用不同的认证方式
// Authorization header格式应该是: Bearer {API_KEY} 或 X-DashScope-API-Key: {API_KEY}

// 辅助函数：使用OCR识别PDF页面（暂时禁用）
async function extractTextFromPDFWithOCR(buffer) {
  throw new Error('OCR功能暂时不可用，正在修复中。请上传包含可提取文本的PDF文件。');
}

// 辅助函数：从文件URL提取文本内容
async function extractTextFromFile(fileUrl) {
  try {
    console.log('📥 开始下载文件:', fileUrl);
    
    // 下载文件
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`下载文件失败: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // 从URL提取文件扩展名（处理可能包含查询参数的情况）
    const urlPath = fileUrl.split('?')[0]; // 移除查询参数
    const fileExtension = urlPath.split('.').pop().toLowerCase();
    
    console.log('📄 文件URL:', fileUrl);
    console.log('📄 文件类型:', fileExtension, '文件大小:', buffer.length, 'bytes');
    
    // 验证文件大小
    if (buffer.length === 0) {
      throw new Error('下载的文件为空');
    }
    
    // 验证文件类型（通过文件头验证）
    const fileHeader = buffer.slice(0, 4).toString('hex');
    console.log('📄 文件头:', fileHeader);
    
    if (fileExtension === 'pdf') {
      // PDF文件头应该是 %PDF
      if (!buffer.toString('utf8', 0, 4).startsWith('%PDF')) {
        console.warn('⚠️ 文件头不是PDF格式，但扩展名是.pdf');
      }
    } else if (fileExtension === 'epub') {
      // EPUB文件实际上是ZIP文件，ZIP文件头是 PK
      if (!buffer.toString('utf8', 0, 2).startsWith('PK')) {
        console.warn('⚠️ 文件头不是ZIP格式，但扩展名是.epub');
      }
    }
    
    let textContent = '';
    
    if (fileExtension === 'pdf') {
      // 提取PDF文本
      console.log('📄 开始解析PDF文件，大小:', buffer.length, 'bytes');
      try {
        const pdfData = await pdfParse(buffer);
        console.log('📊 PDF解析结果:', {
          hasText: !!pdfData.text,
          textLength: pdfData.text ? pdfData.text.length : 0,
          numPages: pdfData.numpages || 'unknown',
          info: pdfData.info || 'no info'
        });
        
        textContent = pdfData.text || '';
        
        // 如果text为空，尝试从其他字段获取
        if (!textContent || textContent.trim().length === 0) {
          console.warn('⚠️ PDF文本为空，尝试其他方法...');
          // 检查是否有其他文本字段
          if (pdfData.textContent) {
            textContent = pdfData.textContent;
          }
        }
        
        console.log('✅ PDF文本提取完成，长度:', textContent.length);
      } catch (pdfError) {
        console.error('❌ PDF解析失败:', pdfError);
        console.error('❌ 错误详情:', pdfError.message, pdfError.stack);
        // 如果PDF解析失败，尝试使用OCR
        console.log('⚠️ PDF解析失败，尝试使用OCR识别...');
        try {
          const ocrText = await extractTextFromPDFWithOCR(buffer);
          if (ocrText && ocrText.trim().length > 0) {
            textContent = ocrText;
            console.log('✅ OCR识别成功，使用OCR文本');
          } else {
            throw new Error('OCR识别结果为空');
          }
        } catch (ocrError) {
          console.error('❌ OCR识别也失败:', ocrError.message);
          throw new Error(`PDF解析失败: ${pdfError.message}。OCR识别也失败: ${ocrError.message}`);
        }
      }
    } else if (fileExtension === 'epub') {
      // 提取EPUB文本
      // 创建临时文件
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'epub-'));
      const tempFilePath = path.join(tempDir, 'book.epub');
      await fs.writeFile(tempFilePath, buffer);
      
      try {
        const epub = new EPub(tempFilePath);
        await epub.parse();
        
        const chapters = epub.flow || [];
        for (const chapter of chapters) {
          try {
            const chapterText = await epub.getChapter(chapter.id);
            if (chapterText) {
              // 移除HTML标签，提取纯文本
              const plainText = chapterText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
              textContent += plainText + '\n\n';
            }
          } catch (chapterError) {
            console.warn(`⚠️ 跳过章节 ${chapter.id}:`, chapterError.message);
          }
        }
        console.log('✅ EPUB文本提取完成，长度:', textContent.length);
      } finally {
        // 清理临时文件
        try {
          await fs.unlink(tempFilePath);
          await fs.rmdir(tempDir);
        } catch (cleanupError) {
          console.warn('⚠️ 清理临时文件失败:', cleanupError.message);
        }
      }
    } else if (fileExtension === 'mobi') {
      // MOBI格式比较复杂，暂时返回错误提示
      throw new Error('MOBI格式暂不支持，请上传PDF或EPUB格式');
    } else {
      throw new Error(`不支持的文件格式: ${fileExtension}`);
    }
    
    // 检查文本内容（检查是否包含实际的中文或英文字符）
    let cleanText = textContent.replace(/\s+/g, ' ').trim();
    
    // 检查是否包含中文字符或英文字母
    let hasChinese = /[\u4e00-\u9fa5]/.test(textContent);
    let hasEnglish = /[a-zA-Z]/.test(textContent);
    let meaningfulLength = textContent.replace(/[\s\n\r\t]/g, '').length;
    
    console.log('📊 文本内容检查:');
    console.log('   原始长度:', textContent.length);
    console.log('   清理后长度:', cleanText.length);
    console.log('   有意义字符数:', meaningfulLength);
    console.log('   包含中文:', hasChinese);
    console.log('   包含英文:', hasEnglish);
    console.log('   前200字符:', textContent.substring(0, 200));
    
    // 如果PDF文件很大但文本很少，尝试使用OCR
    if (fileExtension === 'pdf' && buffer.length > 1000000 && meaningfulLength < 100) {
      console.log('⚠️ PDF文本很少，可能是扫描版，尝试使用OCR识别...');
      try {
        const ocrText = await extractTextFromPDFWithOCR(buffer);
        if (ocrText && ocrText.trim().length > 0) {
          const ocrMeaningfulLength = ocrText.replace(/[\s\n\r\t]/g, '').length;
          if (ocrMeaningfulLength >= 10) {
            console.log('✅ OCR识别成功，使用OCR文本');
            textContent = ocrText;
            // 重新计算有意义字符数和检查标志
            meaningfulLength = ocrMeaningfulLength;
            cleanText = textContent.replace(/\s+/g, ' ').trim();
            hasChinese = /[\u4e00-\u9fa5]/.test(textContent);
            hasEnglish = /[a-zA-Z]/.test(textContent);
            console.log('📊 OCR文本内容检查:');
            console.log('   原始长度:', textContent.length);
            console.log('   清理后长度:', cleanText.length);
            console.log('   有意义字符数:', meaningfulLength);
            console.log('   包含中文:', hasChinese);
            console.log('   包含英文:', hasEnglish);
          } else {
            throw new Error('OCR识别结果仍然为空或文本太少');
          }
        } else {
          throw new Error('OCR识别结果为空');
        }
      } catch (ocrError) {
        console.error('❌ OCR识别失败:', ocrError.message);
        throw new Error(`PDF文件可能是扫描版（图片），OCR识别失败: ${ocrError.message}。请确保PDF文件清晰可读，或上传包含可提取文本的PDF文件。`);
      }
    }
    
    // 如果文本长度大于0但只包含空白字符，或者有意义字符少于10个
    if (!textContent || cleanText.length === 0 || meaningfulLength < 10) {
      console.error('❌ 提取的文本内容为空或只包含空白字符');
      console.error('❌ 文件URL:', fileUrl);
      console.error('❌ 文件类型:', fileExtension);
      console.error('❌ 文件大小:', buffer.length, 'bytes');
      console.error('❌ 原始文本长度:', textContent.length);
      console.error('❌ 清理后文本长度:', cleanText.length);
      console.error('❌ 有意义字符数:', meaningfulLength);
      
      throw new Error(`无法从文件中提取文本内容，文件可能为空或格式不正确。文件类型: ${fileExtension}, 文件大小: ${buffer.length} bytes, 提取的文本长度: ${textContent.length} 字符, 有意义字符数: ${meaningfulLength}`);
    }
    
    // 使用原始文本（不清理，保留格式）
    // textContent保持原样，只在检查时清理
    
    // 限制文本长度（避免超过API限制）
    const maxLength = 50000; // 限制为50000字符
    if (textContent.length > maxLength) {
      console.log(`⚠️ 文本内容过长(${textContent.length}字符)，截取前${maxLength}字符`);
      textContent = textContent.substring(0, maxLength);
    }
    
    return textContent;
  } catch (error) {
    console.error('❌ 提取文件文本失败:', error);
    throw error;
  }
}

// 使用Master Key进行操作
AV.Cloud.useMasterKey();

// 初始化腾讯云TTS客户端
const TtsClient = tencentcloud.tts.v20190823.Client;
const tencentTtsClient = new TtsClient({
  credential: {
    secretId: TENCENT_SECRET_ID,
    secretKey: TENCENT_SECRET_KEY,
  },
  region: TENCENT_TTS_REGION,
  profile: {
    httpProfile: {
      endpoint: TENCENT_TTS_ENDPOINT,
    },
  },
});

// 初始化腾讯云ASR（语音识别）客户端
const AsrClient = tencentcloud.asr.v20190614.Client;
const tencentAsrClient = new AsrClient({
  credential: {
    secretId: TENCENT_SECRET_ID,
    secretKey: TENCENT_SECRET_KEY,
  },
  region: 'ap-shanghai', // ASR服务区域
  profile: {
    httpProfile: {
      endpoint: 'asr.tencentcloudapi.com',
    },
  },
});

// 上传电子书文件
router.post('/upload', upload.single('bookFile'), async (req, res) => {
  // 设置上传请求超时时间为5分钟
  req.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);
  
  try {
    const { title, author, isbn, categoryId } = req.body;
    const file = req.file;

    if (!title || !author || !isbn || !categoryId) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请上传电子书文件'
      });
    }

    // 验证文件类型
    const allowedTypes = ['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '不支持的文件格式，请上传PDF、EPUB或MOBI格式'
      });
    }

    // 获取分类对象
    const category = await new AV.Query('Category').get(categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: '无效的分类'
      });
    }

    // 上传文件到LeanCloud（使用Master Key）
    console.log(`📤 开始上传文件到LeanCloud，文件名: ${file.originalname}，大小: ${(file.buffer.length / 1024 / 1024).toFixed(2)}MB`);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `books/${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;
    
    // 确保使用Master Key（在创建File对象之前调用）
    AV.Cloud.useMasterKey();
    const leancloudFile = new AV.File(fileName, Buffer.from(file.buffer), file.mimetype);
    
    // 设置超时时间（5分钟）
    const uploadStartTime = Date.now();
    try {
      // 使用Master Key上传文件，避免权限问题
      // 注意：AV.File.save() 的正确用法是直接调用 save()，因为已经调用了 AV.Cloud.useMasterKey()
      await Promise.race([
        leancloudFile.save(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('文件上传超时，请检查网络连接或文件大小')), 5 * 60 * 1000)
        )
      ]);
      const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
      console.log(`✅ 文件上传完成，耗时: ${uploadTime}秒，URL: ${leancloudFile.url()}`);
    } catch (error) {
      console.error('❌ 文件上传失败:', error);
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
      // 如果是DNS错误，提供更友好的错误信息
      if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
        throw new Error('文件上传失败：无法连接到LeanCloud服务器，请检查网络连接或联系管理员');
      }
      throw new Error(`文件上传失败: ${error.message}`);
    }

    // 验证文件URL是否可访问（确保文件已完全上传）
    const fileUrl = leancloudFile.url();
    console.log('🔍 验证文件URL可访问性:', fileUrl);
    let fileAccessible = false;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!fileAccessible && retryCount < maxRetries) {
      try {
        const checkResponse = await fetch(fileUrl, { method: 'HEAD', timeout: 5000 });
        if (checkResponse.ok) {
          fileAccessible = true;
          console.log('✅ 文件URL可访问');
        } else {
          retryCount++;
          console.log(`⏳ 文件URL暂不可访问，重试 ${retryCount}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
        }
      } catch (error) {
        retryCount++;
        console.log(`⏳ 文件URL检查失败，重试 ${retryCount}/${maxRetries}...`, error.message);
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
        }
      }
    }
    
    if (!fileAccessible) {
      console.warn('⚠️ 文件URL验证失败，但继续创建书籍记录');
    }

    // 创建书籍对象（只有在文件上传完成后才创建）
    console.log('📝 创建书籍记录...');
    const BookClass = AV.Object.extend('Book');
    const book = new BookClass();

    book.set('title', title);
    book.set('author', author);
    book.set('isbn', isbn);
    book.set('category', category);
    book.set('fileUrl', fileUrl);
    book.set('uploadDate', new Date().toISOString().split('T')[0]);
    book.set('status', '待处理');

    await book.save();
    console.log('✅ 书籍记录创建成功，ID:', book.id);

    res.json({
      success: true,
      data: {
        id: book.id,
        title: book.get('title'),
        author: book.get('author'),
        isbn: book.get('isbn'),
        category: {
          id: category.id,
          name: category.get('name'),
          nameCn: category.get('nameCn')
        },
        fileUrl: book.get('fileUrl'),
        uploadDate: book.get('uploadDate'),
        status: book.get('status')
      }
    });
  } catch (error) {
    console.error('上传电子书失败:', error);
    res.status(500).json({
      success: false,
      message: '上传电子书失败',
      error: error.message
    });
  }
});

// 生成博客封面图（使用doubao-seedream-4-0模型）- 必须在 /:bookId/extract 之前定义
// 生成博客封面图提示词（使用Deepseek生成3种风格）
router.post('/:bookId/generate-blog-cover-prompts', async (req, res) => {
  try {
    const { bookId } = req.params;
    
    // 获取书籍信息
    const book = await new AV.Query('Book').get(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: '书籍不存在'
      });
    }
    
    const title = book.get('title');
    const author = book.get('author');
    const titleEn = book.get('titleEn') || '';
    const authorEn = book.get('authorEn') || '';
    
    if (!title || !author) {
      return res.status(400).json({
        success: false,
        message: '书籍标题或作者信息缺失'
      });
    }
    
    // 构建书名和作者文本
    let titleText = title;
    let authorText = author;
    
    if (titleEn && titleEn.trim()) {
      titleText = `${title} / ${titleEn}`;
    }
    if (authorEn && authorEn.trim()) {
      authorText = `${author} / ${authorEn}`;
    }
    
    console.log('🎨 开始生成博客封面图提示词，书名:', titleText, '作者:', authorText);
    
    // 使用Deepseek生成3种风格的提示词
    const deepseekPrompt = `请根据以下书籍信息，生成3种不同风格的博客封面图提示词。

书籍信息：
- 书名：${titleText}
- 作者：${authorText}

要求：
1. 必须生成恰好3个提示词，分别对应以下3种风格：
   - 风格1：现代简洁风格 - 注重高级感和专业性，适合多数知识类博客
   - 风格2：创意表达风格 - 更具动感和创意，突出"分享"和"传播"的概念
   - 风格3：知识舞台风格 - 将书籍置于"舞台"中央，营造出庄重、经典的讲座或发布会氛围

2. 每个提示词必须满足以下要求：
   - 结合书籍实物和话筒元素
   - 直接点明"书籍讲解"的主题
   - 图片中只出现书籍名称"${titleText}"和作者名称"${authorText}"的中英文文案
   - 不出现其他任何文字（如"书籍讲解"、"Book Review"等描述性文字）
   - 9:16竖屏比例
   - 高质量、专业设计

3. 提示词应该用英文编写，适合用于AI图片生成

请以JSON格式返回，格式如下：
{
  "style1": "提示词1（现代简洁风格）",
  "style2": "提示词2（创意表达风格）",
  "style3": "提示词3（知识舞台风格）"
}`;

    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: deepseekPrompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('❌ Deepseek API返回错误:', deepseekResponse.status, errorText);
      throw new Error(`Deepseek API错误: ${deepseekResponse.status} - ${errorText}`);
    }

    const deepseekData = await deepseekResponse.json();
    const deepseekContent = deepseekData.choices[0]?.message?.content || '';
    console.log('📥 Deepseek API原始响应:', deepseekContent);

    // 解析JSON响应
    let prompts = null;
    try {
      const jsonMatch = deepseekContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('❌ 解析Deepseek响应失败:', parseError);
    }

    // 如果解析失败，生成默认提示词
    if (!prompts || !prompts.style1 || !prompts.style2 || !prompts.style3) {
      console.warn('⚠️ Deepseek返回的提示词格式不正确，使用默认提示词');
      const basePrompt = `A book cover design, 9:16 vertical ratio, high quality, professional design. The cover combines a physical book and a microphone element, directly indicating the theme of "book explanation". The cover must ONLY display the book title "${titleText}" and author name "${authorText}". Absolutely no other Chinese or English text, no descriptions, no subtitles, no additional information should appear on the cover.`;
      
      prompts = {
        style1: `${basePrompt} Modern minimalist style, elegant design, clean layout, professional and sophisticated, suitable for knowledge blogs.`,
        style2: `${basePrompt} Creative expression style, dynamic and creative, highlighting the concept of "sharing" and "spreading", vibrant colors, engaging composition.`,
        style3: `${basePrompt} Knowledge stage style, the book is placed in the center of a "stage", creating a solemn and classic lecture or press conference atmosphere, dramatic lighting, formal setting.`
      };
    }

    console.log('✅ 成功生成3种风格的提示词');
    console.log('   风格1（现代简洁）:', prompts.style1);
    console.log('   风格2（创意表达）:', prompts.style2);
    console.log('   风格3（知识舞台）:', prompts.style3);

    res.json({
      success: true,
      data: {
        prompts: prompts,
        bookTitle: titleText,
        bookAuthor: authorText
      }
    });

  } catch (error) {
    console.error('生成博客封面图提示词失败:', error);
    res.status(500).json({
      success: false,
      message: '生成博客封面图提示词失败',
      error: error.message || String(error)
    });
  }
});

router.post('/:bookId/generate-blog-cover', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { customPrompt } = req.body; // 支持自定义提示词
    
    // 获取书籍信息
    const book = await new AV.Query('Book').get(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: '书籍不存在'
      });
    }
    
    const title = book.get('title');
    const author = book.get('author');
    const titleEn = book.get('titleEn') || '';
    const authorEn = book.get('authorEn') || '';
    
    if (!title || !author) {
      return res.status(400).json({
        success: false,
        message: '书籍标题或作者信息缺失'
      });
    }
    
    console.log('🎨 开始生成博客封面图，书名:', title, '作者:', author);
    if (titleEn) console.log('   英文书名:', titleEn);
    if (authorEn) console.log('   英文作者:', authorEn);
    
    // 构建提示词：只显示书名和作者名称，不显示其他任何文字
    // 如果有英文版本，同时显示中英文
    let titleText = title;
    let authorText = author;
    
    if (titleEn && titleEn.trim()) {
      titleText = `${title} / ${titleEn}`;
    }
    if (authorEn && authorEn.trim()) {
      authorText = `${author} / ${authorEn}`;
    }
    
    // 如果提供了自定义提示词，使用自定义提示词；否则使用默认提示词
    let prompt;
    if (customPrompt && customPrompt.trim()) {
      prompt = customPrompt;
      console.log('📝 使用自定义提示词:', prompt);
    } else {
      // 使用中英文混合提示词，明确要求只显示书名和作者，不显示其他文字
      // 使用negative prompt明确禁止其他文字
      prompt = `A minimalist book cover design, 9:16 vertical ratio, high quality, professional design. The cover must ONLY display the book title "${titleText}" and author name "${authorText}". Absolutely no other Chinese or English text, no descriptions, no subtitles, no additional information, no quotes, no taglines, no promotional text should appear on the cover. Book style, elegant design, clean layout, minimalist style, only title and author name visible. Negative prompt: no text except title and author, no descriptions, no subtitles, no quotes, no taglines, no promotional text, no additional information`;
      console.log('📝 使用默认提示词:', prompt);
    }
    
    // 调用Doubao图片生成API（增加超时时间到60秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
    
    let imageGenResponse;
    try {
      imageGenResponse = await fetch(DOUBAO_IMAGE_GEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DOUBAO_API_KEY}`
        },
        body: JSON.stringify({
          model: DOUBAO_IMAGE_MODEL_ID,
          prompt: prompt,
          sequential_image_generation: 'disabled',
          response_format: 'url',
          size: '2K', // 2K分辨率
          stream: false,
          watermark: true
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('❌ Doubao图片生成API请求超时（60秒）');
        throw new Error('图片生成请求超时，请稍后重试');
      }
      if (error.cause && error.cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
        console.error('❌ Doubao图片生成API连接超时:', error.message);
        throw new Error('无法连接到图片生成服务，请检查网络连接或稍后重试');
      }
      console.error('❌ Doubao图片生成API请求失败:', error.message);
      throw error;
    }
    
    if (!imageGenResponse.ok) {
      const errorText = await imageGenResponse.text();
      console.error('❌ Doubao图片生成API失败:', imageGenResponse.status, errorText);
      throw new Error(`Doubao图片生成API失败: ${imageGenResponse.status} ${imageGenResponse.statusText} - ${errorText}`);
    }
    
    const imageGenData = await imageGenResponse.json();
    console.log('✅ Doubao图片生成API响应:', JSON.stringify(imageGenData, null, 2));
    
    // 检查响应格式
    if (!imageGenData.data || !Array.isArray(imageGenData.data) || imageGenData.data.length === 0) {
      console.error('❌ Doubao图片生成响应格式错误:', JSON.stringify(imageGenData, null, 2));
      throw new Error('Doubao图片生成响应格式错误，未找到图片URL');
    }
    
    const imageUrl = imageGenData.data[0].url;
    if (!imageUrl) {
      console.error('❌ Doubao图片生成响应格式错误，未找到URL字段:', JSON.stringify(imageGenData, null, 2));
      throw new Error('Doubao图片生成响应格式错误，未找到图片URL');
    }
    
    console.log('✅ 图片生成成功，URL:', imageUrl);
    
    // 下载图片并上传到LeanCloud（增加超时时间到30秒）
    const downloadController = new AbortController();
    const downloadTimeoutId = setTimeout(() => downloadController.abort(), 30000); // 30秒超时
    
    let imageResponse;
    try {
      imageResponse = await fetch(imageUrl, {
        signal: downloadController.signal
      });
      clearTimeout(downloadTimeoutId);
    } catch (error) {
      clearTimeout(downloadTimeoutId);
      if (error.name === 'AbortError') {
        console.error('❌ 下载图片超时（30秒）');
        throw new Error('下载生成的图片超时，请稍后重试');
      }
      console.error('❌ 下载图片失败:', error.message);
      throw new Error(`下载生成的图片失败: ${error.message}`);
    }
    
    if (!imageResponse.ok) {
      throw new Error(`下载生成的图片失败: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const imageFile = new AV.File(`blog_cover_${bookId}_${Date.now()}.jpg`, imageBuffer, 'image/jpeg');
    const uploadedFile = await imageFile.save();
    
    const finalImageUrl = uploadedFile.url();
    console.log('✅ 图片上传到LeanCloud成功，URL:', finalImageUrl);
    
    // 保存到书籍对象
    book.set('blogCoverUrl', finalImageUrl);
    await book.save();
    
    res.json({
      success: true,
      data: {
        blogCoverUrl: finalImageUrl,
        imageUrl: finalImageUrl
      }
    });
    
  } catch (error) {
    console.error('生成博客封面图失败:', error);
    res.status(500).json({
      success: false,
      message: '生成博客封面图失败',
      error: error.message || String(error)
    });
  }
});

// 使用Deepseek拆解书籍内容
router.post('/:bookId/extract', async (req, res) => {
  // 立即设置CORS头
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // 检测前端是否支持SSE（通过Accept头或useSSE参数）
  const acceptHeader = req.headers.accept || '';
  const useSSE = req.query.useSSE === 'true' || req.body.useSSE === true || acceptHeader.includes('text/event-stream');
  
  let sendProgress, cleanup, heartbeatInterval;
  
  if (useSSE) {
    // 设置流式响应头（Server-Sent Events），用于保持连接活跃并发送进度更新
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');
    res.header('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
    
    // 发送进度更新的辅助函数
    sendProgress = (message, progress = null) => {
      try {
        const data = JSON.stringify({ message, progress, timestamp: Date.now() });
        res.write(`data: ${data}\n\n`);
        console.log(`📊 进度更新: ${message}${progress !== null ? ` (${progress}%)` : ''}`);
      } catch (err) {
        console.error('❌ 发送进度更新失败:', err);
      }
    };
    
    // 发送心跳以保持连接活跃（每30秒发送一次）
    heartbeatInterval = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
    
    // 清理函数
    cleanup = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  } else {
    // 兼容模式：使用JSON响应，但仍然发送进度更新（通过日志）
    res.header('Content-Type', 'application/json');
    sendProgress = (message, progress = null) => {
      console.log(`📊 进度更新: ${message}${progress !== null ? ` (${progress}%)` : ''}`);
    };
    cleanup = () => {};
    console.log('⚠️ 前端不支持SSE，使用JSON响应模式（兼容模式）');
  }
  
  try {
    const { bookId } = req.params;
    const { segments = 10 } = req.body; // 默认10段

    if (![5, 10, 20, 30].includes(segments)) {
      cleanup();
      if (useSSE) {
        const errorData = JSON.stringify({ success: false, message: '分段数量必须是5、10、20或30', completed: true });
        res.write(`data: ${errorData}\n\n`);
        res.end();
      } else {
        res.status(400).json({ success: false, message: '分段数量必须是5、10、20或30' });
      }
      return;
    }
    
    sendProgress('开始处理书籍提取请求', 0);

    // 获取书籍信息
    const book = await new AV.Query('Book').get(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: '书籍不存在'
      });
    }

    // 检查是否有附件文件
    const fileUrl = book.get('fileUrl');
    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: '书籍没有上传附件文件，无法拆解内容'
      });
    }

    // 更新书籍状态为提取中
    book.set('status', '提取中');
    await book.save();

    // 从附件文件提取文本内容
    console.log('📖 开始从附件文件提取文本内容...');
    sendProgress('正在提取文件文本内容', 10);
    let bookContent;
    try {
      bookContent = await extractTextFromFile(fileUrl);
      console.log('✅ 文本内容提取成功，长度:', bookContent.length);
      sendProgress('文本内容提取完成', 20);
    } catch (error) {
      cleanup();
      console.error('❌ 提取文件内容失败:', error);
      book.set('status', '待处理');
      await book.save();
      const errorData = JSON.stringify({ success: false, message: `提取文件内容失败: ${error.message}`, completed: true });
      res.write(`data: ${errorData}\n\n`);
      res.end();
      return;
    }

    // 调用Deepseek API拆解书籍（基于文件内容）
    // 获取解读主线角度（如果有的话，否则使用默认值）
    const mainTheme = req.body.mainTheme || `探讨其理论在AI时代的演变与对个人成长的启示`;
    
    const prompt = `请扮演一位资深书籍作者、商业分析师及播客主理人，你擅长将经典理论置于当下语境中进行深度解构与重建。现在，你要为一本重要的书籍创作一个具有持久影响力的深度解读系列。

一、核心指令：
1. 目标书籍：《${book.get('title')}》
2. 系列构成：${segments}集系列解读文稿
3. 核心要求：每集内容需达到 1000字左右的实质性分析，提供远超书籍摘要的增值洞察并且整个系列需围绕一个核心命题展开：${mainTheme}。

二：分集详细创作（请对每一集进行充分展开）
对于每一集，请按以下框架撰写：

Episode [序号]：[一个具有吸引力和概括性的标题]

1. 核心命题（一句话）：明确本集要解决和阐述的核心问题/观点。

2. 开头段落（约150-200字）：以一个强烈的"认知钩子"（如一个颠覆性问题、一个普遍误区、一个震撼的书中金句）开篇。简要承接上文（如果是第二集及以后），并点明本集内容的独特价值和重要性。语言需具有对话感和引导性。

3. 主体内容（约800-850字，必须达到深度分析要求）：这是核心部分，需详细展开，确保内容充实。必须包含：
* 核心概念深度阐释：对书中关键概念进行剥茧抽丝式的解读，阐明其真正含义及常见误解。
* 延伸分析与时代结合：结合本书出版后的商业案例、当前行业趋势或普遍面临的问题，论证这些概念的当下适用性。这是体现你分析深度的关键。
* 对听众/读者的直接启示：将宏观理论落到微观行动，给出具体的思考方向、自检问题或行动步骤建议。

4. 本集小结与下集预告（约50字）：
* 用一两句话凝练本集核心收获。
* 自然地引出下一集的主题，设置悬念。

三、整体风格与格式规范：
语言：精准、清晰、富有逻辑力量，同时具备向听众娓娓道来的对话感。避免空洞的形容词堆砌。
立场：作为真诚的"解读桥梁"与"思考催化剂"，而非居高临下的布道者。

书籍内容：
${bookContent}

请将以上内容拆解为${segments}集深度解读文稿。每集需要包含：

1. chapterTitle (Chinese) - 本集标题（中文），具有吸引力和概括性
2. chapterTitleEn (English) - Episode Title (English) - REQUIRED
3. summary (Chinese, 约200字) - 本集的核心内容总结，包含核心命题、主要观点和关键启示。要具体、有价值，避免概括性表述。直接阐述核心思想和洞察，不要使用"本书认为"、"作者指出"等表述。
4. summaryEn (English, 约200-300字) - Summary (English) - 完整翻译中文summary，保持所有细节 - REQUIRED
5. avatarDescription (description of gender, age, profession, style) - 数字人形象描述
6. estimatedDuration (seconds) - 预计视频时长（秒）

IMPORTANT: 
- You MUST provide English translations (chapterTitleEn, summaryEn) for ALL segments. Do not skip any English fields.
- The summary should reflect the depth and analytical rigor described in the framework above.
- Extract ESSENCE and CORE IDEAS, NOT general summaries or overviews.
- Be SPECIFIC and CONCRETE. Avoid vague statements.
- Focus on ACTIONABLE insights, principles, methods, or valuable concepts.

Return in JSON format:
{
  "segments": [
    {
      "chapterTitle": "Episode标题（具有吸引力和概括性）",
      "chapterTitleEn": "Episode Title",
      "summary": "核心内容总结（约200字，包含核心命题、主要观点和关键启示，具体、有价值）",
      "summaryEn": "Summary (complete English translation, maintaining all details from Chinese summary, approximately 200-300 words)",
      "avatarDescription": "形象描述",
      "estimatedDuration": 180
    }
  ]
}`;

    console.log('📞 调用Deepseek API，书籍:', book.get('title'), '分段数:', segments);
    console.log('📞 使用附件文件内容拆解，文件URL:', fileUrl);
    console.log('📞 文本内容长度:', bookContent.length, '字符');
    console.log('📞 Deepseek API URL:', DEEPSEEK_API_URL);
    console.log('📞 Deepseek API Key前4位:', DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.substring(0, 4) : '未设置');
    
    sendProgress('正在调用Deepseek API分析书籍内容', 30);
    let deepseekResponse;
    try {
      deepseekResponse = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 8000  // 增加token限制以处理更长的内容
        })
      });
    } catch (fetchError) {
      console.error('❌ Deepseek API请求失败:', fetchError);
      console.error('❌ 错误详情:', fetchError.message, fetchError.stack);
      throw new Error(`无法连接到Deepseek API: ${fetchError.message}`);
    }

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text().catch(() => '无法读取错误响应');
      console.error('❌ Deepseek API返回错误:', deepseekResponse.status, deepseekResponse.statusText);
      console.error('❌ 错误响应内容:', errorText);
      throw new Error(`Deepseek API错误 (${deepseekResponse.status}): ${deepseekResponse.statusText}. ${errorText.substring(0, 200)}`);
    }

    const deepseekData = await deepseekResponse.json();
    const content = deepseekData.choices[0].message.content;
    
    console.log('📥 Deepseek API原始响应（前500字符）:', content.substring(0, 500) + '...');
    sendProgress('Deepseek API分析完成，正在解析结果', 50);

    // 解析JSON响应（可能包含markdown代码块）
    let segmentsData;
    try {
      // 尝试提取JSON部分
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        segmentsData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        segmentsData = JSON.parse(content);
      }
      
      console.log('✅ 解析成功，段数:', segmentsData.segments?.length || 0);
      // 检查第一段是否包含英文字段
      if (segmentsData.segments && segmentsData.segments.length > 0) {
        const firstSegment = segmentsData.segments[0];
        console.log('📊 第一段字段检查:');
        console.log(`   chapterTitleEn: ${firstSegment.chapterTitleEn ? '✓ 存在' : '✗ 缺失'}`);
        console.log(`   summaryEn: ${firstSegment.summaryEn ? '✓ 存在' : '✗ 缺失'}`);
        if (firstSegment.chapterTitleEn) {
          console.log(`   英文标题示例: ${firstSegment.chapterTitleEn.substring(0, 50)}`);
        }
        if (firstSegment.summaryEn) {
          console.log(`   英文摘要示例: ${firstSegment.summaryEn.substring(0, 50)}`);
        }
      }
    } catch (parseError) {
      console.error('❌ 解析Deepseek响应失败:', parseError);
      console.error('❌ 响应内容:', content);
      throw new Error('无法解析AI返回的内容');
    }

    // 保存提取的内容到数据库
    sendProgress('正在保存提取的内容到数据库', 60);
    const ExtractedContentClass = AV.Object.extend('ExtractedContent');
    const savedSegments = [];
    const totalSegments = segmentsData.segments?.length || 0;

    for (let i = 0; i < (segmentsData.segments || []).length; i++) {
      const segment = segmentsData.segments[i];
      const segmentProgress = 60 + Math.floor((i / totalSegments) * 30);
      sendProgress(`正在保存第 ${i + 1}/${totalSegments} 段内容`, segmentProgress);
      // 处理summary（中文），确保严格200字，提取核心思想和精华
      let summary = segment.summary || '';
      
      // 如果有单独的关键要点，合并到摘要中（兼容旧数据）
      if (segment.keyPoints && Array.isArray(segment.keyPoints) && segment.keyPoints.length > 0) {
        const keyPointsText = segment.keyPoints.join('；');
        // 将关键要点自然地添加到摘要末尾
        if (summary.trim()) {
          summary = summary.trim() + '。主要要点包括：' + keyPointsText + '。';
        } else {
          summary = '主要要点包括：' + keyPointsText + '。';
        }
      }
      
      // 去掉常见的冗余表述和概括性内容
      summary = summary.replace(/本书提出的核心问题是[：:]\s*/g, '');
      summary = summary.replace(/本书认为[，,。]\s*/g, '');
      summary = summary.replace(/作者指出[，,。]\s*/g, '');
      summary = summary.replace(/作者认为[，,。]\s*/g, '');
      summary = summary.replace(/本书[，,。]\s*/g, '');
      summary = summary.replace(/作者[，,。]\s*/g, '');
      summary = summary.replace(/本书介绍了[，,。]\s*/g, '');
      summary = summary.replace(/本书阐述了[，,。]\s*/g, '');
      summary = summary.replace(/本书讲述了[，,。]\s*/g, '');
      summary = summary.replace(/本书说明了[，,。]\s*/g, '');
      summary = summary.replace(/本书分析了[，,。]\s*/g, '');
      summary = summary.replace(/本书讨论了[，,。]\s*/g, '');
      summary = summary.replace(/^[，,。]\s*/g, ''); // 去掉开头的标点
      
      summary = summary.trim();
      
      // 不再强制限制summary长度，允许显示完整内容
      // 根据新的prompt要求，summary是"约200字"，可以更长以包含完整信息
      
      // 处理summaryEn（英文），将关键要点合并到摘要中
      let summaryEn = segment.summaryEn || '';
      summaryEn = summaryEn.trim();
      
      // 如果有单独的关键要点英文版，合并到摘要中
      if (segment.keyPointsEn && Array.isArray(segment.keyPointsEn) && segment.keyPointsEn.length > 0) {
        const keyPointsEnText = segment.keyPointsEn.join('; ');
        // 将关键要点自然地添加到摘要末尾
        if (summaryEn.trim()) {
          summaryEn = summaryEn.trim() + ' Key points include: ' + keyPointsEnText + '.';
        } else {
          summaryEn = 'Key points include: ' + keyPointsEnText + '.';
        }
      }
      
      // 如果AI没有生成英文版本，使用翻译功能
      let chapterTitleEn = segment.chapterTitleEn;
      let summaryEnFinal = summaryEn;
      
      // 检查是否需要翻译：如果英文字段为空或不存在，则翻译
      const needsTitleTranslation = !chapterTitleEn || chapterTitleEn.trim() === '';
      const needsSummaryTranslation = !summaryEnFinal || summaryEnFinal.trim() === '';
      
      // 如果缺少英文标题，翻译中文标题
      if (needsTitleTranslation && segment.chapterTitle) {
        console.log(`🌐 [翻译] 章节标题: ${segment.chapterTitle}`);
        try {
          const translateTitleResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'user',
                  content: `请将以下中文章节标题翻译成英文，只返回英文翻译，不要添加任何其他内容：\n${segment.chapterTitle}`
                }
              ],
              temperature: 0.3,
              max_tokens: 100
            })
          });
          
          if (translateTitleResponse.ok) {
            const translateTitleData = await translateTitleResponse.json();
            chapterTitleEn = translateTitleData.choices[0]?.message?.content?.trim() || '';
            if (chapterTitleEn) {
              console.log(`✅ [翻译完成] 标题: ${chapterTitleEn}`);
            } else {
              console.warn(`⚠️ [翻译警告] 标题翻译返回为空`);
              chapterTitleEn = segment.chapterTitle || 'Untitled Chapter';
            }
          } else {
            const errorText = await translateTitleResponse.text();
            console.error(`❌ [翻译失败] 标题翻译API返回错误: ${translateTitleResponse.status} - ${errorText}`);
            chapterTitleEn = segment.chapterTitle || 'Untitled Chapter';
          }
        } catch (translateError) {
          console.error('❌ [翻译异常] 标题翻译失败:', translateError.message);
          chapterTitleEn = segment.chapterTitle || 'Untitled Chapter';
        }
      }
      
      // 如果缺少英文摘要，翻译中文摘要
      if (needsSummaryTranslation && summary && summary.trim()) {
        console.log(`🌐 [翻译] 摘要: ${summary.substring(0, 50)}...`);
        try {
          const translateSummaryResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'user',
                  content: `请将以下中文内容摘要完整翻译成英文，保持所有细节，不要限制字数，只返回英文翻译，不要添加任何其他内容：\n${summary}`
                }
              ],
              temperature: 0.3,
              max_tokens: 1000
            })
          });
          
          if (translateSummaryResponse.ok) {
            const translateSummaryData = await translateSummaryResponse.json();
            summaryEnFinal = translateSummaryData.choices[0]?.message?.content?.trim() || '';
            if (summaryEnFinal) {
              // 保持完整，不限制字数
              console.log(`✅ [翻译完成] 摘要: ${summaryEnFinal.substring(0, 100)}... (总长度: ${summaryEnFinal.length}字符)`);
            } else {
              console.warn(`⚠️ [翻译警告] 摘要翻译返回为空`);
              summaryEnFinal = '';
            }
          } else {
            const errorText = await translateSummaryResponse.text();
            console.error(`❌ [翻译失败] 摘要翻译API返回错误: ${translateSummaryResponse.status} - ${errorText}`);
            summaryEnFinal = '';
          }
        } catch (translateError) {
          console.error('❌ [翻译异常] 摘要翻译失败:', translateError.message);
          summaryEnFinal = '';
        }
      }
      
      // 确保有默认值
      chapterTitleEn = chapterTitleEn || segment.chapterTitle || 'Untitled Chapter';
      summaryEnFinal = summaryEnFinal || summary || '';
      
      console.log(`📝 保存内容段 ${savedSegments.length + 1}:`);
      console.log(`   中文标题: ${segment.chapterTitle || '未命名章节'}`);
      console.log(`   英文标题: ${chapterTitleEn}`);
      console.log(`   中文摘要长度: ${summary.length}`);
      console.log(`   英文摘要长度: ${summaryEnFinal.length}`);
      
      const extractedContent = new ExtractedContentClass();
      extractedContent.set('book', book);
      extractedContent.set('chapterTitle', segment.chapterTitle || '未命名章节');
      extractedContent.set('chapterTitleEn', chapterTitleEn);
      extractedContent.set('summary', summary);
      extractedContent.set('summaryEn', summaryEnFinal);
      extractedContent.set('avatarDescription', segment.avatarDescription || '');
      extractedContent.set('estimatedDuration', segment.estimatedDuration || 180);
      extractedContent.set('videoStatus', 'pending');
      extractedContent.set('segmentIndex', savedSegments.length + 1);

      await extractedContent.save();
      savedSegments.push({
        id: extractedContent.id,
        chapterTitle: extractedContent.get('chapterTitle'),
        chapterTitleEn: extractedContent.get('chapterTitleEn'),
        summary: extractedContent.get('summary'),
        summaryEn: extractedContent.get('summaryEn'),
        avatarDescription: extractedContent.get('avatarDescription'),
        estimatedDuration: extractedContent.get('estimatedDuration'),
        videoStatus: extractedContent.get('videoStatus')
      });
    }

    // 更新书籍状态为已完成
    book.set('status', '已完成');
    await book.save();

    // 发送完成消息
    cleanup();
    sendProgress('书籍提取完成', 100);
    const responseData = {
      success: true,
      data: {
        bookId: book.id,
        segments: savedSegments
      }
    };
    
    if (useSSE) {
      // SSE格式响应
      responseData.completed = true;
      const finalData = JSON.stringify(responseData);
      res.write(`data: ${finalData}\n\n`);
      res.end();
    } else {
      // JSON格式响应（兼容模式）
      res.json(responseData);
    }
  } catch (error) {
    cleanup();
    console.error('❌ 拆解书籍失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    console.error('❌ 错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('❌ BookId:', req.params.bookId);
    
    // 更新书籍状态为待处理（失败时）
    try {
      const book = await new AV.Query('Book').get(req.params.bookId);
      if (book) {
        book.set('status', '待处理');
        await book.save();
      }
    } catch (updateError) {
      console.error('❌ 更新书籍状态失败:', updateError);
    }

    // 发送错误消息（SSE格式）
    let errorMessage = '拆解书籍失败';
    let errorSuggestion = '';
    
    // 检查是否是网络错误
    if (error.message && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT'))) {
      errorMessage = '无法连接到Deepseek API，请检查网络连接或API配置';
      errorSuggestion = '请检查DEEPSEEK_API_KEY是否正确配置';
    } else if (error.message && error.message.includes('Deepseek API')) {
      errorMessage = 'Deepseek API调用失败';
      errorSuggestion = '请检查DEEPSEEK_API_KEY是否正确，或查看Deepseek API服务状态';
    } else if (error.message && (error.message.includes('JSON') || error.message.includes('解析'))) {
      errorMessage = '无法解析AI返回的内容';
      errorSuggestion = 'AI返回的内容格式不正确，请重试';
    }

      const errorResponse = {
        success: false,
        message: errorMessage,
        error: error.message || String(error),
        suggestion: errorSuggestion
      };
      
      // 在开发环境下返回更多调试信息
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        errorResponse.stack = error.stack;
        errorResponse.details = JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      if (useSSE) {
        // SSE格式响应
        errorResponse.completed = true;
        const errorData = JSON.stringify(errorResponse);
        res.write(`data: ${errorData}\n\n`);
        res.end();
      } else {
        // JSON格式响应（兼容模式）
        res.status(500).json(errorResponse);
      }
  }
});

// 使用腾讯云长语音合成将文字转换为语音
router.post('/content/:contentId/generate-audio', async (req, res) => {
  // 立即设置CORS头，确保长时间运行的请求也能正确返回CORS响应
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // 设置响应超时时间（15分钟），因为音频生成需要轮询查询任务状态
  req.setTimeout(15 * 60 * 1000);
  res.setTimeout(15 * 60 * 1000);
  
  console.log('🚀 ========== 生成音频API被调用 ==========');
  console.log('🌐 Origin:', origin);
  console.log('📥 请求参数:', JSON.stringify(req.params, null, 2));
  console.log('📥 请求体:', JSON.stringify(req.body, null, 2));
  console.log('📥 Content-Type:', req.headers['content-type']);
  
  try {
    const { contentId } = req.params;
    const { text, language = 'zh' } = req.body; // language: 'zh' 或 'en'
    
    // 根据language参数判断是否是英文
    const isEnglish = language === 'en';
    
    console.log('📋 解析后的参数:');
    console.log('   contentId:', contentId);
    console.log('   text:', text ? `${text.substring(0, 50)}...` : 'undefined');
    console.log('   language:', language, `(type: ${typeof language})`);
    console.log('   isEnglish:', isEnglish);

    if (!text) {
      console.log('❌ 缺少文本内容');
      return res.status(400).json({
        success: false,
        message: '缺少文本内容'
      });
    }

    // 获取内容对象
    const contentObj = await new AV.Query('ExtractedContent').get(contentId);
    if (!contentObj) {
      return res.status(404).json({
        success: false,
        message: '内容不存在'
      });
    }

    // 获取书籍信息和集数信息，用于生成开场白
    const book = contentObj.get('book');
    const bookTitle = book ? (await book.fetch()).get('title') : '';
    const segmentIndex = contentObj.get('segmentIndex') || 0;
    
    // 查询同一本书的所有内容段，获取总集数
    let totalSegments = 0;
    if (book) {
      const allSegments = await new AV.Query('ExtractedContent')
        .equalTo('book', book)
        .ascending('segmentIndex')
        .find();
      totalSegments = allSegments.length;
    }
    
    // 根据集数生成开场白
    let openingText = '';
    if (isEnglish) {
      // 英文开场白
      if (segmentIndex === 1 || totalSegments === 0) {
        // 第一集
        openingText = bookTitle 
          ? `Hello, welcome to our book blog. Today we're starting with a book called "${bookTitle}". `
          : `Hello, welcome to our book blog. Today we're starting with a new book. `;
      } else if (segmentIndex === totalSegments && totalSegments > 0) {
        // 最后一集
        openingText = bookTitle
          ? `Hello, this is the final episode of the "${bookTitle}" breakdown series. `
          : `Hello, this is the final episode of our book breakdown series. `;
      } else {
        // 中间集 - 随机选择一种开场白
        const middleOpenings = [
          `Welcome back. In the previous episode, we discussed `,
          `Hello, this is the book blog. `,
          `Welcome back to our book blog. `
        ];
        openingText = middleOpenings[segmentIndex % middleOpenings.length];
      }
    } else {
      // 中文开场白
      if (segmentIndex === 1 || totalSegments === 0) {
        // 第一集
        openingText = bookTitle 
          ? `你好，欢迎来到我们的书籍博客。今天我们要开启的，是一本名为《${bookTitle}》的书籍。`
          : `你好，欢迎来到我们的书籍博客。今天我们要开启的，是一本重要的书籍。`;
      } else if (segmentIndex === totalSegments && totalSegments > 0) {
        // 最后一集
        openingText = bookTitle
          ? `你好，这是《${bookTitle}》拆解系列的最后一集。`
          : `你好，这是本书拆解系列的最后一集。`;
      } else {
        // 中间集 - 随机选择一种开场白
        const middleOpenings = [
          `欢迎回来。上一集我们探讨了`,
          `你好，这里是书籍博客。`,
          `欢迎再次收听。`
        ];
        openingText = middleOpenings[segmentIndex % middleOpenings.length];
      }
    }
    
    // 在文本前添加开场白
    const finalText = openingText ? `${openingText}${text}` : text;
    console.log(`📝 添加开场白，集数: ${segmentIndex}/${totalSegments}, 语言: ${language}`);
    console.log(`📝 开场白: ${openingText}`);
    console.log(`📝 最终文本长度: ${finalText.length} 字符`);

    // 统一使用腾讯云长文本语音合成（精品模型-大模型音色）
    
    // 统一使用腾讯云TTS长文本语音合成（精品模型-大模型音色）
    // 不再区分语言，都使用CreateTtsTask API
    // 已完全移除豆包TTS代码，只使用腾讯云TTS
    
    // 统一使用腾讯云长文本语音合成（精品模型-大模型音色）
    // 中文和英文都使用腾讯云TTS的CreateTtsTask API，ModelType: 1（精品模型-大模型音色）
    console.log('🔵 ========== 使用腾讯云长文本语音合成（精品模型-大模型音色） ==========');
    console.log('🔵 语言:', language);

    // 统一使用腾讯云长文本语音合成（精品模型-大模型音色）
    console.log('🎵 调用腾讯云长文本语音合成API（精品模型-大模型音色），文本长度:', finalText.length, '语言:', language);
    
    // 根据语言选择音色类型
    // 中文音色：601001（长文本语音合成专用音色）
    // 英文音色：501008（长文本语音合成专用音色）
    const voiceType = isEnglish ? 501008 : 601001; // 英文使用501008，中文使用601001（长文本语音合成专用音色）
    console.log(`🎤 选择音色类型: ${voiceType} (${isEnglish ? '英文-长文本语音合成专用音色' : '中文-长文本语音合成专用音色'})`);
    console.log(`📝 生成${isEnglish ? '英文' : '中文'}音频，文本长度: ${finalText.length}，内容预览: ${finalText.substring(0, 100)}...`);
    
    // 统一使用长文本API（CreateTtsTask），使用精品模型（大模型音色）
    let responseData;
    
    // 强制使用长文本API（CreateTtsTask），使用精品模型（大模型音色）
    const useLongTextAPI = true; // 强制使用CreateTtsTask API（长文本语音合成-精品模型-大模型音色）
    
    if (useLongTextAPI) {
      console.log('📝 使用长文本语音合成API（CreateTtsTask）-精品模型（大模型音色）');
      
      // 使用精品模型（ModelType: 1）- 大模型音色
      const modelType = 1; // 使用精品模型（大模型音色）
      // 按照腾讯云API文档格式设置参数
      const longTextParams = {
        Text: finalText,
        ProjectId: 0, // 项目ID，0表示默认项目（如果资源包绑定到特定项目，请修改为对应的ProjectId）
        ModelType: modelType, // 模型类型：1-精品模型（大模型音色）
        Volume: 0, // 音量：范围[-10, 10]，0为正常音量
        Codec: 'mp3', // 音频格式：mp3、pcm
        VoiceType: voiceType, // 根据语言选择音色类型：中文601001，英文501008
        SampleRate: 16000, // 采样率：16000或8000
        PrimaryLanguage: isEnglish ? 2 : 1, // 主语言：1-中文，2-英文
        Speed: 0 // 语速：范围[-2, 2]，0为正常语速
      };
      console.log('📋 CreateTtsTask 请求参数:', JSON.stringify(longTextParams, null, 2));
      console.log(`🔧 使用模型类型: ${modelType} (精品模型-大模型音色，支持长文本语音合成)`);
      
      // 创建长文本语音合成任务
      responseData = await tencentTtsClient.CreateTtsTask(longTextParams);
      console.log('✅ 腾讯云长文本API响应:', JSON.stringify(responseData, null, 2));
      
      // 检查错误
      if (responseData.Error) {
        const error = responseData.Error;
        console.error('❌ 腾讯云API错误:', JSON.stringify(error, null, 2));
        console.error('❌ 错误代码:', error.Code);
        console.error('❌ 错误消息:', error.Message);
        console.error('❌ 请求参数:', JSON.stringify(longTextParams, null, 2));
        
        // 特殊处理资源包配额用完错误
        const isResourcePackError = error.Code === 'UnsupportedOperation.PkgExhausted' || 
                                    error.Code === 'ResourceInsufficient' ||
                                    (error.Message && (
                                      error.Message.includes('资源包') || 
                                      error.Message.includes('resource pack') ||
                                      error.Message.includes('配额') ||
                                      error.Message.includes('quota') ||
                                      error.Message.includes('exhausted') ||
                                      error.Message.includes('allowance')
                                    ));
        
        if (isResourcePackError) {
          console.log(`⚠️ 检测到资源包相关错误，当前已使用精品模型（大模型音色）（ModelType: ${modelType}）`);
          console.log(`⚠️ 原始错误代码: ${error.Code}, 错误消息: ${error.Message}`);
          console.log(`⚠️ 完整错误对象:`, JSON.stringify(error, null, 2));
          console.log(`⚠️ 请求参数:`, JSON.stringify(longTextParams, null, 2));
          console.log(`⚠️ 文本长度: ${text.length} 字符`);
          console.log(`⚠️ ProjectId: ${longTextParams.ProjectId} (0表示默认项目)`);
          console.log(`⚠️ VoiceType: ${longTextParams.VoiceType} (${isEnglish ? '英文' : '中文'})`);
          console.log(`⚠️ PrimaryLanguage: ${longTextParams.PrimaryLanguage} (${isEnglish ? '英文' : '中文'})`);
          
          // 提供更详细的诊断信息
          const diagnosticInfo = {
            currentModelType: modelType,
            projectId: longTextParams.ProjectId,
            voiceType: longTextParams.VoiceType,
            primaryLanguage: longTextParams.PrimaryLanguage,
            language: language,
            textLength: text.length,
            errorCode: error.Code,
            errorMessage: error.Message
          };
          
          return res.status(402).json({
            success: false,
            message: '腾讯云资源包配额已用完或资源包类型不匹配',
            error: error.Message || '资源包配额已用完',
            code: error.Code,
            originalError: error,
            diagnosticInfo: diagnosticInfo,
            troubleshooting: {
              step1: '检查资源包类型：确保购买的是"长文本语音合成-精品模型-预付费包"（ModelType: 1）',
              step2: '检查ProjectId：当前使用 ProjectId: 0（默认项目），如果您的资源包绑定到特定项目，请修改代码中的 ProjectId',
              step3: '检查资源包状态：登录腾讯云控制台，查看资源包是否已生效（充值后可能需要等待几分钟）',
              step4: '检查资源包绑定：确保资源包已绑定到正确的项目（ProjectId: 0 表示默认项目）',
              step5: '检查资源包配额：确认资源包配额是否真的已用完（查看控制台中的使用量）'
            },
            suggestion: '请检查腾讯云控制台：\n1. 是否购买了"长文本语音合成-精品模型-预付费包"（ModelType: 1）\n2. 资源包是否已正确绑定到项目（当前使用 ProjectId: 0）\n3. 资源包是否已生效（充值后可能需要等待几分钟）\n4. 资源包配额是否真的已用完\n访问地址：https://console.cloud.tencent.com/tts'
          });
        }
        
        // 特殊处理VoiceType参数错误
        if (error.Message && error.Message.includes('VoiceType')) {
          console.error(`❌ VoiceType参数错误，当前值: ${voiceType}, 语言: ${language}, ModelType: ${modelType}`);
          console.error(`❌ 完整错误信息:`, JSON.stringify(error, null, 2));
          console.error(`❌ 请求参数:`, JSON.stringify(longTextParams, null, 2));
          return res.status(400).json({
            success: false,
            message: `VoiceType参数错误: ${error.Message}`,
            error: error.Message || JSON.stringify(error),
            code: error.Code,
            voiceType: voiceType,
            language: language,
            modelType: modelType,
            suggestion: '请检查VoiceType参数是否正确，英文音色可以尝试：1005（男声）、1006（女声）、1007（女声）'
          });
        }
        
        return res.status(500).json({
          success: false,
          message: `腾讯云API错误: ${error.Message || '未知错误'}`,
          error: error.Message || JSON.stringify(error),
          code: error.Code
        });
      }
      
      // 长文本API返回TaskId，需要轮询查询结果
      const taskId = responseData.Data?.TaskId;
      if (!taskId) {
        throw new Error('腾讯云API响应中未找到TaskId');
      }
      
      console.log('✅ 长文本语音合成任务已创建，TaskId:', taskId);
      
      // 轮询查询任务状态（最多等待60秒）
      let audioUrl = null;
      const maxAttempts = 30; // 最多查询30次
      const pollInterval = 2000; // 每2秒查询一次
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // 按照腾讯云API文档格式设置查询参数
        const queryParams = {
          TaskId: taskId
        };
        console.log(`📋 DescribeTtsTaskStatus 请求参数 (${attempt + 1}/${maxAttempts}):`, JSON.stringify(queryParams, null, 2));
        
        const queryResponse = await tencentTtsClient.DescribeTtsTaskStatus(queryParams);
        console.log(`📊 查询任务状态 (${attempt + 1}/${maxAttempts}):`, JSON.stringify(queryResponse, null, 2));
        
        if (queryResponse.Error) {
          throw new Error(`查询任务状态失败: ${queryResponse.Error.Message}`);
        }
        
        const status = queryResponse.Data?.Status;
        if (status === 2) { // 2表示任务完成
          audioUrl = queryResponse.Data?.ResultUrl;
          if (audioUrl) {
            console.log('✅ 任务完成，获取到音频URL:', audioUrl);
            break;
          }
        } else if (status === 3) { // 3表示任务失败
          throw new Error(`任务失败: ${queryResponse.Data?.ErrorMsg || '未知错误'}`);
        }
        // status === 0 表示任务处理中，继续轮询
      }
      
      if (!audioUrl) {
        throw new Error('任务超时，未能获取音频URL');
      }
      
      responseData = { Audio: audioUrl };
    }
    
    // 处理音频数据：CreateTtsTask API返回的是URL，需要下载
    let buffer;
    
      // CreateTtsTask API返回的是URL，需要下载
      let audioUrl = responseData.Audio;
      if (!audioUrl) {
        throw new Error('腾讯云API响应中未找到音频URL');
      }
      
      // 验证和修复URL格式
      if (typeof audioUrl !== 'string') {
        throw new Error(`音频URL格式错误: ${typeof audioUrl}`);
      }
      
      // 如果URL不是以http://或https://开头，尝试添加https://
      if (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
        // 如果URL以//开头，添加https:
        if (audioUrl.startsWith('//')) {
          audioUrl = 'https:' + audioUrl;
        } else {
          // 否则尝试添加https://
          audioUrl = 'https://' + audioUrl;
        }
      }
      
      // 验证URL格式
      try {
        new URL(audioUrl);
      } catch (urlError) {
        throw new Error(`音频URL格式无效: ${audioUrl}, 错误: ${urlError.message}`);
      }
      
      console.log('✅ 从响应中获取音频URL:', audioUrl);
      
      // 下载音频文件（添加超时和重试机制）
      let audioResponse;
      const maxDownloadRetries = 3;
      let downloadError;
      
      for (let retry = 0; retry < maxDownloadRetries; retry++) {
        try {
          if (retry > 0) {
            console.log(`🔄 重试下载音频文件 (${retry}/${maxDownloadRetries - 1})...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * retry));
          }
          
          // 每次重试都创建新的AbortController和超时
          const downloadController = new AbortController();
          const downloadTimeoutId = setTimeout(() => downloadController.abort(), 60000); // 60秒超时
          
          try {
            audioResponse = await fetch(audioUrl, {
              signal: downloadController.signal
            });
            clearTimeout(downloadTimeoutId);
          } catch (fetchError) {
            clearTimeout(downloadTimeoutId);
            throw fetchError;
          }
          
          if (!audioResponse.ok) {
            throw new Error(`下载音频文件失败: ${audioResponse.statusText}`);
          }
          
          const audioBlob = await audioResponse.blob();
          const arrayBuffer = await audioBlob.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          console.log('✅ 音频文件下载完成，Buffer长度:', buffer.length);
          break; // 成功则跳出循环
        } catch (error) {
          downloadError = error;
          
          if (error.name === 'AbortError') {
            console.error(`❌ 下载音频文件超时 (尝试 ${retry + 1}/${maxDownloadRetries})`);
            if (retry < maxDownloadRetries - 1) {
              continue;
            }
            throw new Error('下载音频文件超时（60秒）');
          }
          
          if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
            console.error(`❌ 下载音频文件连接重置 (尝试 ${retry + 1}/${maxDownloadRetries}):`, error.message);
            if (retry < maxDownloadRetries - 1) {
              continue;
            }
          }
          
          // 最后一次尝试失败，抛出错误
          if (retry === maxDownloadRetries - 1) {
            throw new Error(`下载音频文件失败（已重试${maxDownloadRetries}次）: ${error.message}`);
          }
        }
      }
      
      if (!buffer) {
        throw new Error(`下载音频文件失败（已重试${maxDownloadRetries}次）: ${downloadError?.message || '未知错误'}`);
      }
    
    // 将音频文件上传到LeanCloud（添加重试机制）
    const fileName = `audio_${contentId}_${Date.now()}.mp3`;
    const file = new AV.File(fileName, buffer, 'audio/mpeg');
    console.log('📤 上传音频文件到LeanCloud:', fileName, '文件大小:', buffer.length, 'bytes');
    
    // 重试上传，最多3次
    let finalAudioUrl;
    const maxRetries = 3;
    let lastError;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        if (retry > 0) {
          console.log(`🔄 重试上传音频文件 (${retry}/${maxRetries - 1})...`);
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 2000 * retry));
        }
        
        await file.save();
        finalAudioUrl = file.url();
        console.log('✅ 音频文件上传成功，URL:', finalAudioUrl);
        break; // 成功则跳出循环
      } catch (uploadError) {
        lastError = uploadError;
        console.error(`❌ 上传音频文件失败 (尝试 ${retry + 1}/${maxRetries}):`, uploadError.message);
        
        // 如果是连接重置错误，继续重试
        if (uploadError.code === 'ECONNRESET' || uploadError.message.includes('ECONNRESET')) {
          if (retry < maxRetries - 1) {
            console.log(`⏳ 连接重置，将在 ${2 * (retry + 1)} 秒后重试...`);
            continue;
          }
        }
        
        // 最后一次尝试失败，抛出错误
        if (retry === maxRetries - 1) {
          throw new Error(`上传音频文件到LeanCloud失败（已重试${maxRetries}次）: ${uploadError.message}`);
        }
      }
    }
    
    if (!finalAudioUrl) {
      throw new Error(`上传音频文件到LeanCloud失败（已重试${maxRetries}次）: ${lastError?.message || '未知错误'}`);
    }
    
    // 更新ExtractedContent记录，根据language参数保存到对应字段
    if (contentObj) {
      if (language === 'en') {
        contentObj.set('audioUrlEn', finalAudioUrl);
      } else {
        contentObj.set('audioUrl', finalAudioUrl);
      }
      await contentObj.save();
    }

    res.json({
      success: true,
      data: {
        audioUrl: finalAudioUrl,
        contentId: contentId,
        language: language
      }
    });
  } catch (error) {
    console.error('❌ 生成音频失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    console.error('❌ 错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // 特殊处理腾讯云SDK异常
    if (error.code === 'UnsupportedOperation.PkgExhausted') {
      return res.status(402).json({
        success: false,
        message: '腾讯云资源包配额已用完，请前往腾讯云控制台购买资源包或充值',
        error: error.message || '资源包配额已用完',
        code: error.code,
        suggestion: '请访问 https://console.cloud.tencent.com/tts 购买资源包'
      });
    }
    
    // 检查是否是腾讯云API错误
    if (error.Error) {
      const apiError = error.Error;
      console.error('❌ 腾讯云API错误:', apiError);
      return res.status(500).json({
        success: false,
        message: `腾讯云API错误: ${apiError.Message || '未知错误'}`,
        error: apiError.Message || JSON.stringify(apiError),
        code: apiError.Code
      });
    }
    
    res.status(500).json({
      success: false,
      message: '生成音频失败',
      error: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 步骤2: 生成无声视频（根据文本和音频时长调用doubao模型）
router.post('/content/:contentId/generate-silent-video', async (req, res) => {
  // 立即设置CORS头，确保长时间运行的请求也能正确返回CORS响应
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // 设置响应超时时间（15分钟）
  req.setTimeout(15 * 60 * 1000);
  res.setTimeout(15 * 60 * 1000);
  
  // 监听请求断开事件
  let requestAborted = false;
  req.on('close', () => {
    requestAborted = true;
    console.warn('⚠️ 客户端断开连接，但后端将继续处理视频生成任务');
  });
  
  console.log('🌐 Origin:', origin);
  
  try {
    const { contentId } = req.params;
    let { styleDescription } = req.body || {}; // 从请求体中获取风格描述
    
    // If no style description provided, use default value
    if (!styleDescription || !styleDescription.trim()) {
      styleDescription = 'Anime style, vibrant colors';
      console.log('⚠️ No style description provided, using default:', styleDescription);
    } else {
      console.log('🎨 Received style description:', styleDescription);
    }
    
    // 获取内容信息
    const contentObj = await new AV.Query('ExtractedContent').get(contentId);
    if (!contentObj) {
      return res.status(404).json({
        success: false,
        message: '内容不存在'
      });
    }

    // 获取文本内容（优先使用中文，如果没有则使用英文）
    const textContent = contentObj.get('summary') || contentObj.get('summaryEn') || contentObj.get('chapterTitle') || '';
    if (!textContent) {
      return res.status(400).json({
        success: false,
        message: '内容文本为空，无法生成视频'
      });
    }

    // 获取音频时长（优先使用中文音频，如果没有则使用英文音频）
    let audioUrl = contentObj.get('audioUrl') || contentObj.get('audioUrlEn');
    if (!audioUrl) {
      return res.status(400).json({
        success: false,
        message: '请先生成至少一个音频（中文或英文）'
      });
    }

    // 判断是否是中文视频（如果存在中文音频URL，则为中文视频）
    const isChineseVideo = !!contentObj.get('audioUrl');

    // 更新状态为生成中
    contentObj.set('videoStatus', 'generating');
    await contentObj.save();

    console.log('📝 开始生成无声视频，文本:', textContent.substring(0, 50) + '...');

    // 验证Doubao API配置
    if (!DOUBAO_API_KEY) {
      throw new Error('Doubao API Key未配置，请设置ARK_API_KEY或DOUBAO_API_KEY环境变量');
    }

    // 获取音频时长
    let finalAudioUrl = audioUrl;
    if (finalAudioUrl.startsWith('http://')) {
      finalAudioUrl = finalAudioUrl.replace('http://', 'https://');
    }
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const tempAudioPath = path.join(tempDir, `audio_${contentId}_${timestamp}.mp3`);
    
    // 下载音频文件
    const audioResponse = await fetch(finalAudioUrl);
    if (!audioResponse.ok) {
      throw new Error(`下载音频失败: ${audioResponse.statusText}`);
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    await fs.writeFile(tempAudioPath, audioBuffer);
    console.log('✅ 音频下载完成，大小:', audioBuffer.length, 'bytes');
    
    // 使用ffmpeg获取音频时长
    const audioDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempAudioPath, (err, metadata) => {
        if (err) {
          console.error('❌ 获取音频时长失败:', err);
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          console.log('✅ 音频时长:', duration, '秒');
          resolve(duration);
        }
      });
    });
    
    const audioDurationSeconds = Math.ceil(audioDuration);
    console.log('📊 音频总时长:', audioDurationSeconds, '秒');
    
    // 固定生成3段视频（每段5秒）
    const videoSegmentDuration = 5; // 每段视频5秒
    const numSegments = 3; // 固定生成3段视频
    console.log('📊 固定生成', numSegments, '段视频（每段', videoSegmentDuration, '秒）');
    
    // 步骤1: 使用Deepseek根据Chinese Summary生成3个视频画面提示词
    console.log('🤖 步骤1: 使用Deepseek生成3个视频画面提示词...');
    console.log('📝 Chinese Summary内容:', textContent);
    
    let videoPrompts = [];
    try {
      const deepseekPrompt = `请根据以下中文内容，生成3个适合用于视频画面的视觉描述提示词。每个提示词应该简洁、具体、富有画面感，适合用于文生视频API。

内容摘要：
${textContent}

要求：
1. 生成恰好3个提示词
2. 每个提示词应该描述一个具体的视觉场景或画面
3. 提示词应该与内容主题相关
4. 提示词长度适中（20-50字）
5. 避免抽象概念，注重具体可视化的描述

请以JSON格式返回，格式如下：
{
  "prompts": ["提示词1", "提示词2", "提示词3"]
}`;

      const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: deepseekPrompt
            }
          ],
          temperature: 0.7
        })
      });

      if (!deepseekResponse.ok) {
        const errorText = await deepseekResponse.text();
        console.error('❌ Deepseek API返回错误:', deepseekResponse.status, errorText);
        throw new Error(`Deepseek API错误: ${deepseekResponse.status} - ${errorText}`);
      }

      const deepseekData = await deepseekResponse.json();
      const deepseekContent = deepseekData.choices[0].message.content;
      console.log('📥 Deepseek API原始响应:', deepseekContent);

      // 解析JSON响应
      const jsonMatch = deepseekContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        videoPrompts = parsedData.prompts || [];
      }

      // 确保有恰好3个提示词
      if (videoPrompts.length !== 3) {
        console.warn('⚠️ Deepseek返回的提示词数量不是3个，使用备用方案');
        // 备用方案：将文本分段
        const textLength = textContent.length;
        const segmentTextLength = Math.ceil(textLength / numSegments);
        videoPrompts = [];
        for (let i = 0; i < numSegments; i++) {
          const start = i * segmentTextLength;
          const end = Math.min(start + segmentTextLength, textLength);
          videoPrompts.push(textContent.substring(start, end));
        }
      }

      console.log('✅ 成功生成3个视频画面提示词:');
      videoPrompts.forEach((prompt, index) => {
        console.log(`   提示词${index + 1}: ${prompt}`);
      });

    } catch (error) {
      console.error('❌ 使用Deepseek生成提示词失败:', error.message);
      console.log('⚠️ 使用备用方案：将文本简单分段');
      
      // 备用方案：将文本分段
      const textLength = textContent.length;
      const segmentTextLength = Math.ceil(textLength / numSegments);
      videoPrompts = [];
      for (let i = 0; i < numSegments; i++) {
        const start = i * segmentTextLength;
        const end = Math.min(start + segmentTextLength, textLength);
        videoPrompts.push(textContent.substring(start, end));
      }
    }
    
    console.log('📊 最终使用的', videoPrompts.length, '个视频提示词');
    
    // 生成多段视频
    console.log('🎬 开始生成多段无声视频');
    const videoSegmentUrls = [];
    const tempVideoSegmentPaths = [];
    
    const videoRequestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_API_KEY}`
    };
    
    // 辅助函数：简化文本以避免敏感内容检测
    const simplifyText = (text, level = 1) => {
      let simplified = text;
      
      // 级别1：移除可能触发敏感检测的词汇和标点
      if (level >= 1) {
        // 移除一些可能触发敏感检测的词汇
        const sensitiveWords = ['问题', '解决', '方法', '策略', '挑战', '困难', '失败', '成功', '竞争', '垄断'];
        sensitiveWords.forEach(word => {
          simplified = simplified.replace(new RegExp(word, 'g'), '');
        });
        
        // 移除多余的标点符号
        simplified = simplified.replace(/[，。！？；：、]/g, ' ');
        simplified = simplified.replace(/\s+/g, ' ').trim();
      }
      
      // 级别2：缩短文本，只保留核心内容
      if (level >= 2) {
        // 如果文本太长，截取前半部分
        if (simplified.length > 50) {
          simplified = simplified.substring(0, 50);
        }
      }
      
      // 级别3：提取关键词
      if (level >= 3) {
        // 提取前30个字符作为核心内容
        if (simplified.length > 30) {
          simplified = simplified.substring(0, 30);
        }
      }
      
      return simplified || text.substring(0, 20); // 如果简化后为空，至少保留前20个字符
    };
    
    // 辅助函数：生成单段视频（带重试机制）
    const generateVideoSegment = async (promptText, segmentIndex, retryCount = 0) => {
      const maxRetries = 3;
      let currentText = promptText;
      
      // 如果已经重试过，简化文本
      if (retryCount > 0) {
        currentText = simplifyText(promptText, retryCount);
        console.log(`🔄 第 ${segmentIndex + 1}/${numSegments} 段视频重试（第${retryCount}次），简化后文本:`, currentText.substring(0, 50) + '...');
      }
      
      // 根据API文档，使用 --ratio 9:16 --dur 参数格式
      // --ratio 9:16 表示9:16竖屏比例（强制限制）
      // --dur 指定视频时长（秒）
      // styleDescription在入口处已经保证有值（默认值或用户提供）
      const finalStyleText = styleDescription.trim();
      const styleText = `，${finalStyleText}`;
      const promptWithParams = `${currentText}${styleText} --ratio 9:16 --dur ${videoSegmentDuration}`;
      console.log(`🎨 第 ${segmentIndex + 1}/${numSegments} 段视频提示词:`, currentText);
      console.log(`🎨 第 ${segmentIndex + 1}/${numSegments} 段视频使用的风格描述:`, finalStyleText);
      
      const textToVideoRequestBody = {
        model: DOUBAO_MODEL_ID,
        content: [
          {
            type: 'text',
            text: promptWithParams
          }
        ],
        generate_audio: false // 明确指定生成无声视频
      };
      
      console.log(`📤 第 ${segmentIndex + 1}/${numSegments} 段视频请求:`, JSON.stringify(textToVideoRequestBody, null, 2));
      console.log(`🔑 使用模型: ${DOUBAO_MODEL_ID}`);
      console.log(`🔗 API端点: ${DOUBAO_TEXT_TO_VIDEO_URL}`);
      
      let textToVideoResponse;
      try {
        // 使用AbortController实现超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        
        textToVideoResponse = await fetch(DOUBAO_TEXT_TO_VIDEO_URL, {
          method: 'POST',
          headers: videoRequestHeaders,
          body: JSON.stringify(textToVideoRequestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        console.error(`❌ Doubao API请求失败:`, {
          error: fetchError.message,
          errorName: fetchError.name,
          errorStack: fetchError.stack,
          url: DOUBAO_TEXT_TO_VIDEO_URL,
          headers: videoRequestHeaders,
          requestBody: textToVideoRequestBody
        });
        throw new Error(`Doubao API请求失败: ${fetchError.message || fetchError.name || '网络错误'}`);
      }
      
      if (!textToVideoResponse.ok) {
        const errorText = await textToVideoResponse.text();
        console.error(`❌ Doubao API错误响应:`, {
          status: textToVideoResponse.status,
          statusText: textToVideoResponse.statusText,
          errorText: errorText,
          requestBody: textToVideoRequestBody
        });
        throw new Error(`Doubao文生视频API失败: ${textToVideoResponse.status} ${textToVideoResponse.statusText} - ${errorText}`);
      }
      
      const textToVideoData = await textToVideoResponse.json();
      const taskId = textToVideoData.id;
      
      if (!taskId) {
        throw new Error('Doubao文生视频响应格式错误，未找到任务ID');
      }
      
      console.log(`⏳ 开始轮询第 ${segmentIndex + 1}/${numSegments} 段视频，task_id:`, taskId);
      
      // 轮询获取视频URL（增加超时时间，视频生成可能需要更长时间）
      const maxAttempts = 120; // 增加到120次（10分钟）
      const pollInterval = 5000; // 每5秒查询一次
      let attempts = 0;
      let taskStatus = 'queued';
      let segmentVideoUrl = null;
      
      while (attempts < maxAttempts && taskStatus !== 'succeeded' && taskStatus !== 'failed' && taskStatus !== 'expired' && taskStatus !== 'cancelled') {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
        
        const statusUrl = `${DOUBAO_TASK_STATUS_URL}/${taskId}`;
        let statusResponse = null;
        let retryCount = 0;
        const maxRetries = 3;
        const fetchTimeout = 30000;
        
        while (retryCount < maxRetries) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);
            
            statusResponse = await fetch(statusUrl, {
              method: 'GET',
              headers: videoRequestHeaders,
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            break;
          } catch (fetchError) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw new Error(`查询任务状态失败: ${fetchError.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        if (!statusResponse || !statusResponse.ok) {
          const errorText = statusResponse ? await statusResponse.text() : '无响应';
          throw new Error(`查询任务状态失败: ${statusResponse?.statusText || '网络错误'} - ${errorText}`);
        }
        
        const statusData = await statusResponse.json();
        taskStatus = statusData.status;
        
        console.log(`📊 第 ${segmentIndex + 1}/${numSegments} 段视频任务状态（第${attempts}次查询）:`, taskStatus);
        
        if (taskStatus === 'succeeded') {
          segmentVideoUrl = statusData.content?.video_url;
          if (!segmentVideoUrl) {
            throw new Error('任务完成但未找到视频URL');
          }
          console.log(`✅ 第 ${segmentIndex + 1}/${numSegments} 段视频生成完成，URL:`, segmentVideoUrl);
          break;
        } else if (taskStatus === 'failed' || taskStatus === 'expired' || taskStatus === 'cancelled') {
          const errorMsg = statusData.error?.message || statusData.error?.code || '任务失败';
          const errorCode = statusData.error?.code || '';
          
          // 特殊处理敏感内容错误 - 自动重试
          if (errorMsg.includes('sensitive') || errorMsg.includes('敏感') || errorCode.includes('sensitive')) {
            console.error(`❌ 第 ${segmentIndex + 1}/${numSegments} 段视频生成失败（内容安全检测）:`, errorMsg);
            
            // 如果还有重试次数，自动简化文本并重试
            if (retryCount < maxRetries) {
              console.log(`🔄 检测到敏感内容，自动简化文本并重试（${retryCount + 1}/${maxRetries}）...`);
              // 等待2秒后重试
              await new Promise(resolve => setTimeout(resolve, 2000));
              // 递归调用，增加重试次数
              return generateVideoSegment(promptText, segmentIndex, retryCount + 1);
            } else {
              // 重试次数用完，抛出错误
              throw new Error(`视频生成失败：内容可能包含敏感信息，已尝试简化文本${maxRetries}次仍失败。请手动修改文本内容后重试。错误详情: ${errorMsg}`);
            }
          }
          
          console.error(`❌ 第 ${segmentIndex + 1}/${numSegments} 段视频生成失败:`, errorMsg);
          throw new Error(`视频生成任务失败: ${errorMsg}`);
        }
      }
      
      if (!segmentVideoUrl) {
        throw new Error(`视频生成超时或失败，任务状态: ${taskStatus}`);
      }
      
      return segmentVideoUrl;
    };
    
    // 步骤2: 使用豆包根据提示词和风格描述生成3个视频
    console.log('🎬 步骤2: 使用豆包生成3个视频...');
    for (let i = 0; i < numSegments; i++) {
      console.log(`📹 生成第 ${i + 1}/${numSegments} 段视频，使用提示词: ${videoPrompts[i]}`);
      const segmentVideoUrl = await generateVideoSegment(videoPrompts[i], i);
      videoSegmentUrls.push(segmentVideoUrl);
    }
    
    console.log('✅ 所有视频段生成完成，共', videoSegmentUrls.length, '段');
    
    // 下载所有视频段
    console.log('📥 下载所有视频段');
    for (let i = 0; i < videoSegmentUrls.length; i++) {
      const segmentUrl = videoSegmentUrls[i];
      const segmentPath = path.join(tempDir, `video_segment_${contentId}_${timestamp}_${i}.mp4`);
      tempVideoSegmentPaths.push(segmentPath);
      
      console.log(`📥 下载第 ${i + 1}/${videoSegmentUrls.length} 段视频:`, segmentUrl);
      const segmentResponse = await fetch(segmentUrl);
      if (!segmentResponse.ok) {
        throw new Error(`下载视频段失败: ${segmentResponse.statusText}`);
      }
      const segmentBuffer = Buffer.from(await segmentResponse.arrayBuffer());
      await fs.writeFile(segmentPath, segmentBuffer);
      console.log(`✅ 第 ${i + 1}/${videoSegmentUrls.length} 段视频下载完成`);
    }
    
    // 使用ffmpeg拼接所有视频段
    console.log('🎞️ 拼接所有视频段');
    const concatenatedVideoPath = path.join(tempDir, `concatenated_${contentId}_${timestamp}.mp4`);
    const concatFilePath = path.join(tempDir, `concat_${contentId}_${timestamp}.txt`);
    const concatFileContent = tempVideoSegmentPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    await fs.writeFile(concatFilePath, concatFileContent);
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000;
      
      const ffmpegProcess = ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c:v copy', '-c:a copy'])
        .output(concatenatedVideoPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg拼接命令:', commandLine);
          timeoutId = setTimeout(() => {
            console.error('❌ 视频段拼接超时（5分钟）');
            ffmpegProcess.kill('SIGKILL');
            reject(new Error('视频段拼接超时，请重试'));
          }, timeout);
        })
        .on('end', () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('✅ 视频段拼接完成');
          resolve(null);
        })
        .on('error', (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ FFmpeg拼接失败:', err);
          // 如果copy失败，尝试重新编码
          if (err.message && err.message.includes('copy')) {
            console.log('⚠️ 视频流复制失败，尝试重新编码...');
            const fallbackProcess = ffmpeg()
              .input(concatFilePath)
              .inputOptions(['-f', 'concat', '-safe', '0'])
              .outputOptions([
                '-c:v libx264',
                '-preset ultrafast',
                '-crf 23',
                '-pix_fmt yuv420p',
                '-s 720x1280'
              ])
              .output(concatenatedVideoPath)
              .on('end', () => {
                console.log('✅ 视频段拼接完成（使用重新编码）');
                resolve(null);
              })
              .on('error', (fallbackErr) => {
                console.error('❌ 重新编码也失败:', fallbackErr);
                reject(fallbackErr);
              })
              .run();
          } else {
            reject(err);
          }
        })
        .run();
    });
    
    // 步骤3: 根据音频时长拼接3个视频并重复拼接
    console.log('🔄 步骤3: 根据音频时长拼接并重复视频...');
    console.log('📏 获取拼接后视频的时长...');
    const concatenatedVideoDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(concatenatedVideoPath, (err, metadata) => {
        if (err) {
          console.error('❌ 获取视频时长失败:', err);
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          console.log('✅ 拼接后视频时长:', duration, '秒');
          resolve(duration);
        }
      });
    });
    
    // 根据音频时长，重复播放拼接后的视频直到匹配音频时长
    let finalVideoPath = concatenatedVideoPath;
    if (audioDurationSeconds > concatenatedVideoDuration) {
      console.log(`🔄 音频时长(${audioDurationSeconds}秒) > 视频时长(${concatenatedVideoDuration}秒)，需要重复播放视频`);
      const repeatCount = Math.ceil(audioDurationSeconds / concatenatedVideoDuration);
      console.log(`📊 需要重复播放 ${repeatCount} 次`);
      
      // 创建重复播放的视频列表文件
      const repeatConcatFilePath = path.join(tempDir, `repeat_concat_${contentId}_${timestamp}.txt`);
      const repeatConcatContent = Array(repeatCount).fill(concatenatedVideoPath).map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
      await fs.writeFile(repeatConcatFilePath, repeatConcatContent);
      
      // 重复拼接视频
      finalVideoPath = path.join(tempDir, `final_repeated_${contentId}_${timestamp}.mp4`);
      console.log('🔄 开始重复拼接视频...');
      
      await new Promise((resolve, reject) => {
        let timeoutId = null;
        const timeout = 300000;
        
        const ffmpegProcess = ffmpeg()
          .input(repeatConcatFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions([
            '-c:v libx264',
            '-preset ultrafast',
            '-crf 23',
            '-pix_fmt yuv420p',
            '-s 720x1280',
            '-t', audioDurationSeconds.toString() // 限制总时长为音频时长
          ])
          .output(finalVideoPath)
          .on('start', (commandLine) => {
            console.log('🎬 FFmpeg重复拼接命令:', commandLine);
            timeoutId = setTimeout(() => {
              console.error('❌ 视频重复拼接超时（5分钟）');
              ffmpegProcess.kill('SIGKILL');
              reject(new Error('视频重复拼接超时，请重试'));
            }, timeout);
          })
          .on('end', () => {
            if (timeoutId) clearTimeout(timeoutId);
            console.log('✅ 视频重复拼接完成');
            resolve(null);
          })
          .on('error', (err) => {
            if (timeoutId) clearTimeout(timeoutId);
            console.error('❌ FFmpeg重复拼接失败:', err);
            reject(err);
          })
          .run();
      });
      
      // 清理重复拼接的临时文件
      try {
        await fs.unlink(repeatConcatFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ 清理重复拼接临时文件失败:', cleanupError.message);
      }
    } else {
      console.log(`✅ 视频时长(${concatenatedVideoDuration}秒) >= 音频时长(${audioDurationSeconds}秒)，无需重复播放`);
    }
    
    // 上传最终的无声视频到LeanCloud
    console.log('📤 开始上传无声视频到LeanCloud...');
    const silentVideoBuffer = await fs.readFile(finalVideoPath);
    const fileSizeMB = (silentVideoBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`📊 视频文件大小: ${fileSizeMB}MB`);
    
    const silentVideoFile = new AV.File(`silent_video_${contentId}_${timestamp}.mp4`, silentVideoBuffer, 'video/mp4');
    
    // 设置上传超时时间（10分钟）
    const uploadStartTime = Date.now();
    try {
      await Promise.race([
        silentVideoFile.save(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('视频上传超时，请检查网络连接或文件大小')), 10 * 60 * 1000)
        )
      ]);
      const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
    const silentVideoUrl = silentVideoFile.url();
      console.log(`✅ 无声视频上传成功，耗时: ${uploadTime}秒，URL:`, silentVideoUrl);
    } catch (error) {
      console.error('❌ 无声视频上传失败:', error);
      console.error('错误详情:', error.message);
      throw new Error(`视频上传失败: ${error.message}`);
    }
    
    const silentVideoUrl = silentVideoFile.url();
    
    // 更新ExtractedContent记录
    contentObj.set('silentVideoUrl', silentVideoUrl);
    await contentObj.save();
    
    // 清理临时文件
    const cleanupFiles = [
      tempAudioPath, 
      concatenatedVideoPath, 
      concatFilePath, 
      ...tempVideoSegmentPaths,
      ...(finalVideoPath !== concatenatedVideoPath ? [finalVideoPath] : []) // 如果创建了重复播放的视频，也清理它
    ];
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('⚠️ 清理临时文件失败:', cleanupError.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        silentVideoUrl: silentVideoUrl,
        contentId: contentId
      }
    });
  } catch (error) {
    console.error('❌ 生成无声视频失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    console.error('❌ 错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('❌ ContentId:', req.params.contentId);
    
    // 更新状态为失败
    try {
      const content = await new AV.Query('ExtractedContent').get(req.params.contentId);
      if (content) {
        content.set('videoStatus', 'failed');
        await content.save();
      }
    } catch (updateError) {
      console.error('更新内容状态失败:', updateError);
    }
    
    // 检查是否是LeanCloud错误
    if (error.message && error.message.includes('Object not found')) {
      return res.status(404).json({
        success: false,
        message: '内容不存在',
        error: `找不到ID为 ${req.params.contentId} 的内容记录`,
        contentId: req.params.contentId
      });
    }
    
    // 返回详细的错误信息
    const errorResponse = {
      success: false,
      message: '生成无声视频失败',
      error: error.message || String(error),
      contentId: req.params.contentId
    };
    
    // 在开发环境下返回更多调试信息
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      errorResponse.stack = error.stack;
      errorResponse.details = JSON.stringify(error, Object.getOwnPropertyNames(error));
    }
    
    res.status(500).json(errorResponse);
  }
});

// 步骤3: 生成视频（将无声视频与音频合并）
// 生成字幕文件的辅助函数（使用腾讯云语音识别）
// 字幕提前量（秒），让字幕提前出现以匹配音频
const SUBTITLE_ADVANCE_TIME = 0.7; // 提前0.7秒，增加提前量以改善同步

// 检查FFmpeg版本和subtitles滤镜支持情况
async function checkFFmpegSubtitlesSupport() {
  return new Promise((resolve) => {
    ffmpeg.ffprobe('', (err) => {
      // 忽略错误，只是检查FFmpeg是否可用
      const { execSync } = require('child_process');
      try {
        // 检查FFmpeg版本
        const versionOutput = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 5000 });
        const versionMatch = versionOutput.match(/ffmpeg version (\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        
        // 检查subtitles滤镜是否支持charenc参数
        try {
          const filterHelp = execSync('ffmpeg -h filter=subtitles', { encoding: 'utf8', timeout: 5000 });
          const supportsCharenc = filterHelp.includes('charenc') || filterHelp.includes('character encoding');
          resolve({ version, supportsCharenc, available: true });
        } catch (e) {
          // 如果无法获取帮助信息，假设支持（较新版本都支持）
          resolve({ version, supportsCharenc: true, available: true });
        }
      } catch (e) {
        console.warn('⚠️ 无法检查FFmpeg版本:', e.message);
        resolve({ version: 'unknown', supportsCharenc: true, available: false });
      }
    });
  });
}

// 转义字幕文件路径，用于FFmpeg subtitles滤镜
// 在Docker容器中，路径需要特殊处理以确保FFmpeg能正确读取
function escapeSubtitlePath(filePath) {
  if (!filePath) return '';
  
  // 统一使用正斜杠（Docker容器中使用正斜杠）
  let escaped = filePath.replace(/\\/g, '/');
  
  // FFmpeg subtitles滤镜路径转义规则：
  // 1. 在单引号字符串中，单引号需要转义为 '\''
  // 2. 冒号、方括号、逗号等特殊字符在路径中不需要转义（除非在filter表达式中）
  // 3. 确保路径是绝对路径或相对于工作目录的路径
  
  // 转义单引号（在单引号字符串中）
  escaped = escaped.replace(/'/g, "'\\''");
  
  console.log(`📝 字幕路径转义: 原始=${filePath}, 转义后=${escaped}`);
  
  return escaped;
}

async function generateSubtitleFile(audioUrl, language, tempDir, contentId, timestamp) {
  try {
    console.log(`📝 开始使用腾讯云ASR生成${language === 'zh' ? '中文' : '英文'}字幕，音频URL: ${audioUrl}`);
    
    if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
      throw new Error('腾讯云ASR Secret未配置，请设置TENCENT_SECRET_ID和TENCENT_SECRET_KEY环境变量');
    }
    
    // 根据语言选择引擎模型
    // 中文：16k_zh（16k中文通用）
    // 英文：16k_en（16k英文）
    // 中英混合：16k_zh_en（16k中英混合）
    const engineModelType = language === 'zh' ? '16k_zh' : '16k_en';
    
    // 创建语音识别任务
    console.log(`🎤 创建腾讯云ASR识别任务，引擎: ${engineModelType}`);
    const createTaskParams = {
      EngineModelType: engineModelType,
      ChannelNum: 1, // 单声道
      ResTextFormat: 0, // 返回带时间戳的文本格式
      SourceType: 0, // 0表示音频URL方式
      Url: audioUrl, // 音频URL
    };
    
    console.log('📋 CreateRecTask 请求参数:', JSON.stringify(createTaskParams, null, 2));
    const createResponse = await tencentAsrClient.CreateRecTask(createTaskParams);
    console.log('✅ CreateRecTask 响应:', JSON.stringify(createResponse, null, 2));
    
    if (createResponse.Error) {
      throw new Error(`创建ASR任务失败: ${createResponse.Error.Message || JSON.stringify(createResponse.Error)}`);
    }
    
    const taskId = createResponse.Data?.TaskId;
    if (!taskId) {
      throw new Error('ASR任务创建成功但未返回TaskId');
    }
    
    console.log(`✅ ASR任务已创建，TaskId: ${taskId}`);
    
    // 轮询查询任务状态（最多等待5分钟）
    const maxAttempts = 60; // 最多查询60次
    const pollInterval = 5000; // 每5秒查询一次
    let recognitionResult = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      console.log(`📊 查询ASR任务状态 (${attempt + 1}/${maxAttempts})，TaskId: ${taskId}`);
      const queryParams = {
        TaskId: taskId
      };
      
      const queryResponse = await tencentAsrClient.DescribeTaskStatus(queryParams);
      console.log(`📊 查询结果 (${attempt + 1}/${maxAttempts}):`, JSON.stringify(queryResponse, null, 2));
      
      if (queryResponse.Error) {
        throw new Error(`查询ASR任务状态失败: ${queryResponse.Error.Message || JSON.stringify(queryResponse.Error)}`);
      }
      
      const status = queryResponse.Data?.Status;
      if (status === 2) { // 2表示任务完成
        recognitionResult = queryResponse.Data;
        console.log('✅ ASR任务完成，获取到识别结果');
        break;
      } else if (status === 3) { // 3表示任务失败
        throw new Error(`ASR任务失败: ${queryResponse.Data?.ErrorMsg || '未知错误'}`);
      }
      // status === 0 表示任务处理中，继续轮询
    }
    
    if (!recognitionResult) {
      throw new Error('ASR任务超时，未能获取识别结果');
    }
    
    // 解析识别结果
    // ResTextFormat=0 返回格式：带时间戳的文本
    // 可能返回在Result、ResultDetail或Data字段中
    let resultText = recognitionResult.Result || recognitionResult.ResultDetail || recognitionResult.Data || '';
    
    // 如果resultText是对象，尝试提取文本内容
    if (typeof resultText === 'object') {
      resultText = resultText.Text || resultText.Result || JSON.stringify(resultText);
    }
    
    // 确保resultText是UTF-8编码的字符串
    // 如果是Buffer，转换为UTF-8字符串
    if (Buffer.isBuffer(resultText)) {
      resultText = resultText.toString('utf8');
    } else if (typeof resultText !== 'string') {
      resultText = String(resultText);
    }
    
    // 确保字符串是有效的UTF-8编码
    // 移除无效的UTF-8序列，避免乱码
    try {
      // 尝试将字符串编码为Buffer再解码，确保UTF-8有效性
      const buffer = Buffer.from(resultText, 'utf8');
      resultText = buffer.toString('utf8');
    } catch (e) {
      console.warn('⚠️ UTF-8编码转换警告:', e.message);
    }
    
    if (!resultText || (typeof resultText === 'string' && resultText.trim().length === 0)) {
      throw new Error('ASR识别结果为空');
    }
    
    console.log('📝 ASR识别结果文本:', typeof resultText === 'string' ? resultText.substring(0, 500) : JSON.stringify(resultText).substring(0, 500));
    console.log('📝 ASR识别结果编码检查: UTF-8字符串，长度', resultText.length);
    
    // 将识别结果转换为SRT格式
    const srtPath = path.join(tempDir, `subtitle_${contentId}_${language}_${timestamp}.srt`);
    const srtContent = convertAsrResultToSRT(resultText);
    
    // 确保使用UTF-8 BOM编码，避免中文乱码
    // 使用Buffer确保UTF-8 BOM正确写入
    const BOM = Buffer.from('\uFEFF', 'utf8');
    const srtContentBuffer = Buffer.from(srtContent, 'utf8');
    const srtContentWithBOM = Buffer.concat([BOM, srtContentBuffer]);
    
    await fs.writeFile(srtPath, srtContentWithBOM);
    console.log(`✅ 字幕文件生成成功: ${srtPath}`);
    console.log(`📝 字幕文件编码: UTF-8 with BOM`);
    console.log(`📝 字幕内容预览（前200字符）: ${srtContent.substring(0, 200)}`);
    
    return srtPath;
  } catch (error) {
    console.error('❌ 使用腾讯云ASR生成字幕失败:', error);
    console.error('❌ 错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    // 如果生成失败，返回null，视频仍然可以生成，只是没有字幕
    return null;
  }
}

// 将腾讯云ASR识别结果转换为SRT格式
function convertAsrResultToSRT(resultText) {
  // ASR返回格式可能是多种：
  // 格式1: "00:00:00,000 --> 00:00:03,000 第一段文字\n00:00:03,000 --> 00:00:06,000 第二段文字"
  // 格式2: JSON格式，包含时间戳和文本数组
  // 格式3: 纯文本，需要根据时间戳分段
  
  let srtContent = '';
  let index = 1;
  
  try {
    // 先尝试解析JSON格式
    let parsedData = null;
    try {
      parsedData = typeof resultText === 'string' ? JSON.parse(resultText) : resultText;
    } catch (e) {
      // 不是JSON格式，继续按文本处理
    }
    
    if (parsedData && typeof parsedData === 'object') {
      // JSON格式：可能包含words、sentences等字段
      console.log('📋 ASR结果JSON格式:', JSON.stringify(parsedData, null, 2));
      
      // 尝试提取words数组（包含时间戳的单词）
      if (parsedData.words && Array.isArray(parsedData.words)) {
        // 直接使用ASR返回的单词时间戳，不按标点符号分段
        // 将连续的单词组合成合理的字幕块（每3-5个单词一组，或根据时间间隔）
        const subtitleBlocks = [];
        let currentBlock = { words: [], startTime: null, endTime: null };
        const MAX_WORDS_PER_BLOCK = 5; // 每个字幕块最多5个单词
        const MAX_TIME_GAP = 0.5; // 如果单词间隔超过0.5秒，开始新的字幕块
        
        for (let i = 0; i < parsedData.words.length; i++) {
          const word = parsedData.words[i];
          const wordStartTime = word.start_time !== undefined ? word.start_time / 1000 : null;
          const wordEndTime = word.end_time !== undefined ? word.end_time / 1000 : null;
          const wordText = word.word || word.text || '';
          
          // 检查是否需要开始新的字幕块
          if (currentBlock.words.length > 0) {
            const timeGap = wordStartTime !== null && currentBlock.endTime !== null 
              ? wordStartTime - currentBlock.endTime 
              : 0;
            
            // 如果单词间隔太大，或者当前块已经有足够单词，开始新块
            if (timeGap > MAX_TIME_GAP || currentBlock.words.length >= MAX_WORDS_PER_BLOCK) {
              if (currentBlock.words.length > 0 && currentBlock.startTime !== null) {
                subtitleBlocks.push({
                  text: currentBlock.words.join(''),
                  startTime: Math.max(0, currentBlock.startTime - SUBTITLE_ADVANCE_TIME),
                  endTime: currentBlock.endTime || 0
                });
              }
              currentBlock = { words: [], startTime: null, endTime: null };
            }
          }
          
          // 添加单词到当前块
          if (wordText.trim().length > 0) {
            if (currentBlock.startTime === null && wordStartTime !== null) {
              currentBlock.startTime = wordStartTime;
            }
            if (wordEndTime !== null) {
              currentBlock.endTime = wordEndTime;
            }
            currentBlock.words.push(wordText);
          }
        }
        
        // 添加最后一个块
        if (currentBlock.words.length > 0 && currentBlock.startTime !== null) {
          subtitleBlocks.push({
            text: currentBlock.words.join(''),
            startTime: Math.max(0, currentBlock.startTime - SUBTITLE_ADVANCE_TIME),
            endTime: currentBlock.endTime || 0
          });
        }
        
        // 生成SRT
        for (const block of subtitleBlocks) {
          srtContent += `${index}\n`;
          srtContent += `${formatSRTTime(block.startTime)} --> ${formatSRTTime(block.endTime)}\n`;
          srtContent += `${block.text.trim()}\n\n`;
          index++;
        }
      } else if (parsedData.sentences && Array.isArray(parsedData.sentences)) {
        // 如果有sentences数组
        for (const sentence of parsedData.sentences) {
          const startTime = Math.max(0, (sentence.start_time || sentence.startTime || 0) / 1000 - SUBTITLE_ADVANCE_TIME);
          const endTime = (sentence.end_time || sentence.endTime || 0) / 1000;
          const text = sentence.text || sentence.word || '';
          
          srtContent += `${index}\n`;
          srtContent += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
          srtContent += `${text.trim()}\n\n`;
          index++;
        }
      }
    }
    
    // 如果不是JSON格式或JSON解析失败，尝试按行解析文本格式
    if (srtContent.length === 0) {
      const textStr = typeof resultText === 'string' ? resultText : JSON.stringify(resultText);
      const lines = textStr.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        // 格式1: [M:SS.mmm,M:SS.mmm]  文本内容（腾讯云ASR标准格式）
        // 例如：[0:0.040,0:22.140]  美国花卉产业的崛起...
        const bracketTimeMatch = line.match(/\[(\d+):(\d+\.\d+),(\d+):(\d+\.\d+)\]\s*(.*)/);
        
        if (bracketTimeMatch) {
          const [, startMin, startSec, endMin, endSec, text] = bracketTimeMatch;
          
          // 转换为SRT时间格式：HH:MM:SS,mmm，并提前字幕时间
          const startSeconds = parseInt(startMin) * 60 + parseFloat(startSec) - SUBTITLE_ADVANCE_TIME;
          const startTime = formatSRTTime(Math.max(0, startSeconds));
          const endTime = convertToSRTTime(parseInt(endMin), parseFloat(endSec));
          
          // 清理文本：移除多余空格，过滤掉明显不是文本的内容
          const cleanText = cleanSubtitleText(text);
          
          if (cleanText && cleanText.trim().length > 0) {
            srtContent += `${index}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${cleanText}\n\n`;
            index++;
          }
          continue;
        }
        
        // 格式2: HH:MM:SS,mmm --> HH:MM:SS,mmm 文字（标准SRT格式）
        const timeTextMatch = line.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*[-–—>]+\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*(.*)/);
        
        if (timeTextMatch) {
          let [, startTime, endTime, text] = timeTextMatch;
          // 统一时间格式（将.替换为,）
          startTime = startTime.replace('.', ',');
          endTime = endTime.replace('.', ',');
          
          // 提前字幕开始时间
          const startSeconds = parseSRTTime(startTime) - SUBTITLE_ADVANCE_TIME;
          const adjustedStartTime = formatSRTTime(Math.max(0, startSeconds));
          
          const cleanText = cleanSubtitleText(text);
          if (cleanText && cleanText.trim().length > 0) {
            srtContent += `${index}\n`;
            srtContent += `${adjustedStartTime} --> ${endTime}\n`;
            srtContent += `${cleanText}\n\n`;
            index++;
          }
          continue;
        }
        
        // 格式3: 00:00:00.000-00:00:03.000 文字（其他时间格式）
        const altMatch = line.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})[-–—](\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*(.*)/);
        if (altMatch) {
          let [, startTime, endTime, text] = altMatch;
          startTime = startTime.replace('.', ',');
          endTime = endTime.replace('.', ',');
          
          const cleanText = cleanSubtitleText(text);
          if (cleanText && cleanText.trim().length > 0) {
            srtContent += `${index}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${cleanText}\n\n`;
            index++;
          }
        }
      }
    }
    
    // 如果仍然没有解析到内容，使用简单分段方法
    if (srtContent.length === 0) {
      console.warn('⚠️ ASR结果无法解析为标准格式，使用简单分段方法');
      const textStr = typeof resultText === 'string' ? resultText : JSON.stringify(resultText);
      // 先清理文本，移除时间戳等
      const cleanedText = cleanSubtitleText(textStr);
      if (cleanedText && cleanedText.trim().length > 0) {
        // 简单分段方法：不再按标点符号分段，而是根据文本长度动态分配时间
        const sentences = cleanedText.split(/[。！？\n\.!?]+/).filter(s => s.trim().length > 0);
        let currentTime = Math.max(0, 0 - SUBTITLE_ADVANCE_TIME); // 从提前时间开始
        
        // 估算总时长（假设每分钟200字，或每字0.3秒）
        const totalChars = cleanedText.length;
        const estimatedTotalDuration = Math.max(10, totalChars * 0.3); // 至少10秒
        const timePerChar = estimatedTotalDuration / totalChars;
        
        for (const sentence of sentences) {
          const cleanSentence = cleanSubtitleText(sentence);
          if (cleanSentence && cleanSentence.trim().length > 0) {
            // 根据句子长度动态计算时长
            const sentenceDuration = Math.max(2, cleanSentence.length * timePerChar); // 至少2秒
            
            const startTime = formatSRTTime(Math.max(0, currentTime));
            currentTime += sentenceDuration;
            const endTime = formatSRTTime(currentTime);
            
            srtContent += `${index}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${cleanSentence}\n\n`;
            index++;
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ 解析ASR结果失败:', error);
    throw new Error(`解析ASR识别结果失败: ${error.message}`);
  }
  
  if (srtContent.length === 0) {
    throw new Error('ASR识别结果无法转换为SRT格式');
  }
  
  // 直接返回ASR生成的字幕，不再进行额外的分段处理
  // 这样可以保持与音频的同步性
  return srtContent;
}

// 按照标点符号分段字幕，压缩每屏字数
function segmentSubtitlesByPunctuation(srtContent) {
  // 解析现有的SRT内容
  const subtitleBlocks = [];
  const lines = srtContent.split('\n');
  
  let currentBlock = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 空行表示一个字幕块结束
    if (line === '') {
      if (currentBlock) {
        subtitleBlocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }
    
    // 数字行，开始新的字幕块
    if (/^\d+$/.test(line)) {
      if (currentBlock) {
        subtitleBlocks.push(currentBlock);
      }
      currentBlock = {
        index: parseInt(line),
        timeRange: '',
        text: ''
      };
      continue;
    }
    
    // 时间范围行
    if (line.includes('-->')) {
      if (currentBlock) {
        currentBlock.timeRange = line;
      }
      continue;
    }
    
    // 文本行
    if (currentBlock && !currentBlock.timeRange) {
      // 如果还没有时间范围，这行应该是时间范围
      if (line.includes('-->')) {
        currentBlock.timeRange = line;
      }
    } else if (currentBlock) {
      // 已经有时间范围，这是文本内容
      if (currentBlock.text) {
        currentBlock.text += ' ' + line;
      } else {
        currentBlock.text = line;
      }
    }
  }
  
  // 添加最后一个块
  if (currentBlock) {
    subtitleBlocks.push(currentBlock);
  }
  
  // 对每个字幕块进行分段
  const segmentedBlocks = [];
  
  for (const block of subtitleBlocks) {
    // 解析时间范围
    const timeMatch = block.timeRange.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) {
      // 如果无法解析时间，直接使用原块
      segmentedBlocks.push(block);
      continue;
    }
    
    const startTimeStr = timeMatch[1];
    const endTimeStr = timeMatch[2];
    
    // 将时间字符串转换为秒数，并提前字幕开始时间
    const startSeconds = Math.max(0, parseSRTTime(startTimeStr) - SUBTITLE_ADVANCE_TIME);
    const endSeconds = parseSRTTime(endTimeStr);
    const duration = endSeconds - startSeconds;
    
    // 按照标点符号分段文本
    // 中英文标点：。！？，、；：. ! ? , ; :
    const segments = splitTextByPunctuation(block.text);
    
    if (segments.length === 0) {
      segmentedBlocks.push({
        ...block,
        timeRange: `${formatSRTTime(startSeconds)} --> ${endTimeStr}`
      });
      continue;
    }
    
    // 如果只有一个段落，直接使用（但调整开始时间）
    if (segments.length === 1) {
      segmentedBlocks.push({
        ...block,
        timeRange: `${formatSRTTime(startSeconds)} --> ${endTimeStr}`
      });
      continue;
    }
    
    // 多个段落，根据字数比例重新分配时间
    // 计算每个段落的字数（中文字符按1个字符计算，英文单词按平均长度计算）
    const segmentLengths = segments.map(seg => {
      const text = seg.trim();
      if (!text) return 0;
      // 中文字符数 + 英文单词数（按平均4个字符一个单词估算）
      const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
      return chineseChars + englishWords * 2; // 英文单词权重为2
    });
    
    const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
    
    if (totalLength === 0) {
      // 如果没有有效字数，平均分配时间
      const timePerSegment = duration / segments.length;
      let currentTime = startSeconds;
      for (let i = 0; i < segments.length; i++) {
        const segmentText = segments[i].trim();
        if (segmentText.length === 0) continue;
        const segmentStartTime = currentTime;
        const segmentEndTime = Math.min(currentTime + timePerSegment, endSeconds);
        segmentedBlocks.push({
          index: block.index + (i > 0 ? i * 0.001 : 0),
          timeRange: `${formatSRTTime(segmentStartTime)} --> ${formatSRTTime(segmentEndTime)}`,
          text: segmentText
        });
        currentTime = segmentEndTime;
        if (currentTime >= endSeconds) break;
      }
    } else {
      // 设置最小和最大停留时长（秒）
      const MIN_DURATION = 1.5; // 最短1.5秒
      const MAX_DURATION = 8.0; // 最长8秒
      
      // 先按字数比例计算基础时长
      const baseDurations = segmentLengths.map(len => {
        return (len / totalLength) * duration;
      });
      
      // 应用最小和最大时长限制
      const adjustedDurations = baseDurations.map(dur => {
        return Math.max(MIN_DURATION, Math.min(MAX_DURATION, dur));
      });
      
      // 如果调整后的总时长超过原始时长，按比例缩放
      const totalAdjustedDuration = adjustedDurations.reduce((sum, d) => sum + d, 0);
      const scaleFactor = duration / Math.max(totalAdjustedDuration, duration);
      const finalDurations = adjustedDurations.map(dur => dur * scaleFactor);
      
      let currentTime = startSeconds;
      
      for (let i = 0; i < segments.length; i++) {
        const segmentText = segments[i].trim();
        if (segmentText.length === 0) continue;
        
        let segmentDuration = finalDurations[i];
        
        // 确保不超过剩余时间
        const remainingTime = endSeconds - currentTime;
        segmentDuration = Math.min(segmentDuration, remainingTime);
        
        // 确保至少是最小时长（如果还有足够时间）
        if (remainingTime >= MIN_DURATION && segmentDuration < MIN_DURATION) {
          segmentDuration = Math.min(MIN_DURATION, remainingTime);
        }
        
        const segmentStartTime = currentTime;
        const segmentEndTime = Math.min(currentTime + segmentDuration, endSeconds);
        
        segmentedBlocks.push({
          index: block.index + (i > 0 ? i * 0.001 : 0), // 保持索引顺序
          timeRange: `${formatSRTTime(segmentStartTime)} --> ${formatSRTTime(segmentEndTime)}`,
          text: segmentText
        });
        
        currentTime = segmentEndTime;
        
        // 如果已经到达结束时间，停止分配
        if (currentTime >= endSeconds) break;
      }
    }
  }
  
  // 重新生成SRT内容
  let newSrtContent = '';
  let newIndex = 1;
  
  for (const block of segmentedBlocks) {
    newSrtContent += `${newIndex}\n`;
    newSrtContent += `${block.timeRange}\n`;
    newSrtContent += `${block.text}\n\n`;
    newIndex++;
  }
  
  return newSrtContent;
}

// 按照标点符号分段文本
function splitTextByPunctuation(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // 中英文标点符号：。！？，、；：. ! ? , ; :
  // 使用正则表达式分割，保留标点符号
  const segments = [];
  let currentSegment = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentSegment += char;
    
    // 遇到标点符号，结束当前段落
    if (/[。！？，、；：.!,;:?]/.test(char)) {
      const trimmed = currentSegment.trim();
      if (trimmed.length > 0) {
        segments.push(trimmed);
      }
      currentSegment = '';
    }
  }
  
  // 添加最后一段（如果有）
  const trimmed = currentSegment.trim();
  if (trimmed.length > 0) {
    segments.push(trimmed);
  }
  
  // 如果没有任何分段（没有标点），返回原文本
  if (segments.length === 0) {
    return [text.trim()];
  }
  
  return segments;
}

// 解析SRT时间格式为秒数
function parseSRTTime(timeStr) {
  // 格式：HH:MM:SS,mmm
  const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!match) {
    return 0;
  }
  
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const milliseconds = parseInt(match[4]);
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

// 简单的字幕分段方法（备用方案）
function generateSimpleSubtitles(text, audioDurationSeconds) {
  const words = text.split(/[，。！？\s,\.!?]+/).filter(w => w.trim().length > 0);
  const segmentCount = Math.max(1, Math.floor(audioDurationSeconds / 3)); // 每3秒一段
  const wordsPerSegment = Math.ceil(words.length / segmentCount);
  
  const subtitles = [];
  let currentTime = Math.max(0, 0 - SUBTITLE_ADVANCE_TIME); // 从提前时间开始
  const timePerSegment = audioDurationSeconds / segmentCount;
  
  for (let i = 0; i < segmentCount; i++) {
    const startWords = i * wordsPerSegment;
    const endWords = Math.min(startWords + wordsPerSegment, words.length);
    const segmentText = words.slice(startWords, endWords).join(' ');
    
    if (segmentText.trim().length === 0) continue;
    
    const startTime = formatSRTTime(Math.max(0, currentTime));
    currentTime += timePerSegment;
    const endTime = formatSRTTime(Math.min(currentTime, audioDurationSeconds));
    
    subtitles.push({
      index: subtitles.length + 1,
      startTime: startTime,
      endTime: endTime,
      text: segmentText.trim()
    });
  }
  
  return { subtitles };
}

// 格式化SRT时间格式 (HH:MM:SS,mmm)
function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

// 将分钟和秒转换为SRT时间格式
// 例如：convertToSRTTime(0, 22.140) -> "00:00:22,140"
function convertToSRTTime(minutes, seconds) {
  const totalSeconds = minutes * 60 + seconds;
  return formatSRTTime(totalSeconds);
}

// 清理字幕文本，过滤掉时间戳、数字等非文本内容
function cleanSubtitleText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let cleaned = text.trim();
  
  // 移除时间戳格式：[M:SS.mmm,M:SS.mmm] 或类似格式
  cleaned = cleaned.replace(/\[\d+:\d+\.\d+,\d+:\d+\.\d+\]/g, '');
  
  // 移除单独的时间戳格式，如 "0:31,140" 或 "0:31.140"
  cleaned = cleaned.replace(/\b\d+:\d+[,\.]\d+\b/g, '');
  
  // 移除纯数字（可能是误识别的时间戳）
  // 但保留数字在文本中的情况（如"19世纪"）
  cleaned = cleaned.replace(/\b\d+[,\.]\d+\b/g, ''); // 移除小数
  
  // 移除多余的空格
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 如果清理后只剩下数字或特殊字符，返回空字符串
  if (/^[\d\s,\.:;，。：；]+$/.test(cleaned)) {
    return '';
  }
  
  return cleaned;
}

router.post('/content/:contentId/generate-video', async (req, res) => {
  // 立即设置CORS头，确保长时间运行的请求也能正确返回CORS响应
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // 检测前端是否支持SSE（通过Accept头或useSSE参数）
  const acceptHeader = req.headers.accept || '';
  const useSSE = req.query.useSSE === 'true' || req.body.useSSE === true || acceptHeader.includes('text/event-stream');
  
  let sendProgress, cleanup, heartbeatInterval;
  
  if (useSSE) {
    // 设置流式响应头（Server-Sent Events），用于保持连接活跃并发送进度更新
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');
    res.header('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
    
    // 发送进度更新的辅助函数
    sendProgress = (message, progress = null) => {
      try {
        const data = JSON.stringify({ message, progress, timestamp: Date.now() });
        res.write(`data: ${data}\n\n`);
        console.log(`📊 进度更新: ${message}${progress !== null ? ` (${progress}%)` : ''}`);
      } catch (err) {
        console.error('❌ 发送进度更新失败:', err);
      }
    };
    
    // 发送心跳以保持连接活跃（每30秒发送一次）
    heartbeatInterval = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
    
    // 清理函数
    cleanup = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  } else {
    // 兼容模式：使用JSON响应，但仍然发送进度更新（通过日志）
    res.header('Content-Type', 'application/json');
    sendProgress = (message, progress = null) => {
      console.log(`📊 进度更新: ${message}${progress !== null ? ` (${progress}%)` : ''}`);
    };
    cleanup = () => {};
    console.log('⚠️ 前端不支持SSE，使用JSON响应模式（兼容模式）');
  }
  
  let tempVideoPath = null;
  let tempAudioPath = null;
  let tempOutputPath = null;
  let tempSubtitlePath = null;
  
  try {
    console.log('🚀 ========== 生成视频API被调用 ==========');
    console.log('📥 请求参数:', JSON.stringify(req.params, null, 2));
    console.log('📥 请求体:', JSON.stringify(req.body, null, 2));
    console.log('🌐 Origin:', origin);
    
    sendProgress('开始处理视频生成请求', 0);
    
    const { contentId } = req.params;
    const { audioUrl, language = 'zh' } = req.body;

    console.log(`📝 开始处理${language === 'zh' ? '中文' : '英文'}视频生成，ContentId: ${contentId}`);
    sendProgress(`开始处理${language === 'zh' ? '中文' : '英文'}视频生成`, 5);

    // 获取内容信息
    let contentObj;
    try {
      contentObj = await new AV.Query('ExtractedContent').get(contentId);
    } catch (queryError) {
      console.error('❌ 查询内容失败:', queryError);
      return res.status(404).json({
        success: false,
        message: '内容不存在',
        error: queryError.message,
        contentId: contentId
      });
    }
    
    if (!contentObj) {
      console.error('❌ 内容不存在，ContentId:', contentId);
      return res.status(404).json({
        success: false,
        message: '内容不存在',
        contentId: contentId
      });
    }

    // 根据语言确定使用哪个音频URL
    let finalAudioUrl = audioUrl;
    if (!finalAudioUrl) {
      // 如果前端没有传递audioUrl，从content对象中获取
      if (language === 'en') {
        finalAudioUrl = contentObj.get('audioUrlEn');
        if (!finalAudioUrl) {
          return res.status(400).json({
            success: false,
            message: '缺少英文音频URL，请先生成英文音频'
          });
        }
      } else {
        finalAudioUrl = contentObj.get('audioUrl');
        if (!finalAudioUrl) {
          return res.status(400).json({
            success: false,
            message: '缺少中文音频URL，请先生成中文音频'
          });
        }
      }
    }

    console.log(`📻 使用的音频URL (${language === 'zh' ? '中文' : '英文'}):`, finalAudioUrl);
    
    if (!finalAudioUrl) {
      console.error('❌ 缺少音频URL');
      return res.status(400).json({
        success: false,
        message: `缺少${language === 'zh' ? '中文' : '英文'}音频URL`
      });
    }

    // 获取书籍信息以获取博客封面图
    const bookId = contentObj.get('book')?.id || contentObj.get('bookId');
    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: '内容未关联到书籍'
      });
    }
    
    const book = await new AV.Query('Book').get(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: '书籍不存在'
      });
    }
    
    const blogCoverUrl = book.get('blogCoverUrl');
    if (!blogCoverUrl) {
      return res.status(400).json({
        success: false,
        message: '请先生成博客封面图'
      });
    }

    // 更新状态为生成中
    contentObj.set('videoStatus', 'generating');
    await contentObj.save();

    console.log(`📝 开始生成${language === 'zh' ? '中文' : '英文'}视频（使用博客封面图）`);
    sendProgress('准备生成视频', 10);

    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    
    // 下载音频（使用之前确定的finalAudioUrl）
    // 只将http替换为https，但保持域名的大小写
    if (finalAudioUrl.startsWith('http://')) {
      finalAudioUrl = finalAudioUrl.replace(/^http:\/\//, 'https://');
    }
    
    // 验证音频URL格式
    if (!finalAudioUrl || !finalAudioUrl.startsWith('http')) {
      console.error('❌ 音频URL格式无效:', finalAudioUrl);
      throw new Error(`音频URL格式无效: ${finalAudioUrl}`);
    }
    
    // 对于腾讯云COS的URL，确保URL编码正确
    // 如果URL包含已编码的字符，不要重复编码
    let audioUrlToFetch = finalAudioUrl;
    try {
      // 尝试解析URL，如果失败则说明URL格式有问题
      const urlObj = new URL(finalAudioUrl);
      // 如果URL解析成功，使用原始URL（保持签名参数不变）
      audioUrlToFetch = urlObj.toString();
    } catch (urlError) {
      console.warn('⚠️ URL解析失败，使用原始URL:', urlError.message);
      // 如果URL解析失败，尝试编码整个URL
      audioUrlToFetch = encodeURI(finalAudioUrl);
    }
    
    tempAudioPath = path.join(tempDir, `audio_${contentId}_${timestamp}.mp3`);
    console.log('📥 开始下载音频');
    console.log('📥 原始URL:', finalAudioUrl);
    console.log('📥 处理后的URL:', audioUrlToFetch);
    sendProgress('正在下载音频文件', 15);
    
    let audioResponse;
    try {
      console.log('🌐 发起音频fetch请求（超时时间：60秒）...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
      
      // 对于腾讯云COS，可能需要添加Referer头
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      };
      
      // 如果是腾讯云COS URL，添加Referer
      if (audioUrlToFetch.includes('myqcloud.com')) {
        headers['Referer'] = 'https://console.cloud.tencent.com/';
      }
      
      audioResponse = await fetch(audioUrlToFetch, {
        method: 'GET',
        headers: headers,
        signal: controller.signal,
        redirect: 'follow' // 跟随重定向
      });
      
      clearTimeout(timeoutId);
      console.log('✅ 音频fetch请求完成，状态码:', audioResponse.status);
      console.log('✅ 响应头:', JSON.stringify(Object.fromEntries(audioResponse.headers.entries()), null, 2));
    } catch (fetchError) {
      console.error('❌ 下载音频失败（网络错误）:', fetchError);
      console.error('❌ 尝试的URL:', audioUrlToFetch);
      console.error('❌ 原始URL:', finalAudioUrl);
      
      // 如果是网络错误，尝试使用原始URL
      if (audioUrlToFetch !== finalAudioUrl) {
        console.log('🔄 尝试使用原始URL重新下载...');
        try {
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 60000);
          audioResponse = await fetch(finalAudioUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: retryController.signal
          });
          clearTimeout(retryTimeoutId);
          console.log('✅ 使用原始URL重试成功，状态码:', audioResponse.status);
        } catch (retryError) {
          throw new Error(`下载音频失败（网络错误）: ${fetchError.message}`);
        }
      } else {
        throw new Error(`下载音频失败（网络错误）: ${fetchError.message}`);
      }
    }
    
    if (!audioResponse.ok) {
      const errorText = await audioResponse.text().catch(() => '无法读取错误响应');
      console.error('❌ 下载音频失败:', audioResponse.status, audioResponse.statusText);
      console.error('❌ 尝试的音频URL:', audioUrlToFetch);
      console.error('❌ 原始URL:', finalAudioUrl);
      console.error('❌ 错误响应:', errorText.substring(0, 500));
      
      // 提供更详细的错误信息
      if (audioResponse.status === 404) {
        // 检查是否是URL编码问题
        if (finalAudioUrl !== audioUrlToFetch) {
          throw new Error(`音频文件不存在 (404): 音频URL可能已过期、无效或存在编码问题。请重新生成${language === 'zh' ? '中文' : '英文'}音频。\n原始URL: ${finalAudioUrl.substring(0, 100)}...`);
        } else {
          throw new Error(`音频文件不存在 (404): 音频URL可能已过期或无效。请重新生成${language === 'zh' ? '中文' : '英文'}音频。\nURL: ${finalAudioUrl.substring(0, 100)}...`);
        }
      } else {
        throw new Error(`下载${language === 'zh' ? '中文' : '英文'}音频失败 (${audioResponse.status}): ${audioResponse.statusText}`);
      }
    }
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    await fs.writeFile(tempAudioPath, audioBuffer);
    console.log('✅ 音频下载完成，大小:', audioBuffer.length, 'bytes');
    
    // 获取音频时长
    const audioDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempAudioPath, (err, metadata) => {
        if (err) {
          console.error('❌ 获取音频时长失败:', err);
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          console.log('✅ 音频时长:', duration, '秒');
          resolve(duration);
        }
      });
    });
    
    const audioDurationSeconds = Math.ceil(audioDuration);
    console.log('📊 音频总时长:', audioDurationSeconds, '秒');
    sendProgress('正在生成字幕文件', 30);
    
    // 使用腾讯云ASR生成字幕文件（基于音频URL）
    // 确保音频URL是HTTPS格式
    let audioUrlForASR = finalAudioUrl;
    if (audioUrlForASR.startsWith('http://')) {
      audioUrlForASR = audioUrlForASR.replace('http://', 'https://');
    }
    
    console.log('🎤 使用音频URL生成字幕:', audioUrlForASR);
    tempSubtitlePath = await generateSubtitleFile(
      audioUrlForASR,
      language,
      tempDir,
      contentId,
      timestamp
    );
    sendProgress('字幕生成完成', 40);
    
    // 下载博客封面图
    console.log('📥 开始下载博客封面图:', blogCoverUrl);
    let coverImageResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      coverImageResponse = await fetch(blogCoverUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      throw new Error(`下载博客封面图失败: ${fetchError.message}`);
    }
    
    if (!coverImageResponse.ok) {
      throw new Error(`下载博客封面图失败 (${coverImageResponse.status}): ${coverImageResponse.statusText}`);
    }
    
    const coverImageBuffer = Buffer.from(await coverImageResponse.arrayBuffer());
    const coverImagePath = path.join(tempDir, `cover_${contentId}_${timestamp}.jpg`);
    await fs.writeFile(coverImagePath, coverImageBuffer);
    console.log('✅ 博客封面图保存完成');
    sendProgress('封面图下载完成', 50);
    
    // 视频参数（9:16比例，720x1280）
    const videoWidth = 720;
    const videoHeight = 1280;
    const fps = 30;
    
    // 使用ffmpeg将博客封面图转换为视频（静态图片，匹配音频时长）
    tempVideoPath = path.join(tempDir, `video_${contentId}_${timestamp}.mp4`);
    console.log('🎞️ 开始生成视频（使用博客封面图）');
    sendProgress('正在生成视频', 55);
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000; // 5分钟超时
      
      // 使用ffmpeg将封面图转换为视频（循环播放以匹配音频时长）
      const ffmpegProcess = ffmpeg()
        .input(coverImagePath)
        .inputOptions([
          '-loop', '1',
          '-t', audioDurationSeconds.toString()
        ])
        .complexFilter([
          // 缩放封面图到目标尺寸（保持宽高比，居中）
          `[0:v]scale=${videoWidth}:${videoHeight}:force_original_aspect_ratio=decrease,pad=${videoWidth}:${videoHeight}:(ow-iw)/2:(oh-ih)/2:black[out]`
        ])
        .outputOptions([
          '-map', '[out]',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-r', fps.toString(),
          '-t', audioDurationSeconds.toString()
        ])
        .output(tempVideoPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg视频生成命令:', commandLine);
          timeoutId = setTimeout(() => {
            console.error('❌ 视频生成超时（5分钟）');
            ffmpegProcess.kill('SIGKILL');
            reject(new Error('视频生成超时，请重试'));
          }, timeout);
        })
        .on('end', () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('✅ 视频生成完成');
          resolve(null);
        })
        .on('error', (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ FFmpeg视频生成失败:', err);
          reject(err);
        })
        .on('stderr', (stderrLine) => {
          // 输出ffmpeg的进度信息
          if (stderrLine.includes('time=')) {
            console.log('📊 FFmpeg进度:', stderrLine.trim());
          }
        })
        .run();
    });
    
    // 合并视频和音频（如果有字幕则嵌入字幕）
    tempOutputPath = path.join(tempDir, `output_${contentId}_${language}_${timestamp}.mp4`);
    console.log('🎞️ 开始合并视频和音频' + (tempSubtitlePath ? '（包含字幕）' : ''));
    sendProgress('正在合并视频和音频', 75);
    
    // 如果有字幕文件，先验证文件是否存在
    if (tempSubtitlePath) {
      try {
        await fs.access(tempSubtitlePath);
        const stats = await fs.stat(tempSubtitlePath);
        console.log('✅ 字幕文件存在，路径:', tempSubtitlePath);
        console.log('✅ 字幕文件大小:', stats.size, '字节');
      } catch (accessError) {
        console.error('❌ 字幕文件不存在或无法访问:', tempSubtitlePath);
        console.error('❌ 错误详情:', accessError.message);
        throw new Error(`字幕文件不存在: ${tempSubtitlePath}`);
      }
    }
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000; // 5分钟超时
      
      let ffmpegProcess = ffmpeg()
        .input(tempVideoPath)
        .input(tempAudioPath);
      
      // 如果有字幕文件，添加字幕滤镜
      if (tempSubtitlePath) {
        console.log('📝 添加字幕到视频:', tempSubtitlePath);
        const escapedSubtitlePath = escapeSubtitlePath(tempSubtitlePath);
        console.log('📝 转义后的字幕路径:', escapedSubtitlePath);
        
        ffmpegProcess = ffmpegProcess
          .complexFilter([
            // 缩放视频
            `[0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black[v]`,
            // 添加字幕（硬字幕，烧录到视频帧上）
            // 显式指定输入编码为UTF-8，确保中文字幕正确显示
            // 字幕文件已使用UTF-8 BOM编码，但显式指定charenc参数更可靠
            // 字幕样式：去掉阴影，边框变细，位置居中（底部），确保在屏幕内
            // Outline=1：细边框
            // Shadow=0：无阴影效果
            // Alignment=2：底部居中
            // WrapStyle=0：智能换行，确保长文本自动换行不超出屏幕
            // MarginL=20,MarginR=20：左右边距，确保字幕不超出屏幕边界
            // MarginV=150：垂直边距，确保字幕在屏幕底部可见区域内
            `[v]subtitles='${escapedSubtitlePath}':charenc=UTF-8:force_style='FontSize=8,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=1,Shadow=0,Alignment=2,MarginV=150,MarginL=20,MarginR=20,WrapStyle=0'[outv]`
          ])
          .outputOptions([
            '-map', '[outv]',
            '-map', '1:a',  // 映射音频流（第二个输入文件的音频）
            '-c:v libx264',
            '-preset medium',
            '-crf 23',
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-b:a 128k',
            '-shortest'
          ]);
      } else {
        ffmpegProcess = ffmpegProcess.outputOptions([
          '-c:v copy',
          '-c:a aac',
          '-shortest'
        ]);
      }
      
      ffmpegProcess = ffmpegProcess.output(tempOutputPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg合并命令:', commandLine);
          timeoutId = setTimeout(() => {
            console.error('❌ 视频合并超时（5分钟）');
            ffmpegProcess.kill('SIGKILL');
            reject(new Error('视频合并超时，请重试'));
          }, timeout);
        })
        .on('end', () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('✅ 视频合并完成');
          sendProgress('视频合并完成', 85);
          resolve(null);
        })
        .on('error', (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ FFmpeg合并失败:', err);
          // 如果copy失败，尝试重新编码
          if (err.message && err.message.includes('copy')) {
            console.log('⚠️ 视频流复制失败，尝试重新编码...');
            sendProgress('视频流复制失败，尝试重新编码', 80);
            let fallbackProcess = ffmpeg()
              .input(tempVideoPath)
              .input(tempAudioPath);
            
            // 如果有字幕，添加字幕滤镜
            if (tempSubtitlePath) {
              fallbackProcess = fallbackProcess
                .complexFilter([
                  `[0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black[v]`,
                  `[v]subtitles='${escapeSubtitlePath(tempSubtitlePath)}':charenc=UTF-8:force_style='FontSize=8,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=1,Shadow=0,Alignment=2,MarginV=150,MarginL=20,MarginR=20,WrapStyle=0'[outv]`
                ])
                .outputOptions([
                  '-map', '[outv]',
                  '-map', '1:a',  // 映射音频流（第二个输入文件的音频）
                  '-c:v libx264',
                  '-preset ultrafast',
                  '-crf 23',
                  '-pix_fmt yuv420p',
                  '-c:a aac',
                  '-shortest'
                ]);
            } else {
              fallbackProcess = fallbackProcess.outputOptions([
                '-c:v libx264',
                '-preset ultrafast',
                '-crf 23',
                '-pix_fmt yuv420p',
                '-s 720x1280', // 强制9:16竖屏分辨率
                '-aspect 9:16', // 设置宽高比
                '-c:a aac',
                '-shortest'
              ]);
            }
            
            fallbackProcess = fallbackProcess.output(tempOutputPath)
              .on('end', () => {
                console.log('✅ 视频合并完成（使用重新编码）');
                sendProgress('视频合并完成', 85);
                resolve(null);
              })
              .on('error', (fallbackErr) => {
                console.error('❌ 重新编码也失败:', fallbackErr);
                reject(fallbackErr);
              })
              .run();
          } else {
            reject(err);
          }
        })
        .run();
    });
    
    // 上传合并后的视频到LeanCloud
    sendProgress('正在上传视频', 90);
    const outputBuffer = await fs.readFile(tempOutputPath);
    const videoFile = new AV.File(`video_${contentId}_${language}_${timestamp}.mp4`, outputBuffer, 'video/mp4');
    await videoFile.save();
    const finalVideoUrl = videoFile.url();
    console.log('✅ 视频上传成功，URL:', finalVideoUrl);
    sendProgress('视频上传完成', 95);
    
    // 更新ExtractedContent记录
    if (language === 'en') {
      contentObj.set('videoUrlEn', finalVideoUrl);
    } else {
      contentObj.set('videoUrl', finalVideoUrl);
    }
    contentObj.set('videoStatus', 'completed');
    await contentObj.save();
    
    // 清理临时文件（包括字幕文件）
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath, tempSubtitlePath].filter(Boolean);
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('⚠️ 清理临时文件失败:', cleanupError.message);
      }
    }
    
    // 清理视频帧目录
    try {
      const framesFiles = await fs.readdir(framesDir);
      for (const file of framesFiles) {
        await fs.unlink(path.join(framesDir, file));
      }
      await fs.rmdir(framesDir);
    } catch (cleanupError) {
      console.warn('⚠️ 清理视频帧目录失败:', cleanupError.message);
    }
    
    // 根据语言返回相应的字段
    const responseData = {
      contentId: contentId,
      language: language
    };
    
    if (language === 'en') {
      responseData.videoUrlEn = finalVideoUrl;
    } else {
      responseData.videoUrl = finalVideoUrl;
    }
    
    // 发送完成消息
    cleanup();
    sendProgress('视频生成完成', 100);
    
    if (useSSE) {
      // SSE格式响应
      const finalData = JSON.stringify({ success: true, data: responseData, completed: true });
      res.write(`data: ${finalData}\n\n`);
      res.end();
    } else {
      // JSON格式响应（兼容模式）
      res.json({
        success: true,
        data: responseData
      });
    }
  } catch (error) {
    cleanup();
    console.error('❌ 生成视频失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    console.error('❌ 错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('❌ ContentId:', req.params.contentId);
    console.error('❌ AudioUrl:', req.body.audioUrl);
    console.error('❌ Language:', req.body.language);
    
    // 清理临时文件（包括字幕文件）
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath, tempSubtitlePath].filter(Boolean);
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('⚠️ 清理临时文件失败:', cleanupError.message);
      }
    }
    
    // 如果响应还没有发送，发送错误响应
    if (!res.headersSent) {
      // 确保错误响应也包含CORS头
      const origin = req.headers.origin;
      if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      
      // 更新状态为失败
      try {
        const content = await new AV.Query('ExtractedContent').get(req.params.contentId);
        if (content) {
          content.set('videoStatus', 'failed');
          await content.save();
        }
      } catch (updateError) {
        console.error('❌ 更新内容状态失败:', updateError);
      }

      // 发送错误消息（SSE格式）
      let errorMessage = '生成视频失败';
      let errorSuggestion = '';
      
      // 检查是否是网络错误
      if (error.message && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT') || error.message.includes('下载'))) {
        errorMessage = '下载视频或音频文件失败，请检查网络连接';
        errorSuggestion = '请检查silentVideoUrl和audioUrl是否可访问';
      } else if (error.message && (error.message.includes('FFmpeg') || error.message.includes('合并') || error.message.includes('超时'))) {
        errorMessage = '视频处理失败';
        errorSuggestion = '请检查FFmpeg是否正确安装，或重试';
      }

      // 发送错误消息
      const errorResponse = {
        success: false,
        message: errorMessage,
        error: error.message || String(error),
        suggestion: errorSuggestion,
        contentId: req.params.contentId
      };
      
      // 在开发环境下返回更多调试信息
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        errorResponse.stack = error.stack;
        errorResponse.details = JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      if (useSSE) {
        // SSE格式响应
        errorResponse.completed = true;
        const errorData = JSON.stringify(errorResponse);
        res.write(`data: ${errorData}\n\n`);
        res.end();
      } else {
        // JSON格式响应（兼容模式）
        res.status(500).json(errorResponse);
      }
    } else {
      console.error('❌ 响应已发送，无法发送错误响应');
    }
  }
});


// 使用文生视频API生成视频（原有逻辑）
async function generateVideoWithTextToVideo(req, res, contentId, audioUrl) {
  let tempVideoPath = null;
  let tempAudioPath = null;
  let tempOutputPath = null;
  
  try {
    // 获取内容信息
    const contentObj = await new AV.Query('ExtractedContent').get(contentId);
    if (!contentObj) {
      return res.status(404).json({
        success: false,
        message: '内容不存在'
      });
    }

    const textContent = contentObj.get('summary') || contentObj.get('chapterTitle') || '';
    if (!textContent) {
      return res.status(400).json({
        success: false,
        message: '内容文本为空，无法生成视频'
      });
    }

    // 更新状态为生成中
    contentObj.set('videoStatus', 'generating');
    await contentObj.save();

    console.log('📝 开始根据文字生成视频，文本:', textContent.substring(0, 50) + '...');

    // 验证Doubao API配置
    console.log('🔑 Doubao API Key:', DOUBAO_API_KEY ? `${DOUBAO_API_KEY.substring(0, 20)}...` : '未设置');
    console.log('🔑 Doubao Model ID:', DOUBAO_MODEL_ID);
    if (!DOUBAO_API_KEY) {
      throw new Error('Doubao API Key未配置，请设置ARK_API_KEY或DOUBAO_API_KEY环境变量');
    }

    // 步骤1: 先获取音频时长，以便计算需要生成多少段视频
    console.log('📥 步骤1: 获取音频时长');
    let finalAudioUrl = audioUrl;
    if (finalAudioUrl.startsWith('http://')) {
      finalAudioUrl = finalAudioUrl.replace('http://', 'https://');
    }
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    tempAudioPath = path.join(tempDir, `audio_${contentId}_${timestamp}.mp3`);
    
    // 下载音频文件
    const audioResponse = await fetch(finalAudioUrl);
    if (!audioResponse.ok) {
      throw new Error(`下载音频失败: ${audioResponse.statusText}`);
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    await fs.writeFile(tempAudioPath, audioBuffer);
    console.log('✅ 音频下载完成，大小:', audioBuffer.length, 'bytes');
    
    // 使用ffmpeg获取音频时长
    const audioDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempAudioPath, (err, metadata) => {
        if (err) {
          console.error('❌ 获取音频时长失败:', err);
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          console.log('✅ 音频时长:', duration, '秒');
          resolve(duration);
        }
      });
    });
    
    const audioDurationSeconds = Math.ceil(audioDuration);
    console.log('📊 音频总时长:', audioDurationSeconds, '秒');
    
    // 计算需要生成多少段视频（每段5秒）
    const videoSegmentDuration = 5; // 每段视频5秒
    const numSegments = Math.ceil(audioDurationSeconds / videoSegmentDuration);
    console.log('📊 需要生成', numSegments, '段视频（每段', videoSegmentDuration, '秒）');
    
    // 将文本分段（简单平均分段）
    const textLength = textContent.length;
    const segmentTextLength = Math.ceil(textLength / numSegments);
    const textSegments = [];
    for (let i = 0; i < numSegments; i++) {
      const start = i * segmentTextLength;
      const end = Math.min(start + segmentTextLength, textLength);
      textSegments.push(textContent.substring(start, end));
    }
    console.log('📊 文本已分为', textSegments.length, '段');
    
    // 步骤2: 生成多段视频
    console.log('🎬 步骤2: 开始生成多段视频');
    const videoSegmentUrls = [];
    const tempVideoSegmentPaths = [];
    
    // Doubao API需要的请求头
    // 根据volcengine API文档，使用API Key鉴权
    // 根据volcengine常见做法，使用 Authorization: Bearer {API_KEY} 格式
    const videoRequestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_API_KEY}`
    };
    
    // 判断是否是中文视频（如果存在中文音频URL，则为中文视频）
    const isChineseVideo = !!contentObj.get('audioUrl');
    
    // 辅助函数：生成单段视频
    const generateVideoSegment = async (segmentText, segmentIndex) => {
      // 根据Doubao API格式构建请求体
      // 文生视频：使用text类型，在text中包含提示词和参数
      // 参数格式：--ratio 9:16 --dur {duration}
      // --ratio 9:16 表示9:16竖屏比例（强制限制）
      // --dur 指定视频时长（秒）
      // 明确指定动漫风格，色彩鲜艳
      const styleText = '，动漫风格，色彩鲜艳';
      const promptWithParams = `${segmentText}${styleText} --ratio 9:16 --dur ${videoSegmentDuration}`;
      
      const textToVideoRequestBody = {
        model: DOUBAO_MODEL_ID, // Doubao模型ID或Endpoint ID
        content: [
          {
            type: 'text',
            text: promptWithParams
          }
        ],
        generate_audio: false // 明确指定生成无声视频
      };
      
      console.log(`📤 第 ${segmentIndex + 1}/${numSegments} 段视频请求（Doubao API）:`, JSON.stringify(textToVideoRequestBody, null, 2));
      
      const textToVideoResponse = await fetch(DOUBAO_TEXT_TO_VIDEO_URL, {
        method: 'POST',
        headers: videoRequestHeaders,
        body: JSON.stringify(textToVideoRequestBody)
      });
      
      if (!textToVideoResponse.ok) {
        const errorText = await textToVideoResponse.text();
        console.error(`❌ Doubao API失败:`);
        console.error(`   状态码:`, textToVideoResponse.status);
        console.error(`   状态文本:`, textToVideoResponse.statusText);
        console.error(`   错误响应:`, errorText);
        console.error(`   请求URL:`, DOUBAO_TEXT_TO_VIDEO_URL);
        console.error(`   请求头:`, JSON.stringify(videoRequestHeaders, null, 2));
        console.error(`   请求体:`, JSON.stringify(textToVideoRequestBody, null, 2));
        throw new Error(`Doubao文生视频API失败: ${textToVideoResponse.status} ${textToVideoResponse.statusText} - ${errorText}`);
      }
      
      const textToVideoData = await textToVideoResponse.json();
      console.log(`✅ 第 ${segmentIndex + 1}/${numSegments} 段视频API响应（Doubao）:`, JSON.stringify(textToVideoData, null, 2));
      
      // Doubao API返回任务ID（id字段）
      const taskId = textToVideoData.id;
      
      if (!taskId) {
        console.error('❌ Doubao API响应格式不符合预期:', JSON.stringify(textToVideoData, null, 2));
        throw new Error('Doubao文生视频响应格式错误，未找到任务ID');
      }
      
      console.log(`⏳ 开始轮询第 ${segmentIndex + 1}/${numSegments} 段视频，task_id:`, taskId);
      
      // 轮询获取视频URL（增加超时时间，视频生成可能需要更长时间）
      const maxAttempts = 120; // 增加到120次（10分钟）
      const pollInterval = 5000; // 每5秒查询一次
      let attempts = 0;
      let taskStatus = 'queued';
      let segmentVideoUrl = null;
      
      while (attempts < maxAttempts && taskStatus !== 'succeeded' && taskStatus !== 'failed' && taskStatus !== 'expired' && taskStatus !== 'cancelled') {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
        
        // 查询任务状态：GET /api/v3/contents/generations/tasks/{id}
        const statusUrl = `${DOUBAO_TASK_STATUS_URL}/${taskId}`;
        
        // 添加重试机制和超时控制
        let statusResponse = null;
        let retryCount = 0;
        const maxRetries = 3;
        const fetchTimeout = 30000; // 30秒超时
        
        while (retryCount < maxRetries) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);
            
            statusResponse = await fetch(statusUrl, {
              method: 'GET',
              headers: videoRequestHeaders,
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            break; // 成功，退出重试循环
          } catch (fetchError) {
            retryCount++;
            if (retryCount >= maxRetries) {
              console.error(`❌ 查询任务状态失败（已重试${maxRetries}次）:`, fetchError.message);
              throw new Error(`查询任务状态失败: ${fetchError.message}`);
            }
            console.warn(`⚠️ 查询任务状态失败，${retryCount}/${maxRetries}次重试...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
          }
        }
        
        if (!statusResponse || !statusResponse.ok) {
          const errorText = statusResponse ? await statusResponse.text() : '无响应';
          throw new Error(`查询任务状态失败: ${statusResponse?.statusText || '网络错误'} - ${errorText}`);
        }
        
        const statusData = await statusResponse.json();
        taskStatus = statusData.status;
        
        console.log(`📊 第 ${segmentIndex + 1}/${numSegments} 段视频任务状态（第${attempts}次查询）:`, taskStatus);
        
        if (taskStatus === 'succeeded') {
          // 任务成功，获取视频URL
          segmentVideoUrl = statusData.content?.video_url;
          if (!segmentVideoUrl) {
            throw new Error('任务完成但未找到视频URL');
          }
          console.log(`✅ 第 ${segmentIndex + 1}/${numSegments} 段视频生成完成，URL:`, segmentVideoUrl);
          break;
        } else if (taskStatus === 'failed' || taskStatus === 'expired' || taskStatus === 'cancelled') {
          const errorMsg = statusData.error?.message || statusData.error?.code || '任务失败';
          const errorCode = statusData.error?.code || '';
          
          // 特殊处理敏感内容错误
          if (errorMsg.includes('sensitive') || errorMsg.includes('敏感') || errorCode.includes('sensitive')) {
            console.error(`❌ 第 ${segmentIndex + 1}/${numSegments} 段视频生成失败（内容安全检测）:`, errorMsg);
            throw new Error(`视频生成失败：内容可能包含敏感信息，请尝试修改文本内容后重试。错误详情: ${errorMsg}`);
          }
          
          console.error(`❌ 第 ${segmentIndex + 1}/${numSegments} 段视频生成失败:`, errorMsg);
          throw new Error(`视频生成任务失败: ${errorMsg}`);
        }
        
        // 继续等待：queued 或 running 状态
        console.log(`⏳ 第 ${segmentIndex + 1}/${numSegments} 段视频任务状态: ${taskStatus}，继续等待...`);
      }
      
      if (!segmentVideoUrl) {
        throw new Error(`视频生成超时或失败，任务状态: ${taskStatus}`);
      }
      
      return segmentVideoUrl;
    };
    
    // 生成所有视频段（可以并行，但为了控制API调用频率，这里串行执行）
    for (let i = 0; i < numSegments; i++) {
      console.log(`📹 生成第 ${i + 1}/${numSegments} 段视频...`);
      const segmentVideoUrl = await generateVideoSegment(textSegments[i], i);
      videoSegmentUrls.push(segmentVideoUrl);
    }
    
    console.log('✅ 所有视频段生成完成，共', videoSegmentUrls.length, '段');
    
    // 步骤3: 下载所有视频段
    console.log('📥 步骤3: 下载所有视频段');
    for (let i = 0; i < videoSegmentUrls.length; i++) {
      const segmentUrl = videoSegmentUrls[i];
      const segmentPath = path.join(tempDir, `video_segment_${contentId}_${timestamp}_${i}.mp4`);
      tempVideoSegmentPaths.push(segmentPath);
      
      console.log(`📥 下载第 ${i + 1}/${videoSegmentUrls.length} 段视频:`, segmentUrl);
      const segmentResponse = await fetch(segmentUrl);
      if (!segmentResponse.ok) {
        throw new Error(`下载视频段失败: ${segmentResponse.statusText}`);
      }
      const segmentBuffer = Buffer.from(await segmentResponse.arrayBuffer());
      await fs.writeFile(segmentPath, segmentBuffer);
      console.log(`✅ 第 ${i + 1}/${videoSegmentUrls.length} 段视频下载完成，大小:`, segmentBuffer.length, 'bytes');
    }
    
    // 步骤4: 使用ffmpeg拼接所有视频段
    console.log('🎞️ 步骤4: 拼接所有视频段');
    const concatenatedVideoPath = path.join(tempDir, `concatenated_${contentId}_${timestamp}.mp4`);
    
    // 创建ffmpeg concat文件
    const concatFilePath = path.join(tempDir, `concat_${contentId}_${timestamp}.txt`);
    const concatFileContent = tempVideoSegmentPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    await fs.writeFile(concatFilePath, concatFileContent);
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000; // 5分钟超时
      
      const ffmpegProcess = ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c:v copy', // 复制视频流，不重新编码（大幅加快速度）
          '-c:a copy' // 复制音频流（如果存在）
        ])
        .output(concatenatedVideoPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg拼接命令:', commandLine);
          // 设置超时
          timeoutId = setTimeout(() => {
            console.error('❌ 视频段拼接超时（5分钟）');
            ffmpegProcess.kill('SIGKILL');
            reject(new Error('视频段拼接超时，请重试'));
          }, timeout);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`📊 拼接进度: ${Math.floor(progress.percent)}%`);
          } else if (progress.timemark) {
            console.log(`📊 拼接进度: ${progress.timemark}`);
          }
        })
        .on('end', () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('✅ 视频段拼接完成');
          resolve(null);
        })
        .on('error', (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ 视频段拼接失败:', err);
          // 如果copy失败，尝试重新编码
          if (err.message && err.message.includes('copy')) {
            console.log('⚠️ 视频流复制失败，尝试重新编码...');
            const fallbackProcess = ffmpeg()
              .input(concatFilePath)
              .inputOptions(['-f', 'concat', '-safe', '0'])
              .outputOptions([
                '-c:v libx264',
                '-preset ultrafast', // 使用最快预设
                '-crf 23',
                '-pix_fmt yuv420p',
                '-s 720x1280' // 720P竖屏分辨率（低分辨率）
              ])
              .output(concatenatedVideoPath)
              .on('end', () => {
                console.log('✅ 视频段拼接完成（使用重新编码）');
                resolve(null);
              })
              .on('error', (fallbackErr) => {
                console.error('❌ 重新编码也失败:', fallbackErr);
                reject(fallbackErr);
              })
              .run();
          } else {
            reject(err);
          }
        })
        .run();
    });
    
    // 清理concat文件
    try {
      await fs.unlink(concatFilePath);
    } catch (e) {
      console.warn('⚠️ 清理concat文件失败:', e);
    }
    
    // 更新tempVideoPath为拼接后的视频
    tempVideoPath = concatenatedVideoPath;
    
    // 步骤5: 使用ffmpeg合并音频和视频
    console.log('🎞️ 步骤5: 合并音频和视频');
    tempOutputPath = path.join(tempDir, `output_${contentId}_${timestamp}.mp4`);
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000; // 5分钟超时
      
      const ffmpegProcess = ffmpeg(tempVideoPath)
        .input(tempAudioPath)
        .outputOptions([
          '-c:v copy', // 复制视频流，不重新编码（大幅加快速度，输入视频应该已经是9:16）
          '-c:a aac', // 音频编码为AAC
          '-b:a 128k', // 音频比特率
          '-shortest', // 以较短的流为准
          '-movflags +faststart' // 优化web播放
        ])
        .output(tempOutputPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg合并命令:', commandLine);
          // 设置超时
          timeoutId = setTimeout(() => {
            console.error('❌ 视频合并超时（5分钟）');
            ffmpegProcess.kill('SIGKILL');
            reject(new Error('视频合并超时，请重试'));
          }, timeout);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`📊 合并进度: ${Math.floor(progress.percent)}%`);
          } else if (progress.timemark) {
            console.log(`📊 合并进度: ${progress.timemark}`);
          }
        })
        .on('end', () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('✅ 视频合并完成');
          resolve(null);
        })
        .on('error', (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ 视频合并失败:', err);
          // 如果copy失败，尝试重新编码
          if (err.message && err.message.includes('copy')) {
            console.log('⚠️ 视频流复制失败，尝试重新编码...');
            // 使用重新编码作为备选方案
            const fallbackProcess = ffmpeg(tempVideoPath)
              .input(tempAudioPath)
              .outputOptions([
                '-c:v libx264',
                '-preset ultrafast', // 使用最快预设
                '-crf 23',
                '-pix_fmt yuv420p',
                '-s 720x1280', // 强制9:16竖屏分辨率
                '-aspect 9:16', // 设置宽高比
                '-c:a aac',
                '-b:a 128k',
                '-shortest',
                '-movflags +faststart'
              ])
              .output(tempOutputPath)
              .on('end', () => {
                console.log('✅ 视频合并完成（使用重新编码）');
                resolve(null);
              })
              .on('error', (fallbackErr) => {
                console.error('❌ 重新编码也失败:', fallbackErr);
                reject(fallbackErr);
              })
              .run();
          } else {
            reject(err);
          }
        })
        .run();
    });
    
    // 清理视频段文件
    for (const segmentPath of tempVideoSegmentPaths) {
      try {
        await fs.unlink(segmentPath);
      } catch (e) {
        console.warn('⚠️ 清理视频段文件失败:', e);
      }
    }
    
    // 清理拼接后的视频文件
    try {
      await fs.unlink(concatenatedVideoPath);
    } catch (e) {
      console.warn('⚠️ 清理拼接视频文件失败:', e);
    }

    // 步骤4: 上传合并后的视频到LeanCloud
    console.log('📤 步骤4: 上传合并后的视频');
    const outputVideoBuffer = await fs.readFile(tempOutputPath);
    const videoFileName = `video_${contentId}_${timestamp}.mp4`;
    const videoFile = new AV.File(videoFileName, outputVideoBuffer, 'video/mp4');
    await videoFile.save();
    const finalVideoUrl = videoFile.url();
    console.log('✅ 视频上传成功，URL:', finalVideoUrl);

    // 更新内容记录
    contentObj.set('videoStatus', 'completed');
    contentObj.set('videoUrl', finalVideoUrl);
    await contentObj.save();

    // 清理临时文件
    try {
      await fs.unlink(tempVideoPath);
      await fs.unlink(tempAudioPath);
      await fs.unlink(tempOutputPath);
      console.log('✅ 临时文件已清理');
    } catch (cleanupError) {
      console.warn('⚠️ 清理临时文件失败:', cleanupError.message);
    }

    res.json({
      success: true,
      data: {
        videoUrl: finalVideoUrl,
        contentId: contentId
      }
    });
  } catch (error) {
    console.error('生成视频失败:', error);
    
    // 清理临时文件
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath].filter(Boolean);
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('⚠️ 清理临时文件失败:', cleanupError.message);
      }
    }
    
    // 更新状态为失败
    try {
      const content = await new AV.Query('ExtractedContent').get(req.params.contentId);
      if (content) {
        content.set('videoStatus', 'failed');
        await content.save();
      }
    } catch (updateError) {
      console.error('更新内容状态失败:', updateError);
    }

    res.status(500).json({
      success: false,
      message: '生成视频失败',
      error: error.message
    });
  }
}

// 生成数字人形象图片（使用阿里通义万相）
router.post('/content/:contentId/generate-avatar', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { avatarDescription } = req.body;

    if (!avatarDescription) {
      return res.status(400).json({
        success: false,
        message: '缺少形象描述'
      });
    }

    // 调用阿里通义万相生成图像
    const prompt = `生成一个专业讲解视频的数字人形象：${avatarDescription}，要求：正面照，清晰的面部特征，专业形象，适合用于视频讲解`;
    
    console.log('🎨 调用阿里通义万相生成图像，prompt:', prompt);
    
    // 注意：wan2.6-image需要图片输入，不支持纯文本生成
    // 这里使用Deepseek生成图片描述，然后使用预定义的数字人形象图片
    // 或者可以集成其他支持文本生成图片的服务（如Stable Diffusion API）
    
    console.log('🎨 生成数字人形象，描述:', avatarDescription);
    
    // 方案1: 使用Deepseek生成更详细的图片描述，然后使用图片生成服务
    // 方案2: 使用预定义的数字人形象图片库（根据描述选择）
    // 方案3: 暂时使用占位符图片，后续可以集成其他图片生成API
    
    // 根据描述选择合适的预定义图片
    // 这里简化处理，使用一个通用的专业形象图片
    // 实际应用中可以：
    // 1. 使用Deepseek生成图片描述
    // 2. 调用支持文本生成图片的API（如Stable Diffusion、Midjourney等）
    // 3. 或使用预定义的数字人形象图片库
    
    const avatarImageUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face';
    
    console.log('✅ 使用预定义数字人形象图片:', avatarImageUrl);

    // 更新内容记录
    const content = await new AV.Query('ExtractedContent').get(contentId);
    if (content) {
      content.set('avatarImageUrl', avatarImageUrl);
      await content.save();
    }

    res.json({
      success: true,
      data: {
        avatarImageUrl: avatarImageUrl,
        contentId: contentId
      }
    });
  } catch (error) {
    console.error('生成数字人形象失败:', error);
    res.status(500).json({
      success: false,
      message: '生成数字人形象失败',
      error: error.message
    });
  }
});

// 为已有内容生成英文翻译（使用Master Key绕过ACL）
// 注意：这个路由必须在 /:bookId/contents 之前定义，避免路由冲突
router.post('/content/:contentId/translate', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    // 获取内容对象
    const contentObj = await new AV.Query('ExtractedContent').get(contentId);
    if (!contentObj) {
      return res.status(404).json({
        success: false,
        message: '内容不存在'
      });
    }
    
    const chapterTitle = contentObj.get('chapterTitle');
    const summary = contentObj.get('summary');
    
    let chapterTitleEn = contentObj.get('chapterTitleEn') || '';
    let summaryEn = contentObj.get('summaryEn') || '';
    
    // 翻译标题
    if ((!chapterTitleEn || chapterTitleEn.trim() === '') && chapterTitle) {
      console.log(`🌐 [手动翻译] 章节标题: ${chapterTitle}`);
      try {
        const translateTitleResponse = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'user',
                content: `请将以下中文章节标题翻译成英文，只返回英文翻译，不要添加任何其他内容：\n${chapterTitle}`
              }
            ],
            temperature: 0.3,
            max_tokens: 100
          })
        });
        
        if (translateTitleResponse.ok) {
          const translateTitleData = await translateTitleResponse.json();
          chapterTitleEn = translateTitleData.choices[0]?.message?.content?.trim() || '';
          if (chapterTitleEn) {
            console.log(`✅ [手动翻译完成] 标题: ${chapterTitleEn}`);
          }
        }
      } catch (error) {
        console.error('❌ [手动翻译失败] 标题:', error.message);
      }
    }
    
    // 翻译摘要
    if ((!summaryEn || summaryEn.trim() === '') && summary) {
      console.log(`🌐 [手动翻译] 摘要: ${summary.substring(0, 50)}...`);
      try {
        const translateSummaryResponse = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'user',
                content: `请将以下中文内容摘要完整翻译成英文，保持所有细节，不要限制字数，只返回英文翻译，不要添加任何其他内容：\n${summary}`
              }
            ],
            temperature: 0.3,
            max_tokens: 1000
          })
        });
        
        if (translateSummaryResponse.ok) {
          const translateSummaryData = await translateSummaryResponse.json();
          summaryEn = translateSummaryData.choices[0]?.message?.content?.trim() || '';
          if (summaryEn) {
            // 保持完整，不限制字数
            console.log(`✅ [手动翻译完成] 摘要: ${summaryEn.substring(0, 100)}... (总长度: ${summaryEn.length}字符)`);
          }
        }
      } catch (error) {
        console.error('❌ [手动翻译失败] 摘要:', error.message);
      }
    }
    
    // 保存翻译结果
    AV.Cloud.useMasterKey();
    if (chapterTitleEn) contentObj.set('chapterTitleEn', chapterTitleEn);
    if (summaryEn) contentObj.set('summaryEn', summaryEn);
    await contentObj.save();
    
    res.json({
      success: true,
      message: '翻译完成',
      data: {
        chapterTitleEn,
        summaryEn
      }
    });
  } catch (error) {
    console.error('翻译内容失败:', error);
    res.status(500).json({
      success: false,
      message: '翻译内容失败',
      error: error.message
    });
  }
});

// 生成英文视频（一键生成：翻译+英文音频+合并视频）
router.post('/content/:contentId/generate-english-video', async (req, res) => {
  // 立即设置CORS头，确保长时间运行的请求也能正确返回CORS响应
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // 检测前端是否支持SSE（通过Accept头或useSSE参数）
  const acceptHeader = req.headers.accept || '';
  const useSSE = req.query.useSSE === 'true' || req.body.useSSE === true || acceptHeader.includes('text/event-stream');
  
  let sendProgress, cleanup, heartbeatInterval;
  
  if (useSSE) {
    // 设置流式响应头（Server-Sent Events），用于保持连接活跃并发送进度更新
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');
    res.header('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
    
    // 发送进度更新的辅助函数
    sendProgress = (message, progress = null) => {
      try {
        const data = JSON.stringify({ message, progress, timestamp: Date.now() });
        res.write(`data: ${data}\n\n`);
        console.log(`📊 进度更新: ${message}${progress !== null ? ` (${progress}%)` : ''}`);
      } catch (err) {
        console.error('❌ 发送进度更新失败:', err);
      }
    };
    
    // 发送心跳以保持连接活跃（每30秒发送一次）
    heartbeatInterval = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
    
    // 清理函数
    cleanup = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  } else {
    // 兼容模式：使用JSON响应，但仍然发送进度更新（通过日志）
    res.header('Content-Type', 'application/json');
    sendProgress = (message, progress = null) => {
      console.log(`📊 进度更新: ${message}${progress !== null ? ` (${progress}%)` : ''}`);
    };
    cleanup = () => {};
    console.log('⚠️ 前端不支持SSE，使用JSON响应模式（兼容模式）');
  }
  
  let tempVideoPath = null;
  let tempAudioPath = null;
  let tempOutputPath = null;
  let tempSubtitlePath = null;
  
  try {
    const { contentId } = req.params;
    
    console.log('🚀 ========== 生成英文视频API被调用 ==========');
    console.log('🌐 Origin:', origin);
    console.log('📥 contentId:', contentId);
    
    sendProgress('开始处理英文视频生成请求', 0);
    
    // 获取内容对象
    const contentObj = await new AV.Query('ExtractedContent').get(contentId);
    if (!contentObj) {
      return res.status(404).json({
        success: false,
        message: '内容不存在'
      });
    }
    
    // 获取书籍信息以获取博客封面图
    const bookId = contentObj.get('book')?.id || contentObj.get('bookId');
    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: '内容未关联到书籍'
      });
    }
    
    const book = await new AV.Query('Book').get(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: '书籍不存在'
      });
    }
    
    const blogCoverUrl = book.get('blogCoverUrl');
    if (!blogCoverUrl) {
      return res.status(400).json({
        success: false,
        message: '请先生成博客封面图'
      });
    }
    
    // 获取中文内容
    const chapterTitle = contentObj.get('chapterTitle') || '';
    const summary = contentObj.get('summary') || '';
    
    // 获取或翻译英文内容
    let chapterTitleEn = contentObj.get('chapterTitleEn') || '';
    let summaryEn = contentObj.get('summaryEn') || '';
    
    console.log('📋 检查英文翻译状态...');
    console.log('   标题:', chapterTitleEn ? '已有' : '需要翻译');
    console.log('   摘要:', summaryEn ? '已有' : '需要翻译');
    
    // 如果缺少英文翻译，使用Deepseek翻译
    if (!chapterTitleEn || !summaryEn) {
      console.log('🌐 开始使用Deepseek翻译内容...');
      sendProgress('正在翻译内容为英文', 10);
      
      // 翻译标题
      if (!chapterTitleEn && chapterTitle) {
        console.log(`🌐 [翻译] 章节标题: ${chapterTitle}`);
        try {
          const translateTitleResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'user',
                  content: `请将以下中文章节标题翻译成英文，只返回英文翻译，不要添加任何其他内容：\n${chapterTitle}`
                }
              ],
              temperature: 0.3,
              max_tokens: 100
            })
          });
          
          if (translateTitleResponse.ok) {
            const translateTitleData = await translateTitleResponse.json();
            chapterTitleEn = translateTitleData.choices[0]?.message?.content?.trim() || '';
            if (chapterTitleEn) {
              console.log(`✅ [翻译完成] 标题: ${chapterTitleEn}`);
            }
          }
        } catch (error) {
          console.error('❌ [翻译失败] 标题:', error.message);
        }
      }
      
      // 翻译摘要
      if (!summaryEn && summary) {
        console.log(`🌐 [翻译] 摘要: ${summary.substring(0, 50)}...`);
        try {
          const translateSummaryResponse = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'user',
                  content: `请将以下中文内容摘要完整翻译成英文，保持所有细节，不要限制字数，只返回英文翻译，不要添加任何其他内容：\n${summary}`
                }
              ],
              temperature: 0.3,
              max_tokens: 1000
            })
          });
          
          if (translateSummaryResponse.ok) {
            const translateSummaryData = await translateSummaryResponse.json();
            summaryEn = translateSummaryData.choices[0]?.message?.content?.trim() || '';
            if (summaryEn) {
              console.log(`✅ [翻译完成] 摘要: ${summaryEn.substring(0, 50)}...`);
            }
          }
        } catch (error) {
          console.error('❌ [翻译失败] 摘要:', error.message);
        }
      }
      
      // 保存翻译结果
      if (chapterTitleEn || summaryEn) {
        if (chapterTitleEn) contentObj.set('chapterTitleEn', chapterTitleEn);
        if (summaryEn) contentObj.set('summaryEn', summaryEn);
        await contentObj.save();
        console.log('✅ 英文翻译已保存');
      }
    }
    
    // 检查翻译结果
    if (!chapterTitleEn || !summaryEn) {
      return res.status(400).json({
        success: false,
        message: '英文翻译失败，无法生成英文视频'
      });
    }
    
    // 步骤1: 使用腾讯云TTS生成英文音频
    console.log('🎵 步骤1: 使用腾讯云TTS生成英文音频...');
    
    // 获取集数信息，用于生成开场白
    const segmentIndexEn = contentObj.get('segmentIndex') || 0;
    const bookObjEn = contentObj.get('book');
    const bookTitleEn = bookObjEn ? (await bookObjEn.fetch()).get('title') : '';
    
    // 查询同一本书的所有内容段，获取总集数
    let totalSegmentsEn = 0;
    if (bookObjEn) {
      const allSegmentsEn = await new AV.Query('ExtractedContent')
        .equalTo('book', bookObjEn)
        .ascending('segmentIndex')
        .find();
      totalSegmentsEn = allSegmentsEn.length;
    }
    
    // 根据集数生成英文开场白
    let openingTextEn = '';
    if (segmentIndexEn === 1 || totalSegmentsEn === 0) {
      // 第一集
      openingTextEn = bookTitleEn 
        ? `Hello, welcome to our book blog. Today we're starting with a book called "${bookTitleEn}". `
        : `Hello, welcome to our book blog. Today we're starting with a new book. `;
    } else if (segmentIndexEn === totalSegmentsEn && totalSegmentsEn > 0) {
      // 最后一集
      openingTextEn = bookTitleEn
        ? `Hello, this is the final episode of the "${bookTitleEn}" breakdown series. `
        : `Hello, this is the final episode of our book breakdown series. `;
    } else {
      // 中间集 - 随机选择一种开场白
      const middleOpeningsEn = [
        `Welcome back. In the previous episode, we discussed `,
        `Hello, this is the book blog. `,
        `Welcome back to our book blog. `
      ];
      openingTextEn = middleOpeningsEn[segmentIndexEn % middleOpeningsEn.length];
    }
    
    // 在文本前添加开场白
    let audioText = `${summaryEn}`.trim();
    const finalAudioText = openingTextEn ? `${openingTextEn}${audioText}` : audioText;
    console.log(`📝 添加英文开场白，集数: ${segmentIndexEn}/${totalSegmentsEn}`);
    console.log(`📝 开场白: ${openingTextEn}`);
    console.log('📝 英文文本:', finalAudioText.substring(0, 100) + '...');
    console.log('📝 文本长度:', finalAudioText.length, '字符');
    
    audioText = finalAudioText;
    
    // 腾讯云长文本语音合成API（CreateTtsTask）支持最多5000字符
    // 使用精品模型（大模型音色），支持中英文长文本合成
    const MAX_TEXT_LENGTH = 5000;
    if (audioText.length > MAX_TEXT_LENGTH) {
      console.warn(`⚠️ 文本长度(${audioText.length}字符)超过限制(${MAX_TEXT_LENGTH}字符)，将截断文本`);
      // 尝试在句号、感叹号或问号处截断，保持完整性
      let truncated = audioText.substring(0, MAX_TEXT_LENGTH);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      const cutPoint = Math.max(lastPeriod, lastExclamation, lastQuestion);
      
      if (cutPoint > MAX_TEXT_LENGTH * 0.7) {
        // 如果找到合适的截断点（在70%之后），则在该处截断
        audioText = truncated.substring(0, cutPoint + 1);
      } else {
        // 否则直接截断到最大长度
        audioText = truncated;
      }
      console.log(`📝 文本已截断到 ${audioText.length} 字符`);
    }
    
    // 使用腾讯云长文本语音合成API（CreateTtsTask）生成英文音频
    // 统一使用长文本API，与generate-audio路由保持一致
    console.log('🎵 使用腾讯云长文本语音合成API（CreateTtsTask）生成英文音频...');
    console.log('📝 文本长度:', audioText.length, '字符');
    
    // 初始化腾讯云TTS客户端
      const TtsClient = tencentcloud.tts.v20190823.Client;
      const tencentTtsClient = new TtsClient({
        credential: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
        },
        region: 'ap-guangzhou',
        profile: {
          httpProfile: {
            endpoint: 'tts.tencentcloudapi.com',
          },
        },
      });
      
    // 使用长文本API（CreateTtsTask），使用精品模型（大模型音色）
    // 英文音色：501008（长文本语音合成专用音色）
    const voiceType = 501008; // 英文-长文本语音合成专用音色
    const modelType = 1; // 精品模型（大模型音色）
    
    console.log(`🎤 使用音色类型: ${voiceType} (英文-长文本语音合成专用音色)`);
    console.log(`🔧 使用模型类型: ${modelType} (精品模型-大模型音色)`);
    
    // 按照腾讯云API文档格式设置参数
    const longTextParams = {
        Text: audioText,
      ProjectId: 0, // 项目ID，0表示默认项目
      ModelType: modelType, // 模型类型：1-精品模型（大模型音色）
      Volume: 0, // 音量：范围[-10, 10]，0为正常音量
      Codec: 'mp3', // 音频格式：mp3、pcm
      VoiceType: voiceType, // 英文音色：501008
      SampleRate: 16000, // 采样率：16000或8000
      PrimaryLanguage: 2, // 主语言：2-英文
      Speed: 0 // 语速：范围[-2, 2]，0为正常语速
    };
    
    console.log('📋 CreateTtsTask 请求参数:', JSON.stringify(longTextParams, null, 2));
    
    let englishAudioUrl;
    try {
      // 创建长文本语音合成任务
      const responseData = await tencentTtsClient.CreateTtsTask(longTextParams);
      console.log('✅ 腾讯云长文本API响应:', JSON.stringify(responseData, null, 2));
      
      // 检查错误
      if (responseData.Error) {
        const error = responseData.Error;
        console.error('❌ 腾讯云API错误:', JSON.stringify(error, null, 2));
        console.error('❌ 错误代码:', error.Code);
        console.error('❌ 错误消息:', error.Message);
        console.error('❌ 请求参数:', JSON.stringify(longTextParams, null, 2));
        
        // 特殊处理资源包配额用完错误
        const isResourcePackError = error.Code === 'UnsupportedOperation.PkgExhausted' || 
                                    error.Code === 'ResourceInsufficient' ||
                                    (error.Message && (
                                      error.Message.includes('资源包') || 
                                      error.Message.includes('resource pack') ||
                                      error.Message.includes('配额') ||
                                      error.Message.includes('quota') ||
                                      error.Message.includes('exhausted') ||
                                      error.Message.includes('allowance')
                                    ));
        
        if (isResourcePackError) {
          throw new Error('腾讯云资源包配额已用完，请前往腾讯云控制台购买"长文本语音合成-精品模型-预付费包"（ModelType: 1）。访问地址：https://console.cloud.tencent.com/tts');
        }
        
        throw new Error(`腾讯云API错误: ${error.Message || '未知错误'}`);
      }
      
      // 长文本API返回TaskId，需要轮询查询结果
      const taskId = responseData.Data?.TaskId;
      if (!taskId) {
        throw new Error('腾讯云API响应中未找到TaskId');
      }
      
      console.log('✅ 长文本语音合成任务已创建，TaskId:', taskId);
      
      // 轮询查询任务状态（最多等待60秒）
      const maxAttempts = 30; // 最多查询30次
      const pollInterval = 2000; // 每2秒查询一次
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // 按照腾讯云API文档格式设置查询参数
        const queryParams = {
          TaskId: taskId
        };
        console.log(`📋 DescribeTtsTaskStatus 请求参数 (${attempt + 1}/${maxAttempts}):`, JSON.stringify(queryParams, null, 2));
        
        const queryResponse = await tencentTtsClient.DescribeTtsTaskStatus(queryParams);
        console.log(`📊 查询任务状态 (${attempt + 1}/${maxAttempts}):`, JSON.stringify(queryResponse, null, 2));
        
        if (queryResponse.Error) {
          throw new Error(`查询任务状态失败: ${queryResponse.Error.Message}`);
        }
        
        const status = queryResponse.Data?.Status;
        if (status === 2) { // 2表示任务完成
          englishAudioUrl = queryResponse.Data?.ResultUrl;
          if (englishAudioUrl) {
            console.log('✅ 任务完成，获取到音频URL:', englishAudioUrl);
            break;
          }
        } else if (status === 3) { // 3表示任务失败
          throw new Error(`任务失败: ${queryResponse.Data?.ErrorMsg || '未知错误'}`);
        }
        // status === 0 表示任务处理中，继续轮询
      }
      
      if (!englishAudioUrl) {
        throw new Error('任务超时，未能获取音频URL');
      }
      
      console.log('✅ 英文音频生成完成，URL:', englishAudioUrl);
    } catch (tencentError) {
      console.error('❌ 腾讯云TTS生成英文音频失败:', tencentError);
      console.error('❌ 错误详情:', JSON.stringify(tencentError, Object.getOwnPropertyNames(tencentError)));
      
      const errorMessage = tencentError.message || '';
      const errorCode = tencentError.code || tencentError.Code || '';
      
      // 特殊处理资源包配额用完错误
      if (errorCode === 'UnsupportedOperation.PkgExhausted' || 
          (errorMessage.toLowerCase().includes('resource pack') && errorMessage.toLowerCase().includes('exhausted')) ||
          (errorMessage.toLowerCase().includes('allowance') && errorMessage.toLowerCase().includes('exhausted'))) {
        throw new Error('腾讯云资源包配额已用完，请前往腾讯云控制台购买"长文本语音合成-精品模型-预付费包"（ModelType: 1）。访问地址：https://console.cloud.tencent.com/tts');
      }
      
      // 其他错误直接抛出原始错误消息
      throw new Error(`生成英文音频失败: ${errorMessage || '未知错误'}`);
    }
    
    // 更新内容对象
    contentObj.set('audioUrlEn', englishAudioUrl);
    contentObj.set('videoStatus', 'generating');
    await contentObj.save();
    
    // 步骤2: 使用博客封面图生成英文视频（与中文视频逻辑相同）
    console.log('🎞️ 步骤2: 使用博客封面图生成英文视频...');
    
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    
    // 下载英文音频
    let finalEnglishAudioUrl = englishAudioUrl;
    if (finalEnglishAudioUrl.startsWith('http://')) {
      finalEnglishAudioUrl = finalEnglishAudioUrl.replace('http://', 'https://');
    }
    tempAudioPath = path.join(tempDir, `audio_en_${contentId}_${timestamp}.mp3`);
    console.log('📥 开始下载英文音频:', finalEnglishAudioUrl);
    
    let audioResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      audioResponse = await fetch(finalEnglishAudioUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      throw new Error(`下载英文音频失败: ${fetchError.message}`);
    }
    
    if (!audioResponse.ok) {
      throw new Error(`下载英文音频失败 (${audioResponse.status}): ${audioResponse.statusText}`);
    }
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    await fs.writeFile(tempAudioPath, audioBuffer);
    console.log('✅ 英文音频下载完成，大小:', audioBuffer.length, 'bytes');
    
    // 获取音频时长
    const audioDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempAudioPath, (err, metadata) => {
        if (err) {
          console.error('❌ 获取音频时长失败:', err);
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          console.log('✅ 英文音频时长:', duration, '秒');
          resolve(duration);
        }
      });
    });
    
    const audioDurationSeconds = Math.ceil(audioDuration);
    console.log('📊 英文音频总时长:', audioDurationSeconds, '秒');
    
    // 使用腾讯云ASR生成英文字幕文件（基于音频URL）
    // 确保音频URL是HTTPS格式
    let audioUrlForASR = finalEnglishAudioUrl;
    if (audioUrlForASR.startsWith('http://')) {
      audioUrlForASR = audioUrlForASR.replace('http://', 'https://');
    }
    
    console.log('🎤 使用英文音频URL生成字幕:', audioUrlForASR);
    tempSubtitlePath = await generateSubtitleFile(
      audioUrlForASR,
      'en',
      tempDir,
      contentId,
      timestamp
    );
    
    // 下载博客封面图
    console.log('📥 开始下载博客封面图:', blogCoverUrl);
    let coverImageResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      coverImageResponse = await fetch(blogCoverUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      throw new Error(`下载博客封面图失败: ${fetchError.message}`);
    }
    
    if (!coverImageResponse.ok) {
      throw new Error(`下载博客封面图失败 (${coverImageResponse.status}): ${coverImageResponse.statusText}`);
    }
    
    const coverImageBuffer = Buffer.from(await coverImageResponse.arrayBuffer());
    const coverImagePath = path.join(tempDir, `cover_en_${contentId}_${timestamp}.jpg`);
    await fs.writeFile(coverImagePath, coverImageBuffer);
    console.log('✅ 博客封面图保存完成');
    
    // 视频参数（9:16比例，720x1280）
    const videoWidth = 720;
    const videoHeight = 1280;
    const fps = 30;
    
    // 使用ffmpeg将博客封面图转换为视频（静态图片，匹配音频时长）
    tempVideoPath = path.join(tempDir, `video_en_${contentId}_${timestamp}.mp4`);
    console.log('🎞️ 开始生成英文视频（使用博客封面图）');
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000; // 5分钟超时
      
      // 使用ffmpeg将封面图转换为视频（循环播放以匹配音频时长）
      const ffmpegProcess = ffmpeg()
        .input(coverImagePath)
        .inputOptions([
          '-loop', '1',
          '-t', audioDurationSeconds.toString()
        ])
        .complexFilter([
          // 缩放封面图到目标尺寸（保持宽高比，居中）
          `[0:v]scale=${videoWidth}:${videoHeight}:force_original_aspect_ratio=decrease,pad=${videoWidth}:${videoHeight}:(ow-iw)/2:(oh-ih)/2:black[out]`
        ])
        .outputOptions([
          '-map', '[out]',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-r', fps.toString(),
          '-t', audioDurationSeconds.toString()
        ])
        .output(tempVideoPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg视频生成命令:', commandLine);
          timeoutId = setTimeout(() => {
            console.error('❌ 视频生成超时（5分钟）');
            ffmpegProcess.kill('SIGKILL');
            reject(new Error('视频生成超时，请重试'));
          }, timeout);
        })
        .on('end', () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('✅ 视频生成完成');
          resolve(null);
        })
        .on('error', (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ FFmpeg视频生成失败:', err);
          reject(err);
        })
        .on('stderr', (stderrLine) => {
          if (stderrLine.includes('time=')) {
            console.log('📊 FFmpeg进度:', stderrLine.trim());
          }
        })
        .run();
    });
    
    // 合并视频和音频
    tempOutputPath = path.join(tempDir, `output_en_${contentId}_${timestamp}.mp4`);
    console.log('🎞️ 开始合并视频和音频');
    
    let finalVideoPath = tempVideoPath;
    // 使用更严格的比较，考虑浮点数误差，如果视频时长 < 音频时长（即使只差0.1秒），也需要拼接
    if (videoDuration < audioDuration) {
      console.log(`⚠️ 中文视频时长(${videoDuration}秒) < 英文音频时长(${audioDuration}秒)，需要重复拼接视频`);
      // 多拼接一些，确保视频时长 >= 音频时长（添加10%的缓冲）
      const repeatCount = Math.ceil((audioDuration * 1.1) / videoDuration);
      console.log(`🔄 需要重复 ${repeatCount} 次视频（包含10%缓冲，确保视频时长 >= 音频时长）`);
      console.log(`📊 计算详情: 音频时长=${audioDuration}秒, 视频时长=${videoDuration}秒, 重复次数=${repeatCount}`);
      
      // 创建视频列表文件用于concat
      concatListPath = path.join(tempDir, `concat_list_${contentId}_${timestamp}.txt`);
      const concatListContent = Array(repeatCount).fill(`file '${tempVideoPath.replace(/'/g, "\\'")}'`).join('\n');
      await fs.writeFile(concatListPath, concatListContent);
      console.log('📝 创建视频拼接列表文件:', concatListPath);
      
      // 拼接重复的视频
      concatenatedVideoPath = path.join(tempDir, `concatenated_video_${contentId}_${timestamp}.mp4`);
      await new Promise((resolve, reject) => {
        let timeoutId = null;
        const timeout = 300000; // 5分钟超时
        
        const concatProcess = ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions([
            '-c:v copy', // 复制视频流
            '-c:a copy'  // 复制音频流（如果有）
          ])
          .output(concatenatedVideoPath)
          .on('start', (commandLine) => {
            console.log('🎬 FFmpeg拼接命令:', commandLine);
            timeoutId = setTimeout(() => {
              console.error('❌ 视频拼接超时（5分钟）');
              concatProcess.kill('SIGKILL');
              reject(new Error('视频拼接超时，请重试'));
            }, timeout);
          })
          .on('end', () => {
            if (timeoutId) clearTimeout(timeoutId);
            console.log('✅ 视频拼接完成');
            resolve(null);
          })
          .on('error', (err) => {
            if (timeoutId) clearTimeout(timeoutId);
            console.error('❌ FFmpeg拼接失败:', err);
            // 如果copy失败，尝试重新编码
            if (err.message && err.message.includes('copy')) {
              console.log('⚠️ 视频流复制失败，尝试重新编码拼接...');
              const fallbackProcess = ffmpeg()
                .input(concatListPath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions([
                  '-c:v libx264',
                  '-preset ultrafast',
                  '-crf 23',
                  '-pix_fmt yuv420p',
                  '-s 720x1280',
                  '-aspect 9:16'
                ])
                .output(concatenatedVideoPath)
                .on('end', () => {
                  console.log('✅ 视频拼接完成（使用重新编码）');
                  resolve(null);
                })
                .on('error', (fallbackErr) => {
                  console.error('❌ 重新编码拼接也失败:', fallbackErr);
                  reject(fallbackErr);
                })
                .run();
            } else {
              reject(err);
            }
          })
          .run();
      });
      
      finalVideoPath = concatenatedVideoPath;
      console.log('✅ 视频重复拼接完成，使用拼接后的视频');
      
      // 验证拼接后的视频时长是否 >= 音频时长
      const concatenatedVideoDuration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(concatenatedVideoPath, (err, metadata) => {
          if (err) {
            console.error('❌ 获取拼接后视频时长失败:', err);
            reject(err);
          } else {
            const duration = metadata.format.duration || 0;
            console.log('📹 拼接后视频时长:', duration, '秒');
            resolve(duration);
          }
        });
      });
      
      // 如果拼接后的视频时长仍然 < 音频时长，需要继续拼接
      if (concatenatedVideoDuration < audioDuration) {
        console.log(`⚠️ 拼接后视频时长(${concatenatedVideoDuration}秒) < 音频时长(${audioDuration}秒)，需要继续拼接`);
        const additionalRepeatCount = Math.ceil((audioDuration - concatenatedVideoDuration) / videoDuration) + 1; // 多拼接一些，确保足够
        console.log(`🔄 需要额外重复 ${additionalRepeatCount} 次视频`);
        
        // 创建新的concat列表，包含原始视频和已拼接的视频
        const additionalConcatListPath = path.join(tempDir, `concat_list_additional_${contentId}_${timestamp}.txt`);
        const additionalConcatContent = [
          `file '${concatenatedVideoPath.replace(/'/g, "\\'")}'`, // 先包含已拼接的视频
          ...Array(additionalRepeatCount).fill(`file '${tempVideoPath.replace(/'/g, "\\'")}'`) // 再添加额外的重复
        ].join('\n');
        await fs.writeFile(additionalConcatListPath, additionalConcatContent);
        console.log('📝 创建额外拼接列表文件:', additionalConcatListPath);
        
        // 再次拼接
        const finalConcatenatedVideoPath = path.join(tempDir, `final_concatenated_video_${contentId}_${timestamp}.mp4`);
        await new Promise((resolve, reject) => {
          let timeoutId = null;
          const timeout = 300000;
          
          const additionalConcatProcess = ffmpeg()
            .input(additionalConcatListPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions([
              '-c:v copy',
              '-c:a copy'
            ])
            .output(finalConcatenatedVideoPath)
            .on('start', (commandLine) => {
              console.log('🎬 FFmpeg额外拼接命令:', commandLine);
              timeoutId = setTimeout(() => {
                console.error('❌ 额外视频拼接超时（5分钟）');
                additionalConcatProcess.kill('SIGKILL');
                reject(new Error('额外视频拼接超时，请重试'));
              }, timeout);
            })
            .on('end', () => {
              if (timeoutId) clearTimeout(timeoutId);
              console.log('✅ 额外视频拼接完成');
              resolve(null);
            })
            .on('error', (err) => {
              if (timeoutId) clearTimeout(timeoutId);
              console.error('❌ FFmpeg额外拼接失败:', err);
              reject(err);
            })
            .run();
        });
        
        // 更新最终视频路径和清理列表
        if (concatListPath) {
          try {
            await fs.unlink(concatListPath);
          } catch (e) {
            console.warn('⚠️ 清理旧concat列表文件失败:', e.message);
          }
        }
        try {
          await fs.unlink(concatenatedVideoPath);
        } catch (e) {
          console.warn('⚠️ 清理中间拼接视频失败:', e.message);
        }
        
        concatenatedVideoPath = finalConcatenatedVideoPath;
        concatListPath = additionalConcatListPath;
        finalVideoPath = finalConcatenatedVideoPath;
        console.log('✅ 最终视频拼接完成，确保视频时长 >= 音频时长');
      } else {
        console.log('✅ 拼接后视频时长足够，无需额外拼接');
      }
    } else {
      console.log('✅ 视频时长足够，无需重复拼接');
    }
    
    // 合并视频和音频（如果有字幕则嵌入字幕）
    tempOutputPath = path.join(tempDir, `output_en_${contentId}_${timestamp}.mp4`);
    console.log('🎞️ 开始合并视频和音频' + (tempSubtitlePath ? '（包含字幕）' : ''));
    
    // 如果有字幕文件，先验证文件是否存在
    if (tempSubtitlePath) {
      try {
        await fs.access(tempSubtitlePath);
        const stats = await fs.stat(tempSubtitlePath);
        console.log('✅ 字幕文件存在，路径:', tempSubtitlePath);
        console.log('✅ 字幕文件大小:', stats.size, '字节');
      } catch (accessError) {
        console.error('❌ 字幕文件不存在或无法访问:', tempSubtitlePath);
        console.error('❌ 错误详情:', accessError.message);
        throw new Error(`字幕文件不存在: ${tempSubtitlePath}`);
      }
    }
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000; // 5分钟超时
      
      let ffmpegProcess = ffmpeg()
        .input(finalVideoPath) // 使用finalVideoPath（可能已拼接）
        .input(tempAudioPath);
      
      // 如果有字幕文件，添加字幕滤镜
      if (tempSubtitlePath) {
        console.log('📝 添加字幕到视频:', tempSubtitlePath);
        const escapedSubtitlePath = escapeSubtitlePath(tempSubtitlePath);
        console.log('📝 转义后的字幕路径:', escapedSubtitlePath);
        
        ffmpegProcess = ffmpegProcess
          .complexFilter([
            // 缩放视频
            `[0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black[v]`,
            // 添加字幕（硬字幕，烧录到视频帧上）
            // 显式指定输入编码为UTF-8，确保中文字幕正确显示
            // 字幕文件已使用UTF-8 BOM编码，但显式指定charenc参数更可靠
            // 字幕样式：去掉阴影，边框变细，位置居中（底部），确保在屏幕内
            // Outline=1：细边框
            // Shadow=0：无阴影效果
            // Alignment=2：底部居中
            // WrapStyle=0：智能换行，确保长文本自动换行不超出屏幕
            // MarginL=20,MarginR=20：左右边距，确保字幕不超出屏幕边界
            // MarginV=150：垂直边距，确保字幕在屏幕底部可见区域内
            `[v]subtitles='${escapedSubtitlePath}':charenc=UTF-8:force_style='FontSize=8,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=1,Shadow=0,Alignment=2,MarginV=150,MarginL=20,MarginR=20,WrapStyle=0'[outv]`
          ])
          .outputOptions([
            '-map', '[outv]',
            '-map', '1:a',  // 映射音频流（第二个输入文件的音频）
            '-c:v libx264',
            '-preset medium',
            '-crf 23',
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-b:a 128k',
            '-shortest'
          ]);
      } else {
        ffmpegProcess = ffmpegProcess.outputOptions([
          '-c:v copy',
          '-c:a aac',
          '-shortest'
        ]);
      }
      
      ffmpegProcess = ffmpegProcess.output(tempOutputPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg合并命令:', commandLine);
          timeoutId = setTimeout(() => {
            console.error('❌ 视频合并超时（5分钟）');
            ffmpegProcess.kill('SIGKILL');
            reject(new Error('视频合并超时，请重试'));
          }, timeout);
        })
        .on('end', () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('✅ 视频合并完成');
          resolve(null);
        })
        .on('error', (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ FFmpeg合并失败:', err);
          // 如果copy失败，尝试重新编码
          if (err.message && err.message.includes('copy')) {
            console.log('⚠️ 视频流复制失败，尝试重新编码...');
            let fallbackProcess = ffmpeg()
              .input(finalVideoPath)
              .input(tempAudioPath);
            
            // 如果有字幕，添加字幕滤镜
            if (tempSubtitlePath) {
              fallbackProcess = fallbackProcess
                .complexFilter([
                  `[0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black[v]`,
                  `[v]subtitles='${escapeSubtitlePath(tempSubtitlePath)}':charenc=UTF-8:force_style='FontSize=8,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=1,Shadow=0,Alignment=2,MarginV=150,MarginL=20,MarginR=20,WrapStyle=0'[outv]`
                ])
                .outputOptions([
                  '-map', '[outv]',
                  '-map', '1:a',  // 映射音频流（第二个输入文件的音频）
                  '-c:v libx264',
                  '-preset ultrafast',
                  '-crf 23',
                  '-pix_fmt yuv420p',
                  '-c:a aac',
                  '-shortest'
                ]);
            } else {
              fallbackProcess = fallbackProcess.outputOptions([
                '-c:v libx264',
                '-preset ultrafast',
                '-crf 23',
                '-pix_fmt yuv420p',
                '-s 720x1280',
                '-aspect 9:16',
                '-c:a aac',
                '-shortest'
              ]);
            }
            
            fallbackProcess = fallbackProcess.output(tempOutputPath)
              .on('end', () => {
                console.log('✅ 视频合并完成（使用重新编码）');
                resolve(null);
              })
              .on('error', (fallbackErr) => {
                console.error('❌ 重新编码也失败:', fallbackErr);
                reject(fallbackErr);
              })
              .run();
          } else {
            reject(err);
          }
        })
        .run();
    });
    
    // 上传合并后的视频到LeanCloud
    console.log('📤 开始上传英文视频到LeanCloud...');
    const videoBuffer2 = await fs.readFile(tempOutputPath);
    const fileSizeMB = (videoBuffer2.length / 1024 / 1024).toFixed(2);
    console.log(`📊 视频文件大小: ${fileSizeMB}MB`);
    
    const videoFile = new AV.File(`video_en_${contentId}_${timestamp}.mp4`, videoBuffer2, 'video/mp4');
    
    // 设置上传超时时间（10分钟）
    const uploadStartTime = Date.now();
    try {
      await Promise.race([
        videoFile.save(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('视频上传超时，请检查网络连接或文件大小')), 10 * 60 * 1000)
        )
      ]);
      const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
    const finalVideoUrl = videoFile.url();
      console.log(`✅ 英文视频上传成功，耗时: ${uploadTime}秒，URL:`, finalVideoUrl);
    } catch (error) {
      console.error('❌ 英文视频上传失败:', error);
      console.error('错误详情:', error.message);
      throw new Error(`视频上传失败: ${error.message}`);
    }
    
    const finalVideoUrl = videoFile.url();
    
    // 更新内容对象
    contentObj.set('videoUrlEn', finalVideoUrl);
    contentObj.set('videoStatus', 'completed');
    await contentObj.save();
    
    // 清理临时文件（包括字幕文件）
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath, tempSubtitlePath].filter(Boolean);
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`⚠️ 清理临时文件失败: ${filePath}`, err.message);
      }
    }
    
    console.log('✅ 英文视频生成完成');
    
    // 发送完成消息
    cleanup();
    sendProgress('英文视频生成完成', 100);
    const responseData = {
      success: true,
      data: {
        videoUrlEn: finalVideoUrl,
        audioUrlEn: englishAudioUrl,
        chapterTitleEn: chapterTitleEn,
        summaryEn: summaryEn,
        contentId: contentId,
        language: 'en'
      }
    };
    
    if (useSSE) {
      // SSE格式响应
      responseData.completed = true;
      const finalData = JSON.stringify(responseData);
      res.write(`data: ${finalData}\n\n`);
      res.end();
    } else {
      // JSON格式响应（兼容模式）
      res.json(responseData);
    }
    
  } catch (error) {
    cleanup();
    console.error('❌ 生成英文视频失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    
    // 清理临时文件（包括字幕文件）
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath, tempSubtitlePath].filter(Boolean);
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`⚠️ 清理临时文件失败: ${filePath}`, err.message);
      }
    }
    
    // 如果响应还没有发送，发送错误响应
    if (!res.headersSent) {
      // 更新状态为失败
      try {
        const content = await new AV.Query('ExtractedContent').get(req.params.contentId);
        if (content) {
          content.set('videoStatus', 'failed');
          await content.save();
        }
      } catch (updateError) {
        console.error('❌ 更新内容状态失败:', updateError);
      }

      // 发送错误消息
      const errorResponse = {
        success: false,
        message: `生成英文视频失败: ${error.message}`,
        error: error.message || String(error)
      };
      
      // 在开发环境下返回更多调试信息
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        errorResponse.stack = error.stack;
        errorResponse.details = JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      if (useSSE) {
        // SSE格式响应
        errorResponse.completed = true;
        const errorData = JSON.stringify(errorResponse);
        res.write(`data: ${errorData}\n\n`);
        res.end();
      } else {
        // JSON格式响应（兼容模式）
        res.status(500).json(errorResponse);
      }
    } else {
      console.error('❌ 响应已发送，无法发送错误响应');
    }
  }
});

// 获取书籍的提取内容列表
router.get('/:bookId/contents', async (req, res) => {
  try {
    const { bookId } = req.params;

    const query = new AV.Query('ExtractedContent');
    query.equalTo('book', AV.Object.createWithoutData('Book', bookId));
    query.ascending('segmentIndex');
    query.include('book');

    const contents = await query.find();

    const contentsData = contents.map(content => ({
      id: content.id,
      chapterTitle: content.get('chapterTitle'),
      chapterTitleEn: content.get('chapterTitleEn'),
      summary: content.get('summary'),
      summaryEn: content.get('summaryEn'),
      avatarDescription: content.get('avatarDescription'),
      estimatedDuration: content.get('estimatedDuration'),
      videoStatus: content.get('videoStatus'),
      videoUrl: content.get('videoUrl'),
      videoUrlEn: content.get('videoUrlEn'),
      audioUrl: content.get('audioUrl'),
      audioUrlEn: content.get('audioUrlEn'),
      silentVideoUrl: content.get('silentVideoUrl'),
      avatarImageUrl: content.get('avatarImageUrl'),
      segmentIndex: content.get('segmentIndex')
    }));

    res.json({
      success: true,
      data: contentsData
    });
  } catch (error) {
    console.error('获取提取内容失败:', error);
    res.status(500).json({
      success: false,
      message: '获取提取内容失败',
      error: error.message
    });
  }
});

// 更新书籍（使用Master Key绕过ACL）
router.put('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, author, categoryId } = req.body;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: '缺少书籍ID'
      });
    }

    // 使用Master Key更新书籍
    AV.Cloud.useMasterKey();
    const book = AV.Object.createWithoutData('Book', bookId);
    
    if (title) {
      book.set('title', title);
    }
    if (author) {
      book.set('author', author);
    }
    if (categoryId) {
      const category = AV.Object.createWithoutData('Category', categoryId);
      book.set('category', category);
    }

    await book.save(null, { useMasterKey: true });

    // 重新获取更新后的书籍信息（包含关联的分类）
    const updatedBook = await new AV.Query('Book').include('category').get(bookId);

    res.json({
      success: true,
      message: '更新成功',
      data: {
        id: updatedBook.id,
        title: updatedBook.get('title'),
        author: updatedBook.get('author'),
        category: updatedBook.get('category') ? {
          id: updatedBook.get('category').id,
          nameCn: updatedBook.get('category').get('nameCn')
        } : null
      }
    });
  } catch (error) {
    console.error('更新书籍失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新失败'
    });
  }
});

// 删除书籍（使用Master Key绕过ACL）
router.delete('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: '缺少书籍ID'
      });
    }

    // 使用Master Key删除书籍
    AV.Cloud.useMasterKey();
    const book = AV.Object.createWithoutData('Book', bookId);
    await book.destroy({ useMasterKey: true });

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除书籍失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除失败'
    });
  }
});

module.exports = router;

