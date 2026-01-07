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

// 获取视频评论数量（允许未登录用户访问）
router.get('/:videoId/count', async (req, res) => {
  try {
    const { videoId } = req.params;

    const videoPointer = AV.Object.createWithoutData('Video', videoId);
    const query = new AV.Query('Comment');
    query.equalTo('video', videoPointer);
    const count = await query.count();

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get comment count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comment count'
    });
  }
});

// 获取视频评论列表（允许未登录用户访问）
router.get('/:videoId', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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

    const { videoId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const videoPointer = AV.Object.createWithoutData('Video', videoId);
    const query = new AV.Query('Comment');
    query.equalTo('video', videoPointer);
    query.include('user');
    query.descending('createdAt');
    query.limit(limit);
    query.skip((page - 1) * limit);

    const comments = await query.find();

    const commentData = comments.map(comment => {
      const user = comment.get('user');
      return {
        id: comment.id,
        content: comment.get('content'),
        user: {
          id: user.id,
          username: user.get('username'),
          email: user.get('email'),
          avatar: user.get('avatar'),
          joinDate: user.createdAt.toISOString().split('T')[0],
          totalVideos: user.get('totalVideos') || 0,
          totalViews: user.get('totalViews') || 0,
          canPublish: user.get('canPublish') !== false,
          canComment: user.get('canComment') !== false
        },
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString()
      };
    });

    res.json({
      success: true,
      data: commentData
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comments'
    });
  }
});

// 添加评论（需要登录且有评论权限）
router.post('/:videoId', authenticateUser, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // 检查用户是否有评论权限
    const canComment = currentUser.get('canComment');
    if (canComment === false) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to comment'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const videoPointer = AV.Object.createWithoutData('Video', videoId);
    const CommentClass = AV.Object.extend('Comment');
    const comment = new CommentClass();

    comment.set('content', content.trim());
    comment.set('user', currentUser);
    comment.set('video', videoPointer);

    const savedComment = await comment.save();

    const commentData = {
      id: savedComment.id,
      content: savedComment.get('content'),
      user: {
        id: currentUser.id,
        username: currentUser.get('username'),
        email: currentUser.get('email'),
        avatar: currentUser.get('avatar'),
        joinDate: currentUser.createdAt.toISOString().split('T')[0],
        totalVideos: currentUser.get('totalVideos') || 0,
        totalViews: currentUser.get('totalViews') || 0,
        canPublish: currentUser.get('canPublish') !== false,
        canComment: currentUser.get('canComment') !== false
      },
      createdAt: savedComment.createdAt.toISOString(),
      updatedAt: savedComment.updatedAt.toISOString()
    };

    res.json({
      success: true,
      data: commentData
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

module.exports = router;

