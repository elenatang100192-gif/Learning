const express = require('express');
const { query, validationResult } = require('express-validator');
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

// 检查是否已收藏（未登录时返回false，不返回401）
router.get('/:videoId/status', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // 尝试获取当前用户（如果未登录，则返回false）
    let currentUser = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const sessionToken = authHeader.substring(7);
        if (sessionToken.startsWith('otp-token-')) {
          const tokenParts = sessionToken.split('-');
          if (tokenParts.length >= 5) {
            const userId = tokenParts.slice(4).join('-');
            currentUser = await new AV.Query(AV.User).get(userId);
          }
        }
      }
    } catch (authError) {
      // 认证失败，用户未登录，返回false
      console.log('用户未登录，返回收藏状态为false');
    }

    // 如果用户未登录，直接返回false
    if (!currentUser) {
      return res.json({
        success: true,
        favorited: false
      });
    }

    const videoPointer = AV.Object.createWithoutData('Video', videoId);
    const query = new AV.Query('Favorite');
    query.equalTo('user', currentUser);
    query.equalTo('video', videoPointer);

    const count = await query.count();

    res.json({
      success: true,
      favorited: count > 0
    });
  } catch (error) {
    console.error('Check favorite status error:', error);
    // 发生错误时也返回false，而不是500错误
    res.json({
      success: true,
      favorited: false
    });
  }
});

// 收藏/取消收藏
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
    const query = new AV.Query('Favorite');
    query.equalTo('user', currentUser);
    query.equalTo('video', videoPointer);

    const existingFavorite = await query.first();

    if (existingFavorite) {
      // 取消收藏
      await existingFavorite.destroy();
      res.json({
        success: true,
        favorited: false
      });
    } else {
      // 收藏
      const FavoriteClass = AV.Object.extend('Favorite');
      const favorite = new FavoriteClass();
      favorite.set('user', currentUser);
      favorite.set('video', videoPointer);
      await favorite.save();
      res.json({
        success: true,
        favorited: true
      });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle favorite'
    });
  }
});

// 获取用户收藏列表
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], authenticateUser, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const query = new AV.Query('Favorite');
    query.equalTo('user', currentUser);
    query.include('video');
    query.include('video.category');
    query.include('video.author');
    query.descending('createdAt');
    query.limit(parseInt(limit));
    query.skip((parseInt(page) - 1) * parseInt(limit));

    const favorites = await query.find();

    const videoData = favorites.map(fav => {
      const video = fav.get('video');
      return {
        id: video.id,
        title: video.get('title'),
        titleEn: video.get('titleEn'),
        category: {
          id: video.get('category').id,
          name: video.get('category').get('name'),
          nameCn: video.get('category').get('nameCn'),
          sortOrder: video.get('category').get('sortOrder')
        },
        videoUrl: video.get('videoUrl'),
        coverUrl: video.get('coverUrl'),
        duration: video.get('duration') || 0,
        fileSize: video.get('fileSize'),
        status: video.get('status'),
        disabled: video.get('disabled'),
        viewCount: video.get('viewCount') || 0,
        likeCount: video.get('likeCount') || 0,
        uploadDate: video.createdAt.toISOString().split('T')[0],
        publishDate: video.get('publishDate'),
        author: video.get('author') ? {
          id: video.get('author').id,
          username: video.get('author').get('username'),
          email: video.get('author').get('email'),
          avatar: video.get('author').get('avatar'),
          joinDate: video.get('author').createdAt.toISOString().split('T')[0],
          totalVideos: video.get('author').get('totalVideos') || 0,
          totalViews: video.get('author').get('totalViews') || 0,
          canPublish: video.get('author').get('canPublish') !== false,
          canComment: video.get('author').get('canComment') !== false
        } : undefined
      };
    });

    res.json({
      success: true,
      data: videoData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get favorites'
    });
  }
});

module.exports = router;
