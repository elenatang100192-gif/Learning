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
// const { createCanvas } = require('canvas');

// 配置multer用于文件上传
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB限制
});

// API配置（从环境变量读取）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-c3a8c2ddc6dc49c4b6f43b3394147ead';
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

// Doubao语音合成大模型API配置（英文音频生成）
// 根据README.md配置：
// APP ID：7616870473
// Access Token：q8Fx7NRJOVxrl6486XjBKaTL4gqVwqXm
// Secret Key：d9ryy2RnuxT5wGmmA4EteU24fVRjcYSb
// 文档：https://www.volcengine.com/docs/6561/1598757?lang=zh
const DOUBAO_TTS_APP_ID = process.env.DOUBAO_TTS_APP_ID || '7616870473';
const DOUBAO_TTS_ACCESS_KEY = process.env.DOUBAO_TTS_ACCESS_KEY || process.env.DOUBAO_TTS_ACCESS_TOKEN || 'q8Fx7NRJOVxrl6486XjBKaTL4gqVwqXm';
const DOUBAO_TTS_SECRET_KEY = process.env.DOUBAO_TTS_SECRET_KEY || 'd9ryy2RnuxT5wGmmA4EteU24fVRjcYSb';
// 豆包TTS API端点（单向流式HTTP-V3接口）
const DOUBAO_TTS_API_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
// 资源ID（字符版资源ID：seed-tts-1.0 或 seed-tts-2.0）
// 注意：如果seed-tts-2.0未授权，可以尝试使用seed-tts-1.0
const DOUBAO_TTS_RESOURCE_ID = process.env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-1.0';

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

