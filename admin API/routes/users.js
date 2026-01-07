const express = require('express');
const { query, body, validationResult } = require('express-validator');
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

// 获取用户列表（管理员功能）
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }

    const { page = 1, limit = 20, search = '' } = req.query;

    // 查询用户
    const userQuery = new AV.Query(AV.User);
    userQuery.limit(parseInt(limit));
    userQuery.skip((parseInt(page) - 1) * parseInt(limit));
    userQuery.descending('createdAt');

    // 如果有搜索条件，添加搜索过滤
    if (search) {
      userQuery.matches('username', new RegExp(search, 'i'));
    }

    // 先获取总数
    const countQuery = new AV.Query(AV.User);
    if (search) {
      countQuery.matches('username', new RegExp(search, 'i'));
    }
    const total = await countQuery.count();

    const users = await userQuery.find();

    const userData = users.map(user => ({
      id: user.id,
      username: user.get('username'),
      email: user.get('email'),
      createdAt: user.createdAt,
      totalVideos: user.get('totalVideos') || 0,
      totalViews: user.get('totalViews') || 0,
      canPublish: user.get('canPublish') !== false,
      canComment: user.get('canComment') !== false
    }));

    res.json({
      success: true,
      data: userData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total
      }
    });
  } catch (error) {
    console.error('Get users list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users list'
    });
  }
});

// 创建新用户
router.post('/', [
  body('email').isEmail().normalizeEmail(),
  body('username').optional({ checkFalsy: true }).isLength({ min: 2, max: 50 }),
  body('canPublish').optional().isBoolean(),
  body('canComment').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { email, username, canPublish = true, canComment = true } = req.body;

    // 检查邮箱是否已存在
    const userQuery = new AV.Query(AV.User);
    userQuery.equalTo('email', email);
    const existingUser = await userQuery.first();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // 创建新用户
    const user = new AV.User();
    user.set('email', email);
    user.set('username', username || email.split('@')[0]); // 如果没有用户名，使用邮箱前缀
    user.set('canPublish', canPublish);
    user.set('canComment', canComment);

    // 生成随机密码（用户将通过OTP登录，不会使用密码）
    const randomPassword = Math.random().toString(36).slice(-12) + 'A1!';
    user.set('password', randomPassword);

    // 保存用户
    await user.save();

    const userData = {
      id: user.id,
      username: user.get('username'),
      email: user.get('email'),
      avatar: user.get('avatar'),
      joinDate: user.createdAt.toISOString().split('T')[0],
      totalVideos: user.get('totalVideos') || 0,
      totalViews: user.get('totalViews') || 0,
      canPublish: user.get('canPublish'),
      canComment: user.get('canComment')
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: userData
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// 获取用户发布记录
router.get('/publications', [
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

    const query = new AV.Query('Video');
    query.equalTo('author', currentUser);
    query.include('category');
    query.descending('createdAt');
    query.limit(parseInt(limit));
    query.skip((parseInt(page) - 1) * parseInt(limit));

    const videos = await query.find();

    const videoData = videos.map(video => ({
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
      publishDate: video.get('publishDate')
    }));

    res.json({
      success: true,
      data: videoData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user publications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user publications'
    });
  }
});

// 获取观看历史
router.get('/watch-history', [
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

    const query = new AV.Query('WatchHistory');
    query.equalTo('user', currentUser);
    query.include('video');
    query.include('video.category');
    query.include('video.author');
    query.descending('watchedAt');
    query.limit(parseInt(limit));
    query.skip((parseInt(page) - 1) * parseInt(limit));

    const histories = await query.find();

    const videoData = histories.map(history => {
      const video = history.get('video');
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
    console.error('Get watch history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get watch history'
    });
  }
});

// 获取用户统计数据
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // 1. 获赞总数：该用户发布的视频的likeCount之和（只统计已发布状态的）
    const videoQuery = new AV.Query('Video');
    videoQuery.equalTo('author', currentUser);
    videoQuery.equalTo('status', '已发布');
    const userVideos = await videoQuery.find();
    const totalLikes = userVideos.reduce((sum, video) => {
      return sum + (video.get('likeCount') || 0);
    }, 0);

    // 2. 发布数量：该用户发布的视频数量（只统计已发布状态的）
    const publishedCount = userVideos.length;

    // 3. 关注数：该用户关注的作者数量
    let followingCount = 0;
    try {
      const followingQuery = new AV.Query('Follow');
      followingQuery.equalTo('follower', currentUser);
      followingCount = await followingQuery.count();
    } catch (error) {
      // 如果Follow表不存在（404错误）或其他错误，返回0
      if (error.code === 404 || error.message?.includes('doesn\'t exists')) {
        console.log('Follow表不存在，关注数返回0');
      } else {
        console.error('查询关注数失败:', error);
      }
      followingCount = 0;
    }

    // 4. 粉丝数：关注该用户的作者数量
    let followersCount = 0;
    try {
      const followersQuery = new AV.Query('Follow');
      followersQuery.equalTo('following', currentUser);
      followersCount = await followersQuery.count();
    } catch (error) {
      // 如果Follow表不存在（404错误）或其他错误，返回0
      if (error.code === 404 || error.message?.includes('doesn\'t exists')) {
        console.log('Follow表不存在，粉丝数返回0');
      } else {
        console.error('查询粉丝数失败:', error);
      }
      followersCount = 0;
    }

    // 5. 收藏数：该用户收藏的视频数量
    const favoriteQuery = new AV.Query('Favorite');
    favoriteQuery.equalTo('user', currentUser);
    const favoritesCount = await favoriteQuery.count();

    res.json({
      success: true,
      data: {
        totalLikes,
        publishedCount,
        followingCount,
        followersCount,
        favoritesCount
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user stats'
    });
  }
});

// 修改用户权限（管理员功能）
router.put('/:userId/permissions', [
  body('canPublish').optional().isBoolean(),
  body('canComment').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { canPublish, canComment } = req.body;

    if (canPublish === undefined && canComment === undefined) {
      return res.status(400).json({
        success: false,
        message: '至少需要提供一个权限字段（canPublish 或 canComment）'
      });
    }

    // 使用Master Key获取用户
    AV.Cloud.useMasterKey();
    const user = await new AV.Query(AV.User).get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新权限
    if (canPublish !== undefined) {
      user.set('canPublish', canPublish);
    }
    if (canComment !== undefined) {
      user.set('canComment', canComment);
    }

    await user.save(null, { useMasterKey: true });

    const userData = {
      id: user.id,
      username: user.get('username'),
      email: user.get('email'),
      canPublish: user.get('canPublish') !== false,
      canComment: user.get('canComment') !== false
    };

    res.json({
      success: true,
      message: '用户权限更新成功',
      user: userData
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新用户权限失败'
    });
  }
});

// 删除用户（管理员功能）
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少用户ID'
      });
    }

    // 使用Master Key获取用户
    AV.Cloud.useMasterKey();
    const user = await new AV.Query(AV.User).get(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 删除用户（使用Master Key绕过ACL）
    await user.destroy({ useMasterKey: true });

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除用户失败'
    });
  }
});

module.exports = router;
