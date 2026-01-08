const express = require('express');
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
      message: 'Authentication error'
    });
  }
};

// 检查是否已关注（允许未登录用户访问，返回false）
router.get('/:authorId/status', async (req, res) => {
  try {
    const { authorId } = req.params;
    
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
        following: false
      });
    }

    // 验证authorId是否为有效的用户ID格式（LeanCloud ObjectId通常是24位十六进制字符串）
    // 如果authorId是'system-admin'等特殊值，直接返回false
    if (!authorId || authorId === 'system-admin' || !/^[a-f0-9]{24}$/i.test(authorId)) {
      return res.json({
        success: true,
        following: false
      });
    }

    try {
    const authorPointer = AV.Object.createWithoutData('_User', authorId);
    const query = new AV.Query('Follow');
    query.equalTo('follower', currentUser);
    query.equalTo('following', authorPointer);

    const count = await query.count();

    res.json({
      success: true,
      following: count > 0
    });
    } catch (queryError) {
      // 如果Follow类不存在（404错误）或其他查询错误，返回false
      if (queryError.code === 101 || queryError.code === 404) {
        // Follow类不存在，返回false
        return res.json({
          success: true,
          following: false
        });
      }
      // 其他错误，重新抛出
      throw queryError;
    }
  } catch (error) {
    console.error('Check follow status error:', error);
    // 对于任何错误，都返回false而不是500错误，避免影响前端体验
    res.json({
      success: true,
      following: false
    });
  }
});

// 关注/取消关注
router.post('/:authorId/toggle', authenticateUser, async (req, res) => {
  try {
    const { authorId } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // 不能关注自己
    if (currentUser.id === authorId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    const authorPointer = AV.Object.createWithoutData('_User', authorId);
    const query = new AV.Query('Follow');
    query.equalTo('follower', currentUser);
    query.equalTo('following', authorPointer);

    const existingFollow = await query.first();

    if (existingFollow) {
      // 取消关注
      await existingFollow.destroy();
      res.json({
        success: true,
        following: false
      });
    } else {
      // 关注
      const FollowClass = AV.Object.extend('Follow');
      const follow = new FollowClass();
      follow.set('follower', currentUser);
      follow.set('following', authorPointer);
      await follow.save();
      res.json({
        success: true,
        following: true
      });
    }
  } catch (error) {
    console.error('Toggle follow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle follow'
    });
  }
});

module.exports = router;

