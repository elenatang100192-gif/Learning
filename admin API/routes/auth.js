const express = require('express');
const { body, validationResult } = require('express-validator');
const AV = require('leancloud-storage');
const { sendOTPEmail, testEmailService } = require('../utils/email');

const router = express.Router();

// 测试邮件服务
router.post('/test-email', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    console.log(`📧 测试邮件发送到: ${email}`);

    try {
      // 优先使用 nodemailer 发送测试邮件
      await testEmailService(email);
      console.log(`✅ 测试邮件发送成功: ${email}`);

      res.json({
        success: true,
        message: 'Test email sent successfully. Please check your inbox and spam folder.'
      });
    } catch (emailError) {
      console.error(`❌ 邮件服务错误详情:`, {
        email,
        error: emailError.message,
        stack: emailError.stack
      });

      // 如果 nodemailer 失败，尝试使用 LeanCloud 邮件服务（备用方案）
      try {
        await AV.User.requestEmailVerify(email);
        console.log(`✅ LeanCloud邮件服务测试成功: ${email}`);

        res.json({
          success: true,
          message: 'Test email sent successfully via LeanCloud. Please check your inbox and spam folder.'
        });
      } catch (leancloudError) {
      res.status(500).json({
        success: false,
        message: `邮件服务错误: ${emailError.message}`,
          details: '请检查邮件服务配置（EMAIL_USER 和 EMAIL_PASS）或 LeanCloud 控制台的邮件配置'
      });
      }
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email service'
    });
  }
});

// 存储OTP验证码的内存缓存（生产环境应该使用Redis）
const otpCache = new Map();

