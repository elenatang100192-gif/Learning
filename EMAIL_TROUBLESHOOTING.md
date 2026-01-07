# 🔧 邮件服务故障排查指南

## 问题：生产环境邮件服务未配置

### 错误信息
```
生产环境邮件服务未配置，请使用开发模式或联系管理员
```

### 快速检查清单

#### ✅ 步骤 1: 检查环境变量是否已配置

在 CloudBase Run 控制台检查以下环境变量是否都已设置：

| 变量名 | 必需 | 示例值 |
|--------|------|--------|
| `EMAIL_USER` | ✅ 是 | `elenatang1001@163.com` |
| `EMAIL_PASS` | ✅ 是 | `TANGlin1001` |
| `EMAIL_HOST` | ⚠️ 建议 | `smtp.163.com` |
| `EMAIL_PORT` | ⚠️ 建议 | `465` |
| `EMAIL_SECURE` | ⚠️ 建议 | `true` |

**⚠️ 重要**：
- 如果只设置了 `EMAIL_USER` 和 `EMAIL_PASS`，系统会自动识别 163 邮箱并配置 `EMAIL_HOST`、`EMAIL_PORT`、`EMAIL_SECURE`
- 但建议明确设置所有变量，避免自动识别失败

#### ✅ 步骤 2: 检查环境变量值

1. **变量名是否正确**（区分大小写）：
   - ✅ 正确：`EMAIL_USER`、`EMAIL_PASS`
   - ❌ 错误：`email_user`、`Email_User`

2. **变量值是否正确**：
   - ✅ 正确：`elenatang1001@163.com`（没有多余空格）
   - ❌ 错误：` elenatang1001@163.com `（前后有空格）

3. **密码是否正确**：
   - 163 邮箱可能需要使用**授权码**而不是普通密码
   - 如果普通密码无法发送，请获取授权码

#### ✅ 步骤 3: 重启服务

**⚠️ 重要**：修改环境变量后，必须重启服务才能生效！

1. 在 CloudBase Run 服务详情页面
2. 点击 **重启服务** 或 **重新部署**
3. 等待服务重启完成（通常需要 1-2 分钟）

#### ✅ 步骤 4: 查看服务日志

1. 在服务详情页面，点击 **日志** 标签
2. 查找以下日志信息：

**如果配置正确，应该看到**：
```
✅ 邮件服务初始化成功: elenatang1001@163.com (smtp.163.com:465, secure: true)
```

**如果配置错误，可能看到**：
```
⚠️ 邮件服务未配置：EMAIL_USER 和 EMAIL_PASS 环境变量未设置
📋 当前环境变量状态:
   EMAIL_USER: 未设置
   EMAIL_PASS: 未设置
```

#### ✅ 步骤 5: 测试邮件服务

使用 API 测试端点验证邮件服务：

```bash
POST https://video-app-backend-215072-7-1319956699.sh.run.tcloudbase.com/api/auth/test-email
Content-Type: application/json

{
  "email": "test@example.com"
}
```

**预期结果**：
- ✅ 成功：返回 `{"success": true, "message": "Test email sent successfully..."}`
- ❌ 失败：返回错误信息，查看 `details` 字段获取更多信息

---

## 🔍 详细排查步骤

### 问题 1: 环境变量未设置

**症状**：
- 日志显示：`EMAIL_USER: 未设置` 或 `EMAIL_PASS: 未设置`

**解决方案**：
1. 登录 CloudBase Run 控制台
2. 进入服务详情 → 环境变量
3. 添加缺失的环境变量
4. **重启服务**

### 问题 2: 环境变量值错误

**症状**：
- 日志显示环境变量已设置，但邮件服务初始化失败

**检查清单**：
- ✅ 变量值没有前后空格
- ✅ 邮箱地址格式正确（包含 `@`）
- ✅ 密码/授权码正确
- ✅ 变量名大小写正确

**解决方案**：
1. 删除错误的环境变量
2. 重新添加正确的环境变量
3. **重启服务**

### 问题 3: 163 邮箱密码问题

**症状**：
- 环境变量已设置，但邮件发送失败
- 错误信息可能包含：`Invalid login`、`Authentication failed`

**原因**：
- 163 邮箱可能需要使用**授权码**而不是普通密码

**解决方案**：

1. **获取 163 邮箱授权码**：
   - 登录 163 邮箱
   - 点击 **设置** → **POP3/SMTP/IMAP**
   - 开启 **POP3/SMTP服务** 或 **IMAP/SMTP服务**
   - 点击 **客户端授权密码** → **开启**
   - 设置授权密码并保存
   - 复制授权码（16位字符）

2. **更新环境变量**：
   ```
   EMAIL_PASS=你的授权码（不是普通密码）
   ```

3. **重启服务**

### 问题 4: 服务未重启

**症状**：
- 环境变量已配置，但服务仍然报错

**解决方案**：
1. 在 CloudBase Run 服务详情页面
2. 点击 **重启服务**
3. 等待重启完成
4. 再次测试

### 问题 5: 端口和 SSL 配置错误

**163 邮箱正确配置**：
```
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_SECURE=true
```

**常见错误**：
- ❌ `EMAIL_PORT=587`（163 邮箱应使用 465）
- ❌ `EMAIL_SECURE=false`（465 端口必须使用 SSL）

**解决方案**：
1. 确保 `EMAIL_PORT=465`
2. 确保 `EMAIL_SECURE=true`
3. 重启服务

---

## 📋 完整配置示例（163 邮箱）

在 CloudBase Run 控制台配置以下环境变量：

```
EMAIL_USER=elenatang1001@163.com
EMAIL_PASS=TANGlin1001
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_SECURE=true
```

**配置步骤**：
1. 登录 CloudBase Run 控制台
2. 进入服务详情 → 环境变量
3. 逐个添加上述环境变量
4. **重要**：点击 **重启服务** 使配置生效
5. 等待服务重启完成
6. 查看日志确认配置成功

---

## 🔗 相关文档

- [邮件服务配置指南](./EMAIL_CONFIGURATION_GUIDE.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [故障排查指南](./TROUBLESHOOTING.md)

---

**最后更新**: 2026-01-07

