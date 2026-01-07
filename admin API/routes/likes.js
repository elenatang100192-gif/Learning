const express = require('express');
const AV = require('leancloud-storage');

const router = express.Router();

// 用户认证中间件 - 从session token恢复用户信息
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // 我们的session token格式是: otp-token-{timestamp}-{random}-{userId}
    if (!sessionToken.startsWith('otp-token-')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token'
      });
    }

    // 从token中提取用户ID
    const tokenParts = sessionToken.split('-');
    if (tokenParts.length >= 5) {
      const userId = tokenParts.slice(4).join('-'); // 处理userId中可能包含的'-'字符

      try {
        // 从LeanCloud获取用户信息
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
      message: 'Authentication error'
    });
  }
};

// 检查是否已点赞（允许未登录用户访问，返回false）
router.get('/:videoId/status', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // 尝试获取当前用户（如果已登录）
    const authHeader = req.headers.authorization;
    let currentUser = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionToken = authHeader.substring(7);
      if (sessionToken.startsWith('otp-token-')) {
        const tokenParts = sessionToken.split('-');
        if (tokenParts.length >= 5) {
          const userId = tokenParts.slice(4).join('-');
          try {
            currentUser = await new AV.Query(AV.User).get(userId);
          } catch (error) {
            // 用户不存在或token无效，继续执行
          }
        }
      }
    }

    // 如果用户未登录，返回false
    if (!currentUser) {
      return res.json({
        success: true,
        liked: false
      });
    }

    const videoPointer = AV.Object.createWithoutData('Video', videoId);
    const query = new AV.Query('Like');
    query.equalTo('user', currentUser);
    query.equalTo('video', videoPointer);

    const count = await query.count();

    res.json({
      success: true,
      liked: count > 0
    });
  } catch (error) {
    console.error('Check like status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check like status'
    });
  }
});

// 点赞/取消点赞
router.post('/:videoId/toggle', authenticateUser, async (req, res) => {
  try {
    const { videoId } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const videoPointer = AV.Object.createWithoutData('Video', videoId);
    const query = new AV.Query('Like');
    query.equalTo('user', currentUser);
    query.equalTo('video', videoPointer);

    const existingLike = await query.first();

    if (existingLike) {
      // 取消点赞
      await existingLike.destroy();
      
      // 先获取当前视频的点赞数，确保不会减到负数
      const currentVideo = await new AV.Query('Video').get(videoId);
      const currentLikeCount = currentVideo.get('likeCount') || 0;
      
      // 减少视频点赞数，但确保不会小于0
      const video = AV.Object.createWithoutData('Video', videoId);
      if (currentLikeCount > 0) {
      video.increment('likeCount', -1);
      await video.save();
      } else {
        // 如果已经是0或负数，直接设置为0
        video.set('likeCount', 0);
        await video.save();
      }

      // 重新获取视频以获取更新后的点赞数
      const updatedVideo = await new AV.Query('Video').get(videoId);
      const likeCount = Math.max(0, updatedVideo.get('likeCount') || 0); // 确保不会是负数

      res.json({
        success: true,
        liked: false,
        likeCount
      });
    } else {
      // 点赞
      const LikeClass = AV.Object.extend('Like');
      const like = new LikeClass();
      like.set('user', currentUser);
      like.set('video', videoPointer);
      await like.save();

      // 增加视频点赞数 - 使用 createWithoutData（与 videos.js 中的 viewCount 方式一致）
      const video = AV.Object.createWithoutData('Video', videoId);
      video.increment('likeCount', 1);
      await video.save();

      // 重新获取视频以获取更新后的点赞数
      const updatedVideo = await new AV.Query('Video').get(videoId);
      const likeCount = Math.max(0, updatedVideo.get('likeCount') || 0); // 确保不会是负数

      res.json({
        success: true,
        liked: true,
        likeCount
      });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    });
  }
});

module.exports = router;
