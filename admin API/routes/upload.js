const express = require('express');
const multer = require('multer');
const AV = require('leancloud-storage');

const router = express.Router();
// 用户认证中间件
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const sessionToken = authHeader.substring(7);

    if (!sessionToken.startsWith('otp-token-')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token'
      });
    }

    const tokenParts = sessionToken.split('-');
    if (tokenParts.length >= 5) {
      const userId = tokenParts.slice(4).join('-');

      try {
        const user = await new AV.Query(AV.User).get(userId);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (error) {
        console.error('User lookup error:', error);
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed - user not found'
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};


// 配置multer内存存储
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// 上传视频文件（需要认证）
router.post('/video', authenticateUser, upload.single('video'), async (req, res) => {
  // 设置上传请求超时时间为5分钟
  req.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    const { originalname, buffer, mimetype } = req.file;

    // 上传到LeanCloud存储
    const avFile = new AV.File(originalname, buffer, mimetype);
    const uploadedFile = await avFile.save();

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        url: uploadedFile.url(),
        filename: uploadedFile.name(),
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video'
    });
  }
});

// 上传封面图片（需要认证）
router.post('/cover', authenticateUser, upload.single('cover'), async (req, res) => {
  // 设置上传请求超时时间为5分钟
  req.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No cover image provided'
      });
    }

    const { originalname, buffer, mimetype } = req.file;

    // 上传到LeanCloud存储
    const avFile = new AV.File(originalname, buffer, mimetype);
    const uploadedFile = await avFile.save();

    res.json({
      success: true,
      message: 'Cover image uploaded successfully',
      data: {
        url: uploadedFile.url(),
        filename: uploadedFile.name(),
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('Cover upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload cover image'
    });
  }
});

// 后台管理上传视频文件（使用Master Key，不需要认证）
router.post('/admin/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    const { originalname, buffer, mimetype } = req.file;

    // 使用Master Key上传到LeanCloud存储
    // 注意：AV.File.save() 的 useMasterKey 选项需要作为第二个参数传递
    AV.Cloud.useMasterKey();
    const avFile = new AV.File(originalname, buffer, mimetype);
    const uploadedFile = await avFile.save();

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        url: uploadedFile.url(),
        filename: uploadedFile.name(),
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('Admin video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: error.message
    });
  }
});

// 后台管理上传封面图片（使用Master Key，不需要认证）
router.post('/admin/cover', upload.single('cover'), async (req, res) => {
  // 设置上传请求超时时间为5分钟
  req.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No cover image provided'
      });
    }

    const { originalname, buffer, mimetype } = req.file;

    // 使用Master Key上传到LeanCloud存储
    AV.Cloud.useMasterKey();
    const avFile = new AV.File(originalname, buffer, mimetype);
    const uploadedFile = await avFile.save();

    res.json({
      success: true,
      message: 'Cover image uploaded successfully',
      data: {
        url: uploadedFile.url(),
        filename: uploadedFile.name(),
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('Admin cover upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload cover image',
      error: error.message
    });
  }
});

module.exports = router;
