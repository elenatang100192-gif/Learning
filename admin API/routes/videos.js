const express = require('express');
const AV = require('leancloud-storage');

const router = express.Router();

console.log('🎥 Videos router loaded!');

// 测试路由
router.get('/test', (req, res) => {
  console.log('🎯 Test route hit!');
  res.json({ success: true, message: 'Videos router working!' });
});

// 获取视频列表
router.get('/', async (req, res) => {
  console.log('🎬 Videos API HIT! URL:', req.url);
  console.log('📋 Raw query:', req.query);
  console.log('📋 Parsed category:', req.query.category);

  try {
    const { category, status = '已发布', page = 1, limit = 20 } = req.query;

    console.log('🎬 Videos API HIT! URL:', req.url);
    console.log('📋 Raw query:', req.query);
    console.log('📋 Parsed status:', status);

    const query = new AV.Query('Video');

    // 过滤条件
    if (category) {
      // 按nameCn（中文名称）查询分类，查找所有匹配的分类
      const categoryQuery = new AV.Query('Category');
      categoryQuery.equalTo('nameCn', category);
      const categoryObjs = await categoryQuery.find();

      if (categoryObjs && categoryObjs.length > 0) {
        // 如果有多个分类，使用包含查询（查询关联到任意一个分类的视频）
        if (categoryObjs.length === 1) {
          console.log(`使用分类: ${categoryObjs[0].get('nameCn')} (ID: ${categoryObjs[0].id}, name: ${categoryObjs[0].get('name')})`);
          query.equalTo('category', categoryObjs[0]);
        } else {
          console.log(`找到 ${categoryObjs.length} 个匹配的分类，使用包含查询`);
          console.log(`分类列表:`, categoryObjs.map(c => ({ id: c.id, name: c.get('name'), nameCn: c.get('nameCn') })));
          // 使用包含查询，匹配任意一个分类
          query.containedIn('category', categoryObjs);
        }
      } else {
        console.log(`未找到分类: ${category}`);
      }
    }

    if (status) {
      query.equalTo('status', status);
      console.log(`设置status过滤: ${status}`);
      
      // 如果状态是'已发布'，同时过滤掉已禁用的视频
      if (status === '已发布') {
        query.equalTo('disabled', false);
        console.log('已发布状态：同时过滤已禁用的视频');
      }
    }

    // 只获取已发布的视频，除非明确指定其他状态
    if (!req.query.status) {
      query.equalTo('status', '已发布');
      query.equalTo('disabled', false);
      console.log('使用默认过滤: 已发布且未禁用');
    }

    // 排序：优先按displayOrder排序（升序），然后按createdAt排序（降序）
    // displayOrder为null/undefined的视频会排在后面
    query.addAscending('displayOrder');
    query.descending('createdAt');

    // 分页
    query.limit(parseInt(limit));
    query.skip((parseInt(page) - 1) * parseInt(limit));
    
    // 去重：确保同一个视频（相同title和videoUrl）只返回一次
    // 注意：LeanCloud查询本身不支持去重，需要在应用层处理

    // 包含关联对象
    query.include('category');
    query.include('author');
    query.include('book');

    const videos = await query.find();

    // 手动排序：确保displayOrder为null/undefined的视频排在后面
    // LeanCloud的addAscending可能会把null值排在最前面，所以需要手动处理
    videos.sort((a, b) => {
      const orderA = a.get('displayOrder');
      const orderB = b.get('displayOrder');
      
      // 如果两个都有displayOrder，按升序排序
      if (orderA !== null && orderA !== undefined && orderB !== null && orderB !== undefined) {
        if (orderA !== orderB) {
          return orderA - orderB; // 升序：1 < 2 < 3
        }
        // 如果displayOrder相同，按createdAt降序排序（最新的在前）
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      // 如果只有A有displayOrder，A排在前面
      else if (orderA !== null && orderA !== undefined && (orderB === null || orderB === undefined)) {
        return -1;
      }
      // 如果只有B有displayOrder，B排在前面
      else if ((orderA === null || orderA === undefined) && orderB !== null && orderB !== undefined) {
        return 1;
      }
      // 如果两个都没有displayOrder，按createdAt降序排序（最新的在前）
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // 转换数据格式
    const videoData = videos.map(video => {
      const author = video.get('author');
      // 如果没有作者（后台发布的视频），创建默认作者信息
      const authorData = author ? {
        id: author.id,
        username: author.get('username'),
        email: author.get('email'),
        avatar: author.get('avatar'),
        joinDate: author.createdAt.toISOString().split('T')[0],
        totalVideos: author.get('totalVideos') || 0,
        totalViews: author.get('totalViews') || 0,
        canPublish: author.get('canPublish') !== false,
        canComment: author.get('canComment') !== false
      } : {
        id: 'system-admin',
        username: 'Ashley HR Center',
        usernameCn: '爱室丽人力中心',
        email: 'admin@ashleyfurniture.com',
        avatar: null,
        joinDate: new Date().toISOString().split('T')[0],
        totalVideos: 0,
        totalViews: 0,
        canPublish: false,
        canComment: false
      };

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
        videoUrlEn: video.get('videoUrlEn') || null,
        coverUrl: video.get('coverUrl'),
        duration: video.get('duration') || 0,
        fileSize: video.get('fileSize'),
        status: video.get('status'),
        disabled: video.get('disabled'),
        viewCount: Math.max(0, video.get('viewCount') || 0),
        likeCount: Math.max(0, video.get('likeCount') || 0), // 确保不会是负数
        uploadDate: video.createdAt.toISOString().split('T')[0],
        publishDate: video.get('publishDate'),
        displayOrder: video.get('displayOrder') || undefined,
        author: authorData,
        book: video.get('book') ? {
          id: video.get('book').id,
          title: video.get('book').get('title'),
          author: video.get('book').get('author')
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
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get videos'
    });
  }
});

// 获取单个视频详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = new AV.Query('Video');
    query.include('category');
    query.include('author');

    const video = await query.get(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const videoData = {
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
      author: (() => {
        const author = video.get('author');
        if (author) {
          return {
            id: author.id,
            username: author.get('username'),
            email: author.get('email'),
            avatar: author.get('avatar'),
            joinDate: author.createdAt.toISOString().split('T')[0],
            totalVideos: author.get('totalVideos') || 0,
            totalViews: author.get('totalViews') || 0,
            canPublish: author.get('canPublish') !== false,
            canComment: author.get('canComment') !== false
          };
        } else {
          // 后台发布的视频，没有author，返回默认作者信息
          return {
            id: 'system-admin',
            username: 'Ashley HR Center',
            usernameCn: '爱室丽人力中心',
            email: 'admin@ashleyfurniture.com',
            avatar: null,
            joinDate: new Date().toISOString().split('T')[0],
            totalVideos: 0,
            totalViews: 0,
            canPublish: false,
            canComment: false
          };
        }
      })()
    };

    res.json({
      success: true,
      data: videoData
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video'
    });
  }
});

// 增加观看次数
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    const video = AV.Object.createWithoutData('Video', id);
    video.increment('viewCount', 1);
    await video.save();

    console.log(`👁️ 视频 ${id} 观看次数 +1`);

    res.json({
      success: true,
      message: 'View count incremented'
    });
  } catch (error) {
    console.error('Increment view count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment view count'
    });
  }
});

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