// 生成6位随机数字验证码
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送OTP验证码
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // 检查用户是否存在（只允许后台管理创建的用户）
    let userQuery = new AV.Query(AV.User);
    userQuery.equalTo('email', email);
    const existingUser = await userQuery.first();

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在，请联系管理员注册账号'
      });
    }

    // 生成6位随机OTP验证码
    const otp = generateOTP();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10分钟后过期（增加有效期，避免生产环境问题）

    // 存储OTP到缓存
    otpCache.set(email, { otp, expiresAt });

    console.log(`📧 发送OTP验证码到邮箱: ${email}`);
    console.log(`🔢 生成的OTP: ${otp} (有效期10分钟)`);
    console.log(`📋 过期时间: ${new Date(expiresAt).toISOString()}`);
    console.log(`📋 当前缓存大小: ${otpCache.size}`);
    console.log(`🌍 环境: NODE_ENV=${process.env.NODE_ENV || '未设置'}`);

    // 开发模式：显示OTP并返回给前端
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔍 开发模式：OTP验证码是 ${otp} (用于邮箱: ${email})`);
      console.log(`💡 提示：开发模式下OTP会返回给前端显示，可用于测试登录`);

      return res.json({
        success: true,
        message: 'OTP generated successfully (development mode)',
        note: `开发模式：您的OTP验证码是 ${otp}。请使用此验证码登录。`,
        otp: otp, // 在开发模式下直接返回OTP，方便前端显示
        development: true
      });
    }

    // 生产环境：发送包含OTP的邮件
    try {
      await sendOTPEmail(email, otp);
      
      console.log(`✅ OTP邮件发送成功: ${email}`);

      return res.json({
        success: true,
        message: 'OTP verification code has been sent to your email. Please check your inbox and spam folder.'
      });
    } catch (emailError) {
      console.error(`❌ 邮件服务错误:`, emailError);
      console.error(`📋 错误详情:`, {
        message: emailError.message,
        stack: emailError.stack,
        envCheck: {
          EMAIL_USER: process.env.EMAIL_USER ? '已设置' : '未设置',
          EMAIL_PASS: process.env.EMAIL_PASS ? '已设置' : '未设置',
          EMAIL_HOST: process.env.EMAIL_HOST || '未设置',
          EMAIL_PORT: process.env.EMAIL_PORT || '未设置',
          EMAIL_SECURE: process.env.EMAIL_SECURE || '未设置',
          NODE_ENV: process.env.NODE_ENV || '未设置'
        }
      });

      // 清除缓存的OTP
      otpCache.delete(email);

      // 检查是否是配置问题
      if (emailError.message.includes('未配置') || emailError.message.includes('not configured')) {
        return res.status(500).json({
          success: false,
          message: '生产环境邮件服务未配置，请使用开发模式或联系管理员',
          details: emailError.message,
          hint: '请确保在 CloudBase Run 控制台中配置了 EMAIL_USER、EMAIL_PASS、EMAIL_HOST、EMAIL_PORT、EMAIL_SECURE 环境变量，并重启服务'
        });
      }

      return res.status(500).json({
        success: false,
        message: '邮件服务暂时不可用，请稍后再试',
        details: emailError.message,
        hint: '请检查邮件服务配置和网络连接，或查看服务器日志获取更多信息'
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

// 邮箱登录
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;

    console.log(`🔐 登录请求: email=${email}, otp=${otp}`);
    console.log(`📋 当前OTP缓存大小: ${otpCache.size}`);
    console.log(`📋 缓存中的邮箱:`, Array.from(otpCache.keys()));

    // 验证OTP
    const cachedOTP = otpCache.get(email);

    if (!cachedOTP) {
      console.warn(`⚠️ OTP未找到: email=${email}`);
      console.warn(`📋 可能的原因: 1) OTP已过期 2) 服务器重启导致内存缓存丢失 3) 使用了不同的服务器实例`);
      return res.status(401).json({
        success: false,
        message: 'OTP not found or expired. Please request a new one.',
        hint: '生产环境：如果服务器重启，OTP缓存会丢失。请重新请求验证码。'
      });
    }

    console.log(`✅ 找到缓存的OTP: email=${email}, expiresAt=${new Date(cachedOTP.expiresAt).toISOString()}`);

    // 检查OTP是否过期
    const now = Date.now();
    if (now > cachedOTP.expiresAt) {
      console.warn(`⚠️ OTP已过期: email=${email}, expiresAt=${new Date(cachedOTP.expiresAt).toISOString()}, now=${new Date(now).toISOString()}`);
      otpCache.delete(email);
      return res.status(401).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // 验证OTP是否正确
    console.log(`🔍 验证OTP: 输入=${otp}, 缓存=${cachedOTP.otp}, 匹配=${cachedOTP.otp === otp}`);
    if (cachedOTP.otp !== otp) {
      console.warn(`⚠️ OTP不匹配: email=${email}, 输入=${otp}, 期望=${cachedOTP.otp}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP code. Please check your code and try again.'
      });
    }

    // OTP验证成功，清除缓存
    otpCache.delete(email);

    let user;

    // 查找用户（只允许后台管理创建的用户登录）
    let userQuery = new AV.Query(AV.User);
    userQuery.equalTo('email', email);
    user = await userQuery.first();

    if (!user) {
      // 如果用户不存在，返回用户不存在错误
      return res.status(404).json({
        success: false,
        message: '用户不存在，请联系管理员注册账号'
      });
    }

    // 生成session token (包含用户ID以便后续验证)
    const sessionToken = `otp-token-${Date.now()}-${Math.random()}-${user.id}`;
    user._sessionToken = sessionToken;

    // 获取用户详细信息
    const userData = {
      id: user.id,
      username: user.get('username') || user.get('email'),
      email: user.get('email'),
      avatar: user.get('avatar'),
      joinDate: user.createdAt.toISOString().split('T')[0],
      totalVideos: user.get('totalVideos') || 0,
      totalViews: user.get('totalViews') || 0,
      canPublish: user.get('canPublish') !== false,
      canComment: user.get('canComment') !== false
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      sessionToken: user.getSessionToken()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
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

// 获取当前用户信息
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const currentUser = req.user;

    const userData = {
      id: currentUser.id,
      username: currentUser.get('username') || currentUser.get('email'),
      email: currentUser.get('email'),
      avatar: currentUser.get('avatar'),
      joinDate: currentUser.createdAt.toISOString().split('T')[0],
      totalVideos: currentUser.get('totalVideos') || 0,
      totalViews: currentUser.get('totalViews') || 0,
      canPublish: currentUser.get('canPublish') !== false,
      canComment: currentUser.get('canComment') !== false
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info'
    });
  }
});

// 登出
router.post('/logout', async (req, res) => {
  try {
    await AV.User.logOut();
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router;
