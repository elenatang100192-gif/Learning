# 📧 邮件服务配置指南

## 概述

本指南详细说明如何在 CloudBase Run 控制台配置邮件服务环境变量，以便在生产环境中发送 OTP 验证码邮件。

---

## 📋 配置步骤

### 步骤 1: 登录 CloudBase 控制台

1. 访问 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 使用你的腾讯云账号登录
3. 选择你的环境（如：`video-app-env`）

### 步骤 2: 进入云托管服务管理

1. 在左侧导航栏，点击 **云托管**
2. 点击 **服务管理**
3. 找到你的后端服务（如：`video-app-backend`）
4. 点击服务名称进入服务详情页面

### 步骤 3: 进入环境变量配置

1. 在服务详情页面，找到 **环境变量** 或 **Environment Variables** 标签/部分
2. 点击 **添加环境变量** 或 **新增环境变量** 按钮

### 步骤 4: 配置邮件服务环境变量

根据你使用的邮箱服务商，选择以下配置方式之一：

#### 方式 1: 使用 Gmail（推荐）

**配置步骤**：

1. **获取 Gmail 应用专用密码**：
   - 登录你的 Google 账号
   - 访问 [Google 账号安全设置](https://myaccount.google.com/security)
   - 确保已启用 **两步验证**
   - 进入 **应用专用密码** 页面
   - 生成一个新的应用专用密码（选择"邮件"和"其他设备"）
   - 复制生成的 16 位密码（格式：`xxxx xxxx xxxx xxxx`，去掉空格）

2. **在 CloudBase Run 中配置环境变量**：

   点击 **添加环境变量**，逐个添加以下变量：

   | 变量名 | 变量值 | 说明 |
   |--------|--------|------|
   | `EMAIL_USER` | `your-email@gmail.com` | 你的 Gmail 邮箱地址 |
   | `EMAIL_PASS` | `your-app-password` | Gmail 应用专用密码（16位） |
   | `EMAIL_HOST` | `smtp.gmail.com` | Gmail SMTP 服务器地址 |
   | `EMAIL_PORT` | `587` | SMTP 端口 |
   | `EMAIL_SECURE` | `false` | 是否使用 SSL（587端口使用false） |

   **示例**：
   ```
   EMAIL_USER=yourname@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   ```

#### 方式 2: 使用 QQ 邮箱

**配置步骤**：

1. **获取 QQ 邮箱授权码**：
   - 登录 QQ 邮箱
   - 点击 **设置** → **账户**
   - 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
   - 开启 **POP3/SMTP服务** 或 **IMAP/SMTP服务**
   - 点击 **生成授权码**
   - 按照提示发送短信验证
   - 复制生成的授权码（16位字符）

2. **在 CloudBase Run 中配置环境变量**：

   | 变量名 | 变量值 | 说明 |
   |--------|--------|------|
   | `EMAIL_USER` | `your-qq-number@qq.com` | 你的 QQ 邮箱地址 |
   | `EMAIL_PASS` | `your-authorization-code` | QQ 邮箱授权码 |
   | `EMAIL_HOST` | `smtp.qq.com` | QQ 邮箱 SMTP 服务器 |
   | `EMAIL_PORT` | `587` | SMTP 端口 |
   | `EMAIL_SECURE` | `false` | 是否使用 SSL |

   **示例**：
   ```
   EMAIL_USER=123456789@qq.com
   EMAIL_PASS=abcdefghijklmnop
   EMAIL_HOST=smtp.qq.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   ```

#### 方式 3: 使用 163 邮箱（推荐，国内用户）

**配置步骤**：

1. **获取 163 邮箱授权码**（如果普通密码无法发送）：
   - 登录 163 邮箱
   - 点击 **设置** → **POP3/SMTP/IMAP**
   - 开启 **POP3/SMTP服务** 或 **IMAP/SMTP服务**
   - 点击 **客户端授权密码** → **开启**
   - 设置授权密码并保存
   - 复制授权码（16位字符）

2. **在 CloudBase Run 中配置环境变量**：

   | 变量名 | 变量值 | 说明 |
   |--------|--------|------|
   | `EMAIL_USER` | `elenatang1001@163.com` | 你的 163 邮箱地址 |
   | `EMAIL_PASS` | `TANGlin1001` | 163 邮箱密码或授权码 |
   | `EMAIL_HOST` | `smtp.163.com` | 163 邮箱 SMTP 服务器 |
   | `EMAIL_PORT` | `465` | SMTP 端口（163使用465） |
   | `EMAIL_SECURE` | `true` | 是否使用 SSL（465端口使用true） |

   **实际配置示例**：
   ```
   EMAIL_USER=elenatang1001@163.com
   EMAIL_PASS=TANGlin1001
   EMAIL_HOST=smtp.163.com
   EMAIL_PORT=465
   EMAIL_SECURE=true
   ```

   **⚠️ 重要提示**：
   - **配置后必须重启服务**：修改环境变量后，需要在 CloudBase Run 控制台重启服务
   - **密码问题**：如果普通密码无法发送邮件，请使用 163 邮箱的授权码
   - **端口和 SSL**：163 邮箱必须使用 465 端口和 SSL 加密（`EMAIL_SECURE=true`）
   - **自动识别**：如果只设置 `EMAIL_USER` 和 `EMAIL_PASS`，系统会自动识别 163 邮箱并配置其他参数
   - **验证配置**：配置完成后，查看服务日志确认是否显示 `✅ 邮件服务初始化成功`

#### 方式 4: 使用自定义 SMTP 服务器

如果你的公司有自定义的邮件服务器，可以配置：

| 变量名 | 变量值 | 说明 |
|--------|--------|------|
| `EMAIL_USER` | `your-email@yourdomain.com` | 你的邮箱地址 |
| `EMAIL_PASS` | `your-password` | 邮箱密码或授权码 |
| `EMAIL_HOST` | `smtp.yourdomain.com` | SMTP 服务器地址 |
| `EMAIL_PORT` | `587` 或 `465` | SMTP 端口 |
| `EMAIL_SECURE` | `false` 或 `true` | 是否使用 SSL（587用false，465用true） |

**或者使用别名变量**（兼容性）：

| 变量名 | 变量值 | 说明 |
|--------|--------|------|
| `SMTP_USER` | `your-email@example.com` | 邮箱地址（别名） |
| `SMTP_PASS` | `your-password` | 邮箱密码（别名） |
| `SMTP_HOST` | `smtp.example.com` | SMTP 服务器（别名） |
| `SMTP_PORT` | `587` | SMTP 端口（别名） |

---

## 🔍 详细操作截图说明

### CloudBase Run 环境变量配置界面

1. **找到环境变量配置位置**：
   ```
   服务详情页面
   ├── 基本信息
   ├── 版本管理
   ├── 环境变量 ← 点击这里
   ├── 日志
   └── 监控
   ```

2. **添加环境变量**：
   - 点击 **添加环境变量** 按钮
   - 在弹出的对话框中：
     - **变量名**：输入 `EMAIL_USER`
     - **变量值**：输入你的邮箱地址（如：`yourname@gmail.com`）
     - **是否加密**：建议勾选（对于包含密码的变量）
   - 点击 **确定** 保存

3. **重复添加其他变量**：
   - 按照上述步骤，逐个添加所有邮件服务相关的环境变量
   - 确保变量名和变量值都正确

---

## ✅ 配置完成后的验证

### 方法 1: 查看环境变量列表

1. 在环境变量页面，确认所有变量都已添加：
   - ✅ `EMAIL_USER`
   - ✅ `EMAIL_PASS`
   - ✅ `EMAIL_HOST`
   - ✅ `EMAIL_PORT`
   - ✅ `EMAIL_SECURE`

### 方法 2: 重启服务

1. 配置完环境变量后，需要重启服务使配置生效：
   - 在服务详情页面，点击 **重启服务** 或 **重新部署**
   - 等待服务重启完成（通常需要 1-2 分钟）

### 方法 3: 测试邮件发送

1. **使用 API 测试端点**：
   ```bash
   POST https://your-backend-url/api/auth/test-email
   Content-Type: application/json
   
   {
     "email": "test@example.com"
   }
   ```

2. **检查服务日志**：
   - 在服务详情页面，点击 **日志** 标签
   - 查看是否有邮件发送成功的日志：
     ```
     ✅ 邮件服务初始化成功: your-email@gmail.com (smtp.gmail.com:587)
     ✅ 测试邮件发送成功: test@example.com -> MessageId: ...
     ```

---

## ⚠️ 常见问题

### 问题 1: Gmail 提示"不允许使用安全性较低的应用"

**解决方案**：
- 使用 **应用专用密码** 而不是普通密码
- 确保已启用两步验证
- 如果仍然失败，检查 Google 账号安全设置

### 问题 2: QQ 邮箱授权码获取失败

**解决方案**：
- 确保已开启 POP3/SMTP 服务
- 按照提示完成短信验证
- 授权码生成后立即复制，不要刷新页面

### 问题 3: 邮件发送失败

**检查清单**：
- ✅ 环境变量是否全部配置
- ✅ 变量名是否正确（区分大小写）
- ✅ 变量值是否正确（没有多余空格）
- ✅ 服务是否已重启
- ✅ SMTP 服务器地址和端口是否正确
- ✅ 邮箱密码/授权码是否正确

### 问题 5: 环境变量不生效

**解决方案**：
- 确保服务已重启
- 检查环境变量是否在正确的环境中（生产环境）
- 查看服务日志，确认环境变量是否被正确读取

---

## 📝 配置示例总结

### 完整配置示例（Gmail）

```bash
EMAIL_USER=yourname@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### 完整配置示例（QQ 邮箱）

```bash
EMAIL_USER=123456789@qq.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### 完整配置示例（163 邮箱）

```bash
EMAIL_USER=elenatang1001@163.com
EMAIL_PASS=TANGlin1001
EMAIL_HOST=smtp.163.com
EMAIL_PORT=465
EMAIL_SECURE=true
```

**注意**：如果使用普通密码无法发送邮件，请使用 163 邮箱的授权码替代密码。

---

## 🔗 相关文档

- [CloudBase Run 文档](https://cloud.tencent.com/document/product/876)
- [Gmail 应用专用密码设置](https://support.google.com/accounts/answer/185833)
- [QQ 邮箱 SMTP 设置](https://service.mail.qq.com/cgi-bin/help?subtype=1&&id=28&&no=1001256)
- [163 邮箱 SMTP 设置](https://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305f)

---

**最后更新**: 2026-01-07