// 上传电子书文件
router.post('/upload', upload.single('bookFile'), async (req, res) => {
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

// 使用Deepseek拆解书籍内容
router.post('/:bookId/extract', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { segments = 10 } = req.body; // 默认10段

    if (![5, 10, 20, 30].includes(segments)) {
      return res.status(400).json({
        success: false,
        message: '分段数量必须是5、10、20或30'
      });
    }

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
    let bookContent;
    try {
      bookContent = await extractTextFromFile(fileUrl);
      console.log('✅ 文本内容提取成功，长度:', bookContent.length);
    } catch (error) {
      console.error('❌ 提取文件内容失败:', error);
      book.set('status', '待处理');
      await book.save();
      return res.status(500).json({
        success: false,
        message: `提取文件内容失败: ${error.message}`
      });
    }

    // 调用Deepseek API拆解书籍（基于文件内容）
    const prompt = `Please break down the following book content into ${segments} segments of ESSENTIAL CORE IDEAS. Each segment MUST include BOTH Chinese and English versions:

Book Title: ${book.get('title')}
Book Content:
${bookContent}

CRITICAL REQUIREMENTS:
1. Extract ONLY the CORE IDEAS and ESSENCE of the book, NOT general summaries
2. Each segment should focus on SPECIFIC, ACTIONABLE insights and key concepts
3. Avoid vague, general statements like "本书认为", "作者指出", "本书提出的核心问题是"
4. Extract CONCRETE ideas, principles, methods, or insights that are valuable and actionable
5. Each segment should be PRECISE and DETAILED, focusing on the essence

Please break down this content into ${segments} segments. Each segment MUST include BOTH Chinese and English versions:

1. chapterTitle (Chinese) - 章节标题（中文），反映该段的核心主题
2. chapterTitleEn (English) - Chapter Title (English) - REQUIRED
3. summary (Chinese, EXACTLY 200 characters, NO MORE, NO LESS. Extract ONLY the core essence and key ideas. Be SPECIFIC and CONCRETE. Avoid general statements. Focus on actionable insights, principles, methods, or valuable concepts. Do NOT use phrases like "本书认为", "作者指出", "本书提出的核心问题是", "本书介绍了", "本书阐述了". Instead, directly state the core ideas and insights) - 内容总结（中文，严格200字，只提取核心思想和精华内容，要具体、有价值，避免概括性表述）
4. summaryEn (English, complete translation maintaining all details from Chinese summary, approximately 200-300 words) - Summary (English) - REQUIRED
5. avatarDescription (description of gender, age, profession, style) - 数字人形象描述
6. estimatedDuration (seconds) - 预计视频时长（秒）

IMPORTANT: 
- You MUST provide English translations (chapterTitleEn, summaryEn) for ALL segments. Do not skip any English fields.
- The Chinese summary MUST be EXACTLY 200 characters. Count carefully and ensure precision.
- Extract ESSENCE and CORE IDEAS, NOT general summaries or overviews.
- Be SPECIFIC and CONCRETE. Avoid vague statements.
- Focus on ACTIONABLE insights, principles, methods, or valuable concepts.

Return in JSON format:
{
  "segments": [
    {
      "chapterTitle": "章节标题（反映核心主题）",
      "chapterTitleEn": "Chapter Title",
      "summary": "核心思想和精华内容（严格200字，具体、有价值，避免概括性表述）",
      "summaryEn": "Summary (complete English translation, maintaining all details from Chinese summary)",
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
    const ExtractedContentClass = AV.Object.extend('ExtractedContent');
    const savedSegments = [];

    for (const segment of segmentsData.segments || []) {
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
      
      // 确保summary严格控制在200字以内
      if (summary.length > 200) {
        // 如果超过200字，在句号、逗号或空格处截断，保持完整性
        let truncated = summary.substring(0, 200);
        const lastPeriod = truncated.lastIndexOf('。');
        const lastComma = truncated.lastIndexOf('，');
        const lastSemicolon = truncated.lastIndexOf('；');
        const lastSpace = truncated.lastIndexOf(' ');
        const cutPoint = Math.max(lastPeriod, lastComma, lastSemicolon, lastSpace);
        
        // 如果找到合适的截断点（在150字之后），则在该处截断
        if (cutPoint > 150) {
          truncated = truncated.substring(0, cutPoint + 1);
        } else {
          // 否则直接截断到200字
          truncated = truncated.substring(0, 200);
        }
        summary = truncated.trim();
      }
      
      // 如果少于200字但接近，可以适当补充（但保持核心思想）
      // 这里不做自动补充，保持AI生成的原样
      
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

    res.json({
      success: true,
      data: {
        bookId: book.id,
        segments: savedSegments
      }
    });
  } catch (error) {
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

    // 检查是否是网络错误
    if (error.message && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT'))) {
      return res.status(500).json({
        success: false,
        message: '无法连接到Deepseek API，请检查网络连接或API配置',
        error: error.message,
        suggestion: '请检查DEEPSEEK_API_KEY是否正确配置'
      });
    }

    // 检查是否是API错误
    if (error.message && error.message.includes('Deepseek API')) {
      return res.status(500).json({
        success: false,
        message: 'Deepseek API调用失败',
        error: error.message,
        suggestion: '请检查DEEPSEEK_API_KEY是否正确，或查看Deepseek API服务状态'
      });
    }

    // 检查是否是JSON解析错误
    if (error.message && (error.message.includes('JSON') || error.message.includes('解析'))) {
      return res.status(500).json({
        success: false,
        message: '无法解析AI返回的内容',
        error: error.message,
        suggestion: 'AI返回的内容格式不正确，请重试'
      });
    }

    // 返回详细的错误信息
    const errorResponse = {
      success: false,
      message: '拆解书籍失败',
      error: error.message || String(error)
    };
    
    // 在开发环境下返回更多调试信息
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      errorResponse.stack = error.stack;
      errorResponse.details = JSON.stringify(error, Object.getOwnPropertyNames(error));
    }
    
    res.status(500).json(errorResponse);
  }
});

// 使用腾讯云长语音合成将文字转换为语音
router.post('/content/:contentId/generate-audio', async (req, res) => {
  // 设置响应超时时间（15分钟），因为音频生成需要轮询查询任务状态
  req.setTimeout(15 * 60 * 1000);
  res.setTimeout(15 * 60 * 1000);
  
  console.log('🚀 ========== 生成音频API被调用 ==========');
  console.log('📥 请求参数:', JSON.stringify(req.params, null, 2));
  console.log('📥 请求体:', JSON.stringify(req.body, null, 2));
  console.log('📥 Content-Type:', req.headers['content-type']);
  
  try {
    const { contentId } = req.params;
    const { text, language = 'zh' } = req.body; // language: 'zh' 或 'en'
    
    console.log('📋 解析后的参数:');
    console.log('   contentId:', contentId);
    console.log('   text:', text ? `${text.substring(0, 50)}...` : 'undefined');
    console.log('   language:', language, `(type: ${typeof language})`);

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

    // 统一使用腾讯云长文本语音合成（精品模型-大模型音色）
    // 中文和英文都使用腾讯云TTS的CreateTtsTask API，ModelType: 1（精品模型-大模型音色）
    console.log(`🔍 检测语言参数: language="${language}", type=${typeof language}`);
    console.log(`🔍 language === 'en': ${language === 'en'}`);
    console.log(`🔍 language.toLowerCase() === 'en': ${String(language).toLowerCase() === 'en'}`);
    
    // 使用更宽松的匹配，支持 'en', 'EN', 'En' 等
    const isEnglish = String(language).toLowerCase() === 'en';
    console.log(`🔍 isEnglish: ${isEnglish}`);
    
    // 统一使用腾讯云TTS长文本语音合成（精品模型-大模型音色）
    // 不再区分语言，都使用CreateTtsTask API
    if (false) { // 禁用豆包TTS，统一使用腾讯云TTS
      console.log('🎵 使用豆包语音合成大模型生成英文音频（仅使用豆包API，不限制字符数）');
      console.log('📏 文本长度:', text.length, '字符');
      console.log(`📝 文本内容预览: ${text.substring(0, 200)}...`);
      console.log(`📝 完整文本内容: ${text}`);
      
      // 调用豆包TTS API生成英文音频（支持长文本，不限制字符数）
      try {
        // 根据豆包TTS API文档构建请求
        // 文档：https://www.volcengine.com/docs/6561/1598757?lang=zh
        // 使用火山引擎OpenSpeech API格式
        const doubaoTtsRequest = {
          app: {
            appid: DOUBAO_TTS_APP_ID,
            token: DOUBAO_TTS_ACCESS_TOKEN,
            cluster: 'volcano_tts'
          },
          user: {
            uid: `user_${contentId}_${Date.now()}`
          },
          audio: {
            voice_type: 'BV700_streaming', // 英文音色，可根据文档选择其他音色
            encoding: 'mp3',
            speed_ratio: 1.0, // 语速：0.5-2.0，1.0为正常速度
            volume_ratio: 1.0, // 音量：0.0-3.0，1.0为正常音量
            pitch_ratio: 1.0, // 音调：0.5-2.0，1.0为正常音调
            rate: 24000 // 采样率：16000或24000
          },
          request: {
            reqid: `req_${contentId}_${Date.now()}`,
            text: text,
            text_type: 'plain', // 文本类型：plain（纯文本）或ssml（SSML格式）
            with_frontend: 1, // 是否使用前端处理：1-是，0-否
            frontend_type: 'streaming' // 前端类型：streaming
          }
        };

        console.log('📤 豆包TTS API请求:', JSON.stringify(doubaoTtsRequest, null, 2));
        console.log('🔗 豆包TTS API端点:', DOUBAO_TTS_API_URL);

        // 调用豆包TTS API
        // 注意：根据火山引擎文档，可能需要使用签名认证
        const doubaoTtsResponse = await fetch(DOUBAO_TTS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DOUBAO_TTS_SECRET_KEY}`
          },
          body: JSON.stringify(doubaoTtsRequest)
        });

        if (!doubaoTtsResponse.ok) {
          const errorText = await doubaoTtsResponse.text();
          console.error('❌ 豆包TTS API错误:', doubaoTtsResponse.status, doubaoTtsResponse.statusText);
          console.error('❌ 错误响应:', errorText);
          throw new Error(`豆包TTS API失败: ${doubaoTtsResponse.status} ${doubaoTtsResponse.statusText} - ${errorText}`);
        }

        // 检查响应类型
        const contentType = doubaoTtsResponse.headers.get('content-type') || '';
        console.log('📦 响应Content-Type:', contentType);
        
        let audioBuffer;
        if (contentType.includes('application/json')) {
          // JSON响应，包含base64编码的音频数据
          const doubaoTtsData = await doubaoTtsResponse.json();
          console.log('✅ 豆包TTS API响应:', JSON.stringify(doubaoTtsData, null, 2));

          // 检查响应中的音频数据
          if (doubaoTtsData.data && doubaoTtsData.data.audio) {
            // base64编码的音频数据
            const audioBase64 = doubaoTtsData.data.audio;
            audioBuffer = Buffer.from(audioBase64, 'base64');
          } else if (doubaoTtsData.audio) {
            // 音频数据在根级别
            const audioBase64 = doubaoTtsData.audio;
            audioBuffer = Buffer.from(audioBase64, 'base64');
          } else {
            throw new Error('豆包TTS API响应中未找到音频数据: ' + JSON.stringify(doubaoTtsData));
          }
        } else if (contentType.includes('audio')) {
          // 直接返回音频流
          console.log('📦 响应为音频流格式');
          audioBuffer = Buffer.from(await doubaoTtsResponse.arrayBuffer());
        } else {
          // 尝试解析为JSON
          const responseText = await doubaoTtsResponse.text();
          console.log('📦 响应内容:', responseText.substring(0, 500));
          throw new Error(`豆包TTS API响应格式未知，Content-Type: ${contentType}`);
        }

        // 将音频上传到LeanCloud
        const audioFile = new AV.File(`audio_en_${contentId}_${Date.now()}.mp3`, audioBuffer, 'audio/mpeg');
        await audioFile.save();
        const audioUrl = audioFile.url();

        console.log('✅ 英文音频生成完成，URL:', audioUrl);

        // 保存音频URL到内容对象
        contentObj.set('audioUrlEn', audioUrl);
        await contentObj.save();

        console.log('✅ 准备返回英文音频生成成功响应');
        // 返回格式与前端期望一致：{ success: true, data: { audioUrl: ... } }
        const response = {
          success: true,
          data: {
            audioUrl: audioUrl
          }
        };
        console.log('📤 返回响应:', JSON.stringify(response, null, 2));
        return res.json(response);

      } catch (error) {
        console.error('❌ 豆包TTS生成英文音频失败:', error);
        console.error('❌ 错误堆栈:', error.stack);
        console.error('❌ 错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        // 确保错误处理正确返回，不会继续执行中文音频代码
        const errorResponse = {
          success: false,
          message: `生成英文音频失败: ${error.message}`,
          error: error.message
        };
        console.log('📤 返回错误响应（英文音频）:', JSON.stringify(errorResponse, null, 2));
        console.log('🛑 停止执行，不继续中文音频生成');
        return res.status(500).json(errorResponse);
      }
    }
    
    // 统一使用腾讯云长文本语音合成（精品模型-大模型音色）
    // 中文和英文都使用腾讯云TTS的CreateTtsTask API，ModelType: 1（精品模型-大模型音色）
    console.log('🔵 ========== 使用腾讯云长文本语音合成（精品模型-大模型音色） ==========');
    console.log('🔵 语言:', language);

    // 统一使用腾讯云长文本语音合成（精品模型-大模型音色）
    console.log('🎵 调用腾讯云长文本语音合成API（精品模型-大模型音色），文本长度:', text.length, '语言:', language);
    
    // 根据语言选择音色类型
    // 中文音色：601013（长文本语音合成专用音色）
    // 英文音色：301001（长文本语音合成专用音色）
    const voiceType = isEnglish ? 301001 : 601013; // 英文使用301001，中文使用601013（长文本语音合成专用音色）
    console.log(`🎤 选择音色类型: ${voiceType} (${isEnglish ? '英文-长文本语音合成专用音色' : '中文-长文本语音合成专用音色'})`);
    console.log(`📝 生成${isEnglish ? '英文' : '中文'}音频，文本长度: ${text.length}，内容预览: ${text.substring(0, 100)}...`);
    
    // 统一使用长文本API（CreateTtsTask），使用精品模型（大模型音色）
    let responseData;
    
    // 强制使用长文本API（CreateTtsTask），使用精品模型（大模型音色）
    const useLongTextAPI = true; // 强制使用CreateTtsTask API（长文本语音合成-精品模型-大模型音色）
    
    if (useLongTextAPI) {
      console.log('📝 使用长文本语音合成API（CreateTtsTask）-精品模型（大模型音色）');
      
      // 使用精品模型（ModelType: 1）- 大模型音色
      const modelType = 1; // 使用精品模型（大模型音色）
      const longTextParams = {
        Text: text,
        ProjectId: 0, // 项目ID，0表示默认项目
        ModelType: modelType, // 模型类型：1-精品模型（大模型音色）
        Volume: 0, // 音量：范围[-10, 10]，0为正常音量
        Codec: 'mp3', // 音频格式：mp3、pcm
        VoiceType: voiceType, // 根据语言选择音色类型：中文601013，英文301001
        SampleRate: 16000, // 采样率：16000或8000
        PrimaryLanguage: isEnglish ? 2 : 1, // 主语言：1-中文，2-英文
        Speed: 0 // 语速：范围[-2, 2]，0为正常语速
      };
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
        
        const queryParams = {
          TaskId: taskId
        };
        
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
    
    // 下载音频文件
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`下载音频文件失败: ${audioResponse.statusText}`);
    }
    
    const audioBlob = await audioResponse.blob();
    const arrayBuffer = await audioBlob.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    console.log('✅ 音频文件下载完成，Buffer长度:', buffer.length);
    
    // 将音频文件上传到LeanCloud
    const fileName = `audio_${contentId}_${Date.now()}.mp3`;
    const file = new AV.File(fileName, buffer, 'audio/mpeg');
    console.log('📤 上传音频文件到LeanCloud:', fileName);
    await file.save();
    const finalAudioUrl = file.url();
    console.log('✅ 音频文件上传成功，URL:', finalAudioUrl);
    
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
  // 设置响应超时时间（15分钟）
  req.setTimeout(15 * 60 * 1000);
  res.setTimeout(15 * 60 * 1000);
  
  // 监听请求断开事件
  let requestAborted = false;
  req.on('close', () => {
    requestAborted = true;
    console.warn('⚠️ 客户端断开连接，但后端将继续处理视频生成任务');
  });
  
  try {
    const { contentId } = req.params;
    
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
    
    // 将文本分段（简单平均分段，固定3段）
    const textLength = textContent.length;
    const segmentTextLength = Math.ceil(textLength / numSegments);
    const textSegments = [];
    for (let i = 0; i < numSegments; i++) {
      const start = i * segmentTextLength;
      const end = Math.min(start + segmentTextLength, textLength);
      textSegments.push(textContent.substring(start, end));
    }
    console.log('📊 文本已分为', textSegments.length, '段');
    
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
    const generateVideoSegment = async (segmentText, segmentIndex, retryCount = 0) => {
      const maxRetries = 3;
      let currentText = segmentText;
      
      // 如果已经重试过，简化文本
      if (retryCount > 0) {
        currentText = simplifyText(segmentText, retryCount);
        console.log(`🔄 第 ${segmentIndex + 1}/${numSegments} 段视频重试（第${retryCount}次），简化后文本:`, currentText.substring(0, 50) + '...');
      }
      
      // 根据API文档，使用 --ratio 9:16 --dur 参数格式
      // --ratio 9:16 表示9:16竖屏比例（强制限制）
      // --dur 指定视频时长（秒）
      // 如果是中文视频，添加漫画风格描述
      const styleText = isChineseVideo ? '，漫画风格，动画风格' : '';
      const promptWithParams = `${currentText}${styleText} --ratio 9:16 --dur ${videoSegmentDuration}`;
      
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
              return generateVideoSegment(segmentText, segmentIndex, retryCount + 1);
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
    
    // 生成所有视频段
    for (let i = 0; i < numSegments; i++) {
      console.log(`📹 生成第 ${i + 1}/${numSegments} 段视频...`);
      const segmentVideoUrl = await generateVideoSegment(textSegments[i], i);
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
    
    // 获取拼接后视频的时长
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
router.post('/content/:contentId/generate-video', async (req, res) => {
  let tempVideoPath = null;
  let tempAudioPath = null;
  let tempOutputPath = null;
  
  try {
    console.log('🚀 ========== 生成视频API被调用 ==========');
    console.log('📥 请求参数:', JSON.stringify(req.params, null, 2));
    console.log('📥 请求体:', JSON.stringify(req.body, null, 2));
    
    const { contentId } = req.params;
    const { audioUrl, language = 'zh' } = req.body;

    if (!audioUrl) {
      console.error('❌ 缺少音频URL');
      return res.status(400).json({
        success: false,
        message: '缺少音频URL'
      });
    }

    console.log(`📝 开始处理${language === 'zh' ? '中文' : '英文'}视频生成，ContentId: ${contentId}`);

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

    const silentVideoUrl = contentObj.get('silentVideoUrl');
    console.log('📹 无声视频URL:', silentVideoUrl);
    
    if (!silentVideoUrl) {
      console.error('❌ 无声视频URL不存在');
      return res.status(400).json({
        success: false,
        message: '请先生成无声视频（步骤2）',
        contentId: contentId
      });
    }

    // 更新状态为生成中
    contentObj.set('videoStatus', 'generating');
    await contentObj.save();

    console.log(`📝 开始合并${language === 'zh' ? '中文' : '英文'}视频和音频`);

    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    
    // 下载无声视频
    let finalSilentVideoUrl = silentVideoUrl;
    if (finalSilentVideoUrl.startsWith('http://')) {
      finalSilentVideoUrl = finalSilentVideoUrl.replace('http://', 'https://');
    }
    tempVideoPath = path.join(tempDir, `silent_video_${contentId}_${timestamp}.mp4`);
    console.log('📥 开始下载无声视频:', finalSilentVideoUrl);
    
    let videoResponse;
    try {
      videoResponse = await fetch(finalSilentVideoUrl);
    } catch (fetchError) {
      console.error('❌ 下载无声视频失败（网络错误）:', fetchError);
      throw new Error(`下载无声视频失败（网络错误）: ${fetchError.message}`);
    }
    
    if (!videoResponse.ok) {
      const errorText = await videoResponse.text().catch(() => '无法读取错误响应');
      console.error('❌ 下载无声视频失败:', videoResponse.status, videoResponse.statusText);
      console.error('❌ 错误响应:', errorText.substring(0, 200));
      throw new Error(`下载无声视频失败 (${videoResponse.status}): ${videoResponse.statusText}`);
    }
    
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    await fs.writeFile(tempVideoPath, videoBuffer);
    console.log('✅ 无声视频下载完成，大小:', videoBuffer.length, 'bytes');
    
    // 下载音频
    let finalAudioUrl = audioUrl;
    if (finalAudioUrl.startsWith('http://')) {
      finalAudioUrl = finalAudioUrl.replace('http://', 'https://');
    }
    tempAudioPath = path.join(tempDir, `audio_${contentId}_${timestamp}.mp3`);
    console.log('📥 开始下载音频:', finalAudioUrl);
    
    let audioResponse;
    try {
      audioResponse = await fetch(finalAudioUrl);
    } catch (fetchError) {
      console.error('❌ 下载音频失败（网络错误）:', fetchError);
      throw new Error(`下载音频失败（网络错误）: ${fetchError.message}`);
    }
    
    if (!audioResponse.ok) {
      const errorText = await audioResponse.text().catch(() => '无法读取错误响应');
      console.error('❌ 下载音频失败:', audioResponse.status, audioResponse.statusText);
      console.error('❌ 错误响应:', errorText.substring(0, 200));
      throw new Error(`下载音频失败 (${audioResponse.status}): ${audioResponse.statusText}`);
    }
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    await fs.writeFile(tempAudioPath, audioBuffer);
    console.log('✅ 音频下载完成，大小:', audioBuffer.length, 'bytes');
    
    // 合并视频和音频
    tempOutputPath = path.join(tempDir, `output_${contentId}_${language}_${timestamp}.mp4`);
    console.log('🎞️ 开始合并视频和音频');
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000; // 5分钟超时
      
      const ffmpegProcess = ffmpeg()
        .input(tempVideoPath)
        .input(tempAudioPath)
        .outputOptions([
          '-c:v copy', // 复制视频流（输入视频应该已经是9:16，因为拼接时已设置为720x1280）
          '-c:a aac', // 重新编码音频为AAC
          '-shortest' // 以较短的流为准
        ])
        .output(tempOutputPath)
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
            const fallbackProcess = ffmpeg()
              .input(tempVideoPath)
              .input(tempAudioPath)
              .outputOptions([
                '-c:v libx264',
                '-preset ultrafast',
                '-crf 23',
                '-pix_fmt yuv420p',
                '-s 720x1280', // 强制9:16竖屏分辨率
                '-aspect 9:16', // 设置宽高比
                '-c:a aac',
                '-shortest'
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
    
    // 上传合并后的视频到LeanCloud
    const outputBuffer = await fs.readFile(tempOutputPath);
    const videoFile = new AV.File(`video_${contentId}_${language}_${timestamp}.mp4`, outputBuffer, 'video/mp4');
    await videoFile.save();
    const finalVideoUrl = videoFile.url();
    console.log('✅ 视频上传成功，URL:', finalVideoUrl);
    
    // 更新ExtractedContent记录
    if (language === 'en') {
      contentObj.set('videoUrlEn', finalVideoUrl);
    } else {
      contentObj.set('videoUrl', finalVideoUrl);
    }
    contentObj.set('videoStatus', 'completed');
    await contentObj.save();
    
    // 清理临时文件
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath].filter(Boolean);
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
        videoUrl: finalVideoUrl,
        contentId: contentId,
        language: language
      }
    });
  } catch (error) {
    console.error('❌ 生成视频失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    console.error('❌ 错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('❌ ContentId:', req.params.contentId);
    console.error('❌ AudioUrl:', req.body.audioUrl);
    console.error('❌ Language:', req.body.language);
    
    // 清理临时文件
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath].filter(Boolean);
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('⚠️ 清理临时文件失败:', cleanupError.message);
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

      // 检查是否是网络错误
      if (error.message && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT') || error.message.includes('下载'))) {
        return res.status(500).json({
          success: false,
          message: '下载视频或音频文件失败，请检查网络连接',
          error: error.message,
          suggestion: '请检查silentVideoUrl和audioUrl是否可访问'
        });
      }

      // 检查是否是FFmpeg错误
      if (error.message && (error.message.includes('FFmpeg') || error.message.includes('合并') || error.message.includes('超时'))) {
        return res.status(500).json({
          success: false,
          message: '视频合并失败',
          error: error.message,
          suggestion: '请检查FFmpeg是否正确安装，或重试'
        });
      }

      // 返回详细的错误信息
      const errorResponse = {
        success: false,
        message: '生成视频失败',
        error: error.message || String(error),
        contentId: req.params.contentId
      };
      
      // 在开发环境下返回更多调试信息
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        errorResponse.stack = error.stack;
        errorResponse.details = JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      res.status(500).json(errorResponse);
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
      // 如果是中文视频，添加漫画风格描述
      const styleText = isChineseVideo ? '，漫画风格，动画风格' : '';
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
  let tempVideoPath = null;
  let tempAudioPath = null;
  let tempOutputPath = null;
  
  try {
    const { contentId } = req.params;
    
    console.log('🚀 ========== 生成英文视频API被调用 ==========');
    console.log('📥 contentId:', contentId);
    
    // 获取内容对象
    const contentObj = await new AV.Query('ExtractedContent').get(contentId);
    if (!contentObj) {
      return res.status(404).json({
        success: false,
        message: '内容不存在'
      });
    }
    
    // 检查是否有无声视频
    const silentVideoUrl = contentObj.get('silentVideoUrl');
    if (!silentVideoUrl) {
      return res.status(400).json({
        success: false,
        message: '请先生成无声视频（步骤2）'
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
    let audioText = `${chapterTitleEn}. ${summaryEn}`.trim();
    console.log('📝 英文文本:', audioText.substring(0, 100) + '...');
    console.log('📝 文本长度:', audioText.length, '字符');
    
    // 腾讯云TextToVoice API对文本长度限制较严格，基础语音合成限制为150个汉字
    // 对于英文文本，为了安全起见，限制在150字符以内
    const MAX_TEXT_LENGTH = 150;
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
    
    // 直接使用腾讯云TTS生成英文音频（跳过豆包TTS）
    let audioBuffer;
      
    // 初始化腾讯云TTS客户端和音色类型（在try块外部定义，以便在catch块中使用）
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
      
      // 使用腾讯云TTS生成英文音频
      // 对于英文，使用VoiceType: 1009 (WeWinny)
    // 只使用短文本API（TextToVoice），如果文本太长则截断
      const voiceType = 1009; // WeWinny英文音色
      
    try {
      console.log('🔄 使用腾讯云TTS生成英文音频（短文本API）...');
      console.log('📝 文本长度:', audioText.length, '字符');
      
      const responseData = await tencentTtsClient.TextToVoice({
        Text: audioText,
        SessionId: `session_${contentId}_${Date.now()}`,
        ModelType: 1, // 精品模型（大模型音色）
        VoiceType: voiceType,
        Volume: 0,
        Speed: 0,
        ProjectId: 0,
        SampleRate: 16000,
        Codec: 'mp3'
      });
      
      // 检查错误
      if (responseData.Error) {
        const error = responseData.Error;
        console.error('❌ 腾讯云API错误:', error);
        console.error('❌ 错误代码:', error.Code);
        console.error('❌ 错误消息:', error.Message);
        
        // 特殊处理资源包配额用完错误
        if (error.Code === 'UnsupportedOperation.PkgExhausted') {
          throw new Error('腾讯云资源包配额已用完，请前往腾讯云控制台购买资源包或充值。访问地址：https://console.cloud.tencent.com/tts');
        }
        
        // 如果是文本太长错误，提示用户文本过长
        if (error.Message && (error.Message.includes('Text too long') || error.Message.includes('文本过长') || 
            error.Code === 'InvalidParameterValue.TextTooLong' || error.Code === 'UnsupportedOperation.TextTooLong')) {
          throw new Error(`文本过长（${audioText.length}字符），请缩短文本内容或截断文本`);
        }
        
        // 其他错误直接抛出
        throw new Error(`腾讯云TTS错误: ${error.Message || '未知错误'}`);
      }
      
      if (!responseData.Audio) {
        throw new Error('腾讯云TTS未返回音频数据');
      }
      
      // 解码base64音频数据
      audioBuffer = Buffer.from(responseData.Audio, 'base64');
      console.log('✅ 腾讯云TTS生成英文音频成功，大小:', audioBuffer.length, 'bytes');
    } catch (tencentError) {
      console.error('❌ 腾讯云TTS生成英文音频失败:', tencentError);
      console.error('❌ 错误详情:', JSON.stringify(tencentError, Object.getOwnPropertyNames(tencentError)));
      
      const errorMessage = tencentError.message || '';
      const errorCode = tencentError.code || tencentError.Code || '';
      
      // 特殊处理资源包配额用完错误
      if (errorCode === 'UnsupportedOperation.PkgExhausted' || 
          (errorMessage.toLowerCase().includes('resource pack') && errorMessage.toLowerCase().includes('exhausted')) ||
          (errorMessage.toLowerCase().includes('allowance') && errorMessage.toLowerCase().includes('exhausted'))) {
        throw new Error('腾讯云资源包配额已用完，请前往腾讯云控制台购买资源包或充值。访问地址：https://console.cloud.tencent.com/tts');
      }
      
      // 其他错误直接抛出原始错误消息
      throw new Error(`生成英文音频失败: ${errorMessage || '未知错误'}`);
    }
    
    // 确保audioBuffer已设置
    if (!audioBuffer) {
      throw new Error('未能生成音频数据');
    }
    
    // 保存英文音频
    const audioFile = new AV.File(`audio_en_${contentId}_${Date.now()}.mp3`, audioBuffer, 'audio/mpeg');
    await audioFile.save();
    const englishAudioUrl = audioFile.url();
    console.log('✅ 英文音频生成完成，URL:', englishAudioUrl);
    
    // 更新内容对象
    contentObj.set('audioUrlEn', englishAudioUrl);
    await contentObj.save();
    
    // 步骤2: 合并无声视频和英文音频
    console.log('🎞️ 步骤2: 合并无声视频和英文音频...');
    
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    
    // 下载无声视频
    let finalSilentVideoUrl = silentVideoUrl;
    if (finalSilentVideoUrl.startsWith('http://')) {
      finalSilentVideoUrl = finalSilentVideoUrl.replace('http://', 'https://');
    }
    tempVideoPath = path.join(tempDir, `silent_video_${contentId}_${timestamp}.mp4`);
    const videoResponse = await fetch(finalSilentVideoUrl);
    if (!videoResponse.ok) {
      throw new Error(`下载无声视频失败: ${videoResponse.statusText}`);
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    await fs.writeFile(tempVideoPath, videoBuffer);
    console.log('✅ 无声视频下载完成');
    
    // 下载英文音频
    let finalEnglishAudioUrl = englishAudioUrl;
    if (finalEnglishAudioUrl.startsWith('http://')) {
      finalEnglishAudioUrl = finalEnglishAudioUrl.replace('http://', 'https://');
    }
    tempAudioPath = path.join(tempDir, `audio_en_${contentId}_${timestamp}.mp3`);
    const audioResponse = await fetch(finalEnglishAudioUrl);
    if (!audioResponse.ok) {
      throw new Error(`下载英文音频失败: ${audioResponse.statusText}`);
    }
    const audioBuffer2 = Buffer.from(await audioResponse.arrayBuffer());
    await fs.writeFile(tempAudioPath, audioBuffer2);
    console.log('✅ 英文音频下载完成');
    
    // 合并视频和音频
    tempOutputPath = path.join(tempDir, `output_en_${contentId}_${timestamp}.mp4`);
    console.log('🎞️ 开始合并视频和音频');
    
    await new Promise((resolve, reject) => {
      let timeoutId = null;
      const timeout = 300000; // 5分钟超时
      
      const ffmpegProcess = ffmpeg()
        .input(tempVideoPath)
        .input(tempAudioPath)
        .outputOptions([
          '-c:v copy', // 复制视频流（输入视频应该已经是9:16）
          '-c:a aac',
          '-shortest'
        ])
        .output(tempOutputPath)
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
            const fallbackProcess = ffmpeg()
              .input(tempVideoPath)
              .input(tempAudioPath)
              .outputOptions([
                '-c:v libx264',
                '-preset ultrafast',
                '-crf 23',
                '-pix_fmt yuv420p',
                '-s 720x1280', // 强制9:16竖屏分辨率
                '-aspect 9:16', // 设置宽高比
                '-c:a aac',
                '-shortest'
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
    
    // 清理临时文件
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath];
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`⚠️ 清理临时文件失败: ${filePath}`, err.message);
      }
    }
    
    console.log('✅ 英文视频生成完成');
    
    res.json({
      success: true,
      data: {
        videoUrlEn: finalVideoUrl,
        audioUrlEn: englishAudioUrl,
        chapterTitleEn: chapterTitleEn,
        summaryEn: summaryEn
      }
    });
    
  } catch (error) {
    console.error('❌ 生成英文视频失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    
    // 清理临时文件
    const cleanupFiles = [tempVideoPath, tempAudioPath, tempOutputPath].filter(Boolean);
    for (const filePath of cleanupFiles) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`⚠️ 清理临时文件失败: ${filePath}`, err.message);
      }
    }
    
    res.status(500).json({
      success: false,
      message: `生成英文视频失败: ${error.message}`,
      error: error.message
    });
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

