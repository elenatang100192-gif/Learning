# 开发模式说明

## OTP 邮箱验证

在开发环境中，由于 LeanCloud 邮件服务的限制和配置要求，我们提供了开发模式的 OTP 功能。

### 开发模式特性

- **随机6位数字OTP**: 生成真正的6位随机数字验证码
- **控制台显示**: OTP码会显示在服务器控制台中
- **自动用户创建**: 如果邮箱不存在，会自动创建用户
- **完整流程测试**: 可以测试完整的登录和注册流程

### 如何使用

1. **发送验证码**:
   ```bash
   POST /api/auth/send-otp
   {
     "email": "your-email@example.com"
   }
   ```

2. **获取OTP验证码**:
   - **前端界面**: 会显示弹窗提示，包含OTP验证码
   - **API响应**: 返回JSON包含 `otp` 字段
   - **控制台日志**: 服务器控制台会显示OTP

3. **使用OTP登录**:
   ```bash
   POST /api/auth/login
   {
     "email": "your-email@example.com",
     "otp": "614632"
   }
   ```

### 开发模式特性

- ✅ **界面显示OTP**: 前端会直接显示生成的OTP验证码
- ✅ **无需邮件**: 不需要真实的邮件服务
- ✅ **完整测试**: 可以测试完整的OTP流程
- ✅ **API返回**: API直接返回OTP用于自动化测试

### 生产环境配置

在生产环境中，需要配置邮件服务：

1. 设置环境变量：
   ```bash
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

2. 部署云函数到 LeanCloud：
   - 将 `cloud.js` 上传到 LeanCloud 云引擎
   - 配置邮件服务设置

### 生产环境配置

在生产环境中，需要正确配置 LeanCloud 邮件服务：

1. 登录 [LeanCloud 控制台](https://console.leancloud.cn/)
2. 进入应用设置 → 邮件
3. 配置邮件模板和SMTP设置
4. 启用邮箱验证功能

### 故障排除

- **邮件未收到**: 检查垃圾邮件文件夹
- **发送频率限制**: LeanCloud 对同一邮箱有发送频率限制
- **邮件服务错误**: 检查 LeanCloud 控制台的邮件配置

### 测试邮件

可以使用测试端点验证邮件服务：

```bash
POST /api/auth/test-email
{
  "email": "your-email@example.com"
}
```

此端点会返回详细的错误信息，帮助诊断邮件服务问题。
