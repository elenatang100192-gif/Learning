// LeanCloud云函数 - 发送OTP邮件
const AV = require('leancloud-storage');

// 发送OTP邮件的云函数（生产环境需要配置邮件服务）
AV.Cloud.define('sendOTPEmail', async function(request) {
  const { email, otp } = request.params;

  if (!email || !otp) {
    throw new AV.Cloud.Error('Email and OTP are required');
  }

  // 生产环境：这里应该集成实际的邮件服务
  // 目前只记录日志，实际发送邮件需要配置SMTP或其他邮件服务
  console.log(`📧 生产环境OTP邮件: ${email} -> 验证码: ${otp}`);

  // TODO: 集成实际的邮件服务，如：
  // - SendGrid
  // - AWS SES
  // - 阿里云邮件服务
  // - 或其他邮件服务提供商

  // 暂时抛出错误，表示邮件服务未配置
  throw new AV.Cloud.Error('邮件服务未配置，请联系管理员');
});

module.exports = AV.Cloud;
