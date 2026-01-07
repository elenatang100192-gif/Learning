const nodemailer = require('nodemailer');

// 创建邮件传输器
let transporter = null;

// 初始化邮件服务
function initEmailService() {
  // 如果已经初始化，直接返回
  if (transporter) {
    return transporter;
  }

  // 从环境变量读取邮件配置
  const emailConfig = {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
    port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
    }
  };

  // 检查是否配置了邮件服务
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn('⚠️ 邮件服务未配置：EMAIL_USER 和 EMAIL_PASS 环境变量未设置');
    return null;
  }

  // 如果没有配置 host，使用常见的邮件服务商默认配置
  if (!emailConfig.host) {
    // 根据邮箱域名自动选择 SMTP 服务器
    const emailDomain = emailConfig.auth.user.split('@')[1];
    if (emailDomain) {
      if (emailDomain.includes('gmail')) {
        emailConfig.host = 'smtp.gmail.com';
        emailConfig.port = 587;
        emailConfig.secure = false;
      } else if (emailDomain.includes('qq')) {
        emailConfig.host = 'smtp.qq.com';
        emailConfig.port = 587;
        emailConfig.secure = false;
      } else if (emailDomain.includes('163')) {
        emailConfig.host = 'smtp.163.com';
        emailConfig.port = 465;
        emailConfig.secure = true;
      } else if (emailDomain.includes('sina')) {
        emailConfig.host = 'smtp.sina.com';
        emailConfig.port = 587;
        emailConfig.secure = false;
      } else if (emailDomain.includes('outlook') || emailDomain.includes('hotmail')) {
        emailConfig.host = 'smtp-mail.outlook.com';
        emailConfig.port = 587;
        emailConfig.secure = false;
      } else {
        console.warn(`⚠️ 无法自动识别邮箱域名 ${emailDomain}，请手动配置 EMAIL_HOST`);
        return null;
      }
    } else {
      console.warn('⚠️ 无法从邮箱地址提取域名，请手动配置 EMAIL_HOST');
      return null;
    }
  }

  try {
    transporter = nodemailer.createTransport(emailConfig);
    console.log(`✅ 邮件服务初始化成功: ${emailConfig.auth.user} (${emailConfig.host}:${emailConfig.port})`);
    return transporter;
  } catch (error) {
    console.error('❌ 邮件服务初始化失败:', error);
    return null;
  }
}

// 发送 OTP 邮件
async function sendOTPEmail(email, otp) {
  try {
    // 初始化邮件服务
    const emailTransporter = initEmailService();
    
    if (!emailTransporter) {
      throw new Error('邮件服务未配置');
    }

    // 邮件内容
    const mailOptions = {
      from: `"VidBrain AI" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: email,
      subject: '您的登录验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ff6b35;">VidBrain AI Short Video Platform</h2>
          <p>您好，</p>
          <p>您正在登录 VidBrain AI Short Video Platform，请使用以下验证码完成登录：</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h1 style="color: #ff6b35; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">验证码有效期为 5 分钟，请勿泄露给他人。</p>
          <p style="color: #666; font-size: 14px;">如果这不是您的操作，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      `,
      text: `您的登录验证码是：${otp}，有效期为 5 分钟。`
    };

    // 发送邮件
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ OTP邮件发送成功: ${email} -> MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ OTP邮件发送失败: ${email}`, error);
    throw error;
  }
}

// 测试邮件服务
async function testEmailService(email) {
  try {
    const emailTransporter = initEmailService();
    
    if (!emailTransporter) {
      throw new Error('邮件服务未配置');
    }

    const mailOptions = {
      from: `"VidBrain AI" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: email,
      subject: '邮件服务测试',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ff6b35;">VidBrain AI Short Video Platform</h2>
          <p>这是一封测试邮件，如果您收到此邮件，说明邮件服务配置成功！</p>
          <p style="color: #666; font-size: 14px;">时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `,
      text: '这是一封测试邮件，如果您收到此邮件，说明邮件服务配置成功！'
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ 测试邮件发送成功: ${email} -> MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ 测试邮件发送失败: ${email}`, error);
    throw error;
  }
}

module.exports = {
  initEmailService,
  sendOTPEmail,
  testEmailService
};