// 记录观看历史
router.post('/:id/watch', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // 检查是否已存在观看记录
    const existingQuery = new AV.Query('WatchHistory');
    existingQuery.equalTo('user', currentUser);
    existingQuery.equalTo('video', AV.Object.createWithoutData('Video', id));
    existingQuery.descending('watchedAt');
    existingQuery.limit(1);

    const existingHistory = await existingQuery.first();

    if (existingHistory) {
      // 更新观看时间
      existingHistory.set('watchedAt', new Date());
      await existingHistory.save();
      console.log(`📺 更新观看历史: 用户 ${currentUser.id} 视频 ${id}`);
    } else {
      // 创建新的观看记录
      const watchHistory = new AV.Object('WatchHistory');
      watchHistory.set('user', currentUser);
      watchHistory.set('video', AV.Object.createWithoutData('Video', id));
      watchHistory.set('watchedAt', new Date());
      await watchHistory.save();
      console.log(`📺 创建观看历史: 用户 ${currentUser.id} 视频 ${id}`);
    }

    res.json({
      success: true,
      message: 'Watch history recorded'
    });
  } catch (error) {
    console.error('Record watch history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record watch history'
    });
  }
});

// 发布视频到待审核状态（后台管理使用，使用Master Key绕过ACL）
router.post('/publish', async (req, res) => {
  try {
    const { title, titleEn, categoryId, videoUrl, videoUrlEn, coverUrl, duration } = req.body;

    // 验证：必须有标题（title或titleEn至少一个）、分类ID、以及视频URL（videoUrl或videoUrlEn至少一个）
    if ((!title && !titleEn) || !categoryId || (!videoUrl && !videoUrlEn)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title or titleEn, categoryId, videoUrl or videoUrlEn'
      });
    }

    // 获取分类对象（使用Master Key）
    const category = await new AV.Query('Category').get(categoryId, { useMasterKey: true });
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // 创建视频对象
    const VideoClass = AV.Object.extend('Video');
    const video = new VideoClass();

    // 设置标题：如果只有titleEn，则titleEn作为主标题；如果只有title，则title作为主标题
    video.set('title', title || titleEn || ''); // 至少有一个（已验证）
    video.set('titleEn', titleEn || title || ''); // 如果只有一个，则两个字段都设置相同的值
    video.set('category', category);
    // 后台管理发布时，如果没有指定author，可以设置为null或使用系统用户
    // 这里先不设置author，如果需要可以后续添加
    video.set('videoUrl', videoUrl || '');
    if (videoUrlEn) {
      video.set('videoUrlEn', videoUrlEn);
    }
    video.set('coverUrl', coverUrl || '');
    video.set('duration', duration || 0);
    video.set('status', '待审核'); // 设置为待审核状态
    video.set('disabled', false);
    video.set('viewCount', 0);
    video.set('likeCount', 0);
    video.set('fileSize', 0); // 可以后续更新

    // 保存视频（使用Master Key）
    await video.save(null, { useMasterKey: true });

    console.log(`📹 后台管理发布视频: ${title} (ID: ${video.id}), 时长: ${duration}秒`);

    // 重新获取视频以包含关联对象
    const savedVideo = await new AV.Query('Video').get(video.id, { useMasterKey: true });
    await savedVideo.fetch({ useMasterKey: true }, { include: ['category', 'book'] });

    // 返回视频数据
    const author = savedVideo.get('author');
    // 如果没有作者（后台发布的视频），创建默认作者信息
    const authorData = author ? {
      id: author.id,
      username: author.get('username'),
      email: author.get('email'),
      avatar: author.get('avatar'),
      joinDate: author.createdAt.toISOString().split('T')[0],
      totalVideos: author.get('totalVideos') || 0,
      totalViews: author.get('totalViews') || 0,
      canPublish: author.get('canPublish') !== false,
      canComment: author.get('canComment') !== false
    } : {
      id: 'system-admin',
      username: 'Ashley HR Center',
      usernameCn: '爱室丽人力中心',
      email: 'admin@ashleyfurniture.com',
      avatar: null,
      joinDate: new Date().toISOString().split('T')[0],
      totalVideos: 0,
      totalViews: 0,
      canPublish: false,
      canComment: false
    };

    const videoData = {
      id: savedVideo.id,
      title: savedVideo.get('title'),
      titleEn: savedVideo.get('titleEn'),
      category: {
        id: category.id,
        name: category.get('name'),
        nameCn: category.get('nameCn'),
        sortOrder: category.get('sortOrder')
      },
      videoUrl: savedVideo.get('videoUrl'),
      videoUrlEn: savedVideo.get('videoUrlEn') || null,
      coverUrl: savedVideo.get('coverUrl'),
      duration: savedVideo.get('duration') || 0,
      fileSize: savedVideo.get('fileSize'),
      status: savedVideo.get('status'),
      disabled: savedVideo.get('disabled'),
      viewCount: savedVideo.get('viewCount') || 0,
      likeCount: savedVideo.get('likeCount') || 0,
      uploadDate: savedVideo.createdAt.toISOString().split('T')[0],
      publishDate: null, // 待审核状态下没有发布日期
      author: authorData,
      book: savedVideo.get('book') ? {
        id: savedVideo.get('book').id,
        title: savedVideo.get('book').get('title'),
        author: savedVideo.get('book').get('author')
      } : undefined
    };

    res.status(201).json({
      success: true,
      message: 'Video submitted for review successfully',
      data: videoData
    });

  } catch (error) {
    console.error('Publish video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish video'
    });
  }
});

// 审核视频（后台管理使用，使用Master Key绕过ACL）
router.put('/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    // 获取视频对象（使用Master Key）
    const video = await new AV.Query('Video').get(id, { useMasterKey: true });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // 更新视频状态（使用Master Key）
    if (action === 'approve') {
      video.set('status', '已发布');
      video.set('disabled', false); // 确保审核通过后视频是启用状态
      video.set('publishDate', new Date().toISOString().split('T')[0]);
      if (notes) {
        video.set('reviewNotes', notes);
      }
    } else {
      video.set('status', '已驳回');
      if (notes) {
        video.set('reviewNotes', notes);
      }
    }

    await video.save(null, { useMasterKey: true });

    console.log(`✅ 视频审核完成: ${id} - ${action === 'approve' ? '已发布' : '已驳回'}`);

    res.json({
      success: true,
      message: action === 'approve' ? 'Video approved and published' : 'Video rejected',
      data: {
        id: video.id,
        status: video.get('status'),
        publishDate: video.get('publishDate'),
        reviewNotes: video.get('reviewNotes')
      }
    });

  } catch (error) {
    console.error('Review video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review video',
      error: error.message
    });
  }
});

// 禁用/启用视频（后台管理使用，使用Master Key绕过ACL）
router.put('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { disabled } = req.body;

    if (typeof disabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Invalid disabled value. Must be boolean'
      });
    }

    // 获取视频对象（使用Master Key）
    const video = await new AV.Query('Video').get(id, { useMasterKey: true });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // 更新禁用状态（使用Master Key）
    video.set('disabled', disabled);
    await video.save(null, { useMasterKey: true });

    console.log(`🔄 视频状态更新: ${id} - ${disabled ? '已禁用' : '已启用'}`);

    res.json({
      success: true,
      message: disabled ? 'Video disabled' : 'Video enabled',
      data: {
        id: video.id,
        disabled: video.get('disabled')
      }
    });

  } catch (error) {
    console.error('Toggle video status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle video status',
      error: error.message
    });
  }
});

// 更新视频分类（后台管理使用，使用Master Key绕过ACL）
router.put('/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Missing categoryId'
      });
    }

    // 获取分类对象（使用Master Key）
    const category = await new AV.Query('Category').get(categoryId, { useMasterKey: true });
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // 获取视频对象（使用Master Key）
    const video = await new AV.Query('Video').get(id, { useMasterKey: true });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // 更新视频分类（使用Master Key）
    video.set('category', category);
    await video.save(null, { useMasterKey: true });

    console.log(`✅ 视频分类更新: ${id} - ${category.get('nameCn')}`);

    res.json({
      success: true,
      message: 'Video category updated successfully',
      data: {
        id: video.id,
        category: {
          id: category.id,
          name: category.get('name'),
          nameCn: category.get('nameCn')
        }
      }
    });

  } catch (error) {
    console.error('Update video category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video category',
      error: error.message
    });
  }
});

// 更新视频显示顺序（后台管理使用，使用Master Key绕过ACL）
router.put('/:id/displayOrder', async (req, res) => {
  try {
    const { id } = req.params;
    const { displayOrder } = req.body;

    if (displayOrder === undefined || displayOrder === null) {
      return res.status(400).json({
        success: false,
        message: 'Missing displayOrder'
      });
    }

    if (typeof displayOrder !== 'number' || displayOrder < 0) {
      return res.status(400).json({
        success: false,
        message: 'displayOrder must be a non-negative number'
      });
    }

    // 获取视频对象（使用Master Key）
    const video = await new AV.Query('Video').get(id, { useMasterKey: true });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // 更新视频显示顺序（使用Master Key）
    video.set('displayOrder', displayOrder);
    await video.save(null, { useMasterKey: true });

    console.log(`✅ 视频显示顺序更新: ${id} - displayOrder: ${displayOrder}`);

    res.json({
      success: true,
      message: 'Video display order updated successfully',
      data: {
        id: video.id,
        displayOrder: displayOrder
      }
    });

  } catch (error) {
    console.error('Update video display order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video display order',
      error: error.message
    });
  }
});

// 删除视频（使用Master Key绕过ACL）
router.delete('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: '缺少视频ID'
      });
    }

    // 使用Master Key删除视频
    AV.Cloud.useMasterKey();
    const video = AV.Object.createWithoutData('Video', videoId);
    await video.destroy({ useMasterKey: true });

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除失败'
    });
  }
});

module.exports = router;
