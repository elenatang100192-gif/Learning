# 腾讯云TTS API调用文档

## 目录
1. [概述](#概述)
2. [环境配置](#环境配置)
3. [API初始化](#api初始化)
4. [API接口说明](#api接口说明)
5. [请求参数](#请求参数)
6. [响应格式](#响应格式)
7. [错误处理](#错误处理)
8. [代码示例](#代码示例)
9. [资源包说明](#资源包说明)
10. [常见问题](#常见问题)

---

## 概述

本文档说明如何使用腾讯云语音合成（TTS）API生成中文和英文音频。支持两种模型类型：
- **基础模型（ModelType: 1）**：标准语音合成
- **精品模型/大模型音色（ModelType: 2）**：高质量语音合成，支持长文本

### 支持的API接口

1. **CreateTtsTask**：长文本语音合成（推荐）
   - 支持长文本（无字符数限制）
   - 异步任务模式，需要轮询查询结果
   - 支持基础模型和精品模型

2. **TextToVoice**：短文本语音合成
   - 限制文本长度（通常150-200字符）
   - 同步返回音频数据（base64编码）
   - 仅支持基础模型

---

## 环境配置

### 1. 安装依赖

```bash
npm install tencentcloud-sdk-nodejs
```

### 2. 配置环境变量

在 `.env` 文件或环境变量中配置：

```bash
# 腾讯云API密钥（必填）
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
```

### 3. API端点配置

```javascript
const TENCENT_TTS_ENDPOINT = 'tts.tencentcloudapi.com';
const TENCENT_TTS_REGION = 'ap-guangzhou'; // 推荐使用广州区域
const TENCENT_TTS_VERSION = '2019-08-23';
```

---

## API初始化

### 初始化TTS客户端

```javascript
const tencentcloud = require('tencentcloud-sdk-nodejs');
const TtsClient = tencentcloud.tts.v20190823.Client;

const tencentTtsClient = new TtsClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: 'ap-guangzhou',
  profile: {
    httpProfile: {
      endpoint: 'tts.tencentcloudapi.com',
    },
  },
});
```

---

## API接口说明

### 1. CreateTtsTask（长文本语音合成）

**推荐使用**，支持长文本，无字符数限制。

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Text | String | 是 | 合成语音的文本，最大支持5000字符 |
| ModelType | Integer | 是 | 模型类型：1-基础模型，2-精品模型（大模型音色） |
| VoiceType | Integer | 是 | 音色类型（见下方音色列表） |
| Volume | Integer | 否 | 音量：范围[-10, 10]，0为正常音量，默认0 |
| Speed | Integer | 否 | 语速：范围[-2, 2]，0为正常语速，默认0 |
| ProjectId | Integer | 否 | 项目ID，0表示默认项目，默认0 |
| SampleRate | Integer | 否 | 采样率：16000或8000，默认16000 |
| Codec | String | 否 | 音频格式：mp3、pcm，默认mp3 |

#### 音色类型（VoiceType）

**中文音色：**
- `601013`：长文本语音合成专用音色 - 推荐（用于长文本）
- `1001`：智逍遥（亲和女声）
- `1002`：智聆（亲和男声）
- `1003`：智言（亲和女声）
- `1004`：智娜（亲和女声）

**英文音色：**
- `1005`：智聆（亲和男声）
- `1006`：智言（亲和女声）
- `1007`：智娜（亲和女声）
- `1009`：WeWinny（推荐）

#### 响应格式

```javascript
{
  "Data": {
    "TaskId": "1234567890" // 任务ID，用于查询结果
  },
  "Error": null // 如果有错误，会包含错误信息
}
```

#### 查询任务状态

使用 `DescribeTtsTaskStatus` 接口查询任务状态：

```javascript
const queryParams = {
  TaskId: "1234567890" // CreateTtsTask返回的TaskId
};

const queryResponse = await tencentTtsClient.DescribeTtsTaskStatus(queryParams);
```

**任务状态：**
- `0`：任务等待中
- `1`：任务处理中
- `2`：任务完成
- `3`：任务失败

**成功响应示例：**
```javascript
{
  "Data": {
    "Status": 2, // 任务完成
    "ResultUrl": "https://xxx.com/audio.mp3" // 音频文件URL
  },
  "Error": null
}
```

---

### 2. TextToVoice（短文本语音合成）

**仅用于短文本**，同步返回音频数据。

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Text | String | 是 | 合成语音的文本，限制150-200字符 |
| SessionId | String | 是 | 会话标识符，建议使用唯一ID |
| ModelType | Integer | 是 | 模型类型：1-基础模型（TextToVoice仅支持基础模型） |
| VoiceType | Integer | 是 | 音色类型（同上） |
| Volume | Integer | 否 | 音量：范围[-10, 10]，默认0 |
| Speed | Integer | 否 | 语速：范围[-2, 2]，默认0 |
| ProjectId | Integer | 否 | 项目ID，默认0 |
| SampleRate | Integer | 否 | 采样率：16000或8000，默认16000 |
| Codec | String | 否 | 音频格式：mp3、pcm，默认mp3 |

#### 响应格式

```javascript
{
  "Audio": "base64编码的音频数据", // base64编码的音频文件
  "SessionId": "session_xxx",
  "Error": null
}
```

---

## 请求参数

### 完整请求示例（CreateTtsTask）

```javascript
const params = {
  Text: "这是要合成的文本内容",
  ModelType: 2, // 精品模型（大模型音色）
  VoiceType: 1001, // 中文-智逍遥
  Volume: 0,
  Speed: 0,
  ProjectId: 0,
  SampleRate: 16000,
  Codec: 'mp3'
};

const response = await tencentTtsClient.CreateTtsTask(params);
```

### 完整请求示例（TextToVoice）

```javascript
const params = {
  Text: "Short text for synthesis",
  SessionId: `session_${Date.now()}`,
  ModelType: 1, // 基础模型
  VoiceType: 1009, // 英文-WeWinny
  Volume: 0,
  Speed: 0,
  ProjectId: 0,
  SampleRate: 16000,
  Codec: 'mp3'
};

const response = await tencentTtsClient.TextToVoice(params);
```

---

## 响应格式

### CreateTtsTask响应

**成功响应：**
```javascript
{
  "Data": {
    "TaskId": "1234567890"
  },
  "Error": null
}
```

**错误响应：**
```javascript
{
  "Data": null,
  "Error": {
    "Code": "UnsupportedOperation.PkgExhausted",
    "Message": "资源包配额已用完"
  }
}
```

### DescribeTtsTaskStatus响应

**任务完成：**
```javascript
{
  "Data": {
    "Status": 2,
    "ResultUrl": "https://xxx.com/audio.mp3"
  },
  "Error": null
}
```

**任务处理中：**
```javascript
{
  "Data": {
    "Status": 1
  },
  "Error": null
}
```

### TextToVoice响应

**成功响应：**
```javascript
{
  "Audio": "UklGRiQAAABXQVZFZm10...", // base64编码的音频
  "SessionId": "session_xxx",
  "Error": null
}
```

---

## 错误处理

### 常见错误代码

| 错误代码 | 说明 | 解决方案 |
|---------|------|---------|
| `UnsupportedOperation.PkgExhausted` | 资源包配额已用完 | 购买资源包或降级到基础模型 |
| `InvalidParameterValue.TextTooLong` | 文本过长 | 使用CreateTtsTask API |
| `InvalidParameterValue.VoiceType` | 音色类型错误 | 检查VoiceType参数是否正确 |
| `ResourceInsufficient` | 资源不足 | 检查资源包配额 |

### 错误处理示例

```javascript
try {
  const response = await tencentTtsClient.CreateTtsTask(params);
  
  if (response.Error) {
    const error = response.Error;
    
    // 资源包配额用完，尝试降级到基础模型
    if (error.Code === 'UnsupportedOperation.PkgExhausted') {
      console.log('⚠️ 大模型音色资源包配额已用完，尝试降级到基础模型');
      
      const fallbackParams = {
        ...params,
        ModelType: 1 // 降级到基础模型
      };
      
      const fallbackResponse = await tencentTtsClient.CreateTtsTask(fallbackParams);
      
      if (fallbackResponse.Error) {
        throw new Error('基础模型资源包也已用完');
      }
      
      // 使用降级后的响应
      response = fallbackResponse;
    } else {
      throw new Error(`API错误: ${error.Message}`);
    }
  }
  
  // 处理成功响应
  const taskId = response.Data.TaskId;
  // ... 轮询查询任务状态
  
} catch (error) {
  console.error('TTS API调用失败:', error);
  throw error;
}
```

---

## 代码示例

### 完整示例：生成中文音频（长文本）

```javascript
const tencentcloud = require('tencentcloud-sdk-nodejs');
const TtsClient = tencentcloud.tts.v20190823.Client;

// 初始化客户端
const tencentTtsClient = new TtsClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: 'ap-guangzhou',
  profile: {
    httpProfile: {
      endpoint: 'tts.tencentcloudapi.com',
    },
  },
});

async function generateChineseAudio(text) {
  try {
    // 1. 创建语音合成任务
    const params = {
      Text: text,
      ModelType: 2, // 精品模型（大模型音色）
      VoiceType: 1001, // 中文-智逍遥
      Volume: 0,
      Speed: 0,
      ProjectId: 0,
      SampleRate: 16000,
      Codec: 'mp3'
    };
    
    const response = await tencentTtsClient.CreateTtsTask(params);
    
    if (response.Error) {
      throw new Error(`创建任务失败: ${response.Error.Message}`);
    }
    
    const taskId = response.Data.TaskId;
    console.log('✅ 任务已创建，TaskId:', taskId);
    
    // 2. 轮询查询任务状态
    const maxAttempts = 30; // 最多查询30次
    const pollInterval = 2000; // 每2秒查询一次
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const queryResponse = await tencentTtsClient.DescribeTtsTaskStatus({
        TaskId: taskId
      });
      
      if (queryResponse.Error) {
        throw new Error(`查询任务状态失败: ${queryResponse.Error.Message}`);
      }
      
      const status = queryResponse.Data.Status;
      
      if (status === 2) { // 任务完成
        const audioUrl = queryResponse.Data.ResultUrl;
        console.log('✅ 音频生成完成，URL:', audioUrl);
        return audioUrl;
      } else if (status === 3) { // 任务失败
        throw new Error('任务处理失败');
      }
      
      // 继续等待
      console.log(`⏳ 任务处理中... (${attempt + 1}/${maxAttempts})`);
    }
    
    throw new Error('任务超时');
    
  } catch (error) {
    console.error('❌ 生成音频失败:', error);
    throw error;
  }
}

// 使用示例
generateChineseAudio('这是一段要合成的文本内容')
  .then(audioUrl => {
    console.log('音频URL:', audioUrl);
  })
  .catch(error => {
    console.error('错误:', error);
  });
```

### 完整示例：生成英文音频（短文本）

```javascript
async function generateEnglishAudio(text) {
  try {
    const params = {
      Text: text,
      SessionId: `session_${Date.now()}`,
      ModelType: 1, // 基础模型
      VoiceType: 1009, // 英文-WeWinny
      Volume: 0,
      Speed: 0,
      ProjectId: 0,
      SampleRate: 16000,
      Codec: 'mp3'
    };
    
    const response = await tencentTtsClient.TextToVoice(params);
    
    if (response.Error) {
      throw new Error(`生成音频失败: ${response.Error.Message}`);
    }
    
    // 解码base64音频数据
    const audioBuffer = Buffer.from(response.Audio, 'base64');
    console.log('✅ 音频生成完成，大小:', audioBuffer.length, 'bytes');
    
    return audioBuffer;
    
  } catch (error) {
    console.error('❌ 生成音频失败:', error);
    throw error;
  }
}
```

---

## 资源包说明

### 资源包类型

1. **长文本语音合成-大模型音色-预付费包-50万字符**
   - ModelType: 2（精品模型）
   - 支持长文本（无字符数限制）
   - 高质量语音合成
   - **推荐使用**

2. **长文本语音合成-基础模型-预付费包**
   - ModelType: 1（基础模型）
   - 支持长文本（无字符数限制）
   - 标准语音合成

3. **短文本语音合成-基础模型-预付费包**
   - ModelType: 1（基础模型）
   - 仅支持短文本（150-200字符）
   - TextToVoice API使用

### 购买资源包

1. 登录腾讯云控制台：https://console.cloud.tencent.com/tts
2. 进入"资源包管理"
3. 选择"长文本语音合成-大模型音色-预付费包-50万字符"
4. 购买并激活资源包

### 资源包使用建议

- **优先使用 ModelType: 2（大模型音色）**：音质更好
- **如果大模型音色资源包用完，自动降级到 ModelType: 1（基础模型）**
- **长文本使用 CreateTtsTask API**：无字符数限制
- **短文本可以使用 TextToVoice API**：同步返回，响应更快

---

## 常见问题

### Q1: 如何选择ModelType？

**A:** 
- 如果购买了"长文本语音合成-大模型音色"资源包，使用 `ModelType: 2`
- 如果只有基础模型资源包，使用 `ModelType: 1`
- 代码会自动降级：先尝试 ModelType: 2，失败后自动降级到 ModelType: 1

### Q2: 文本长度限制是多少？

**A:**
- **CreateTtsTask API**：最大支持5000字符，推荐用于长文本
- **TextToVoice API**：限制150-200字符，仅用于短文本

### Q3: 如何选择合适的音色？

**A:**
- **中文**：推荐使用 `1001`（智逍遥-亲和女声）
- **英文**：推荐使用 `1009`（WeWinny）

### Q4: 任务状态查询需要多久？

**A:**
- 通常需要5-30秒
- 建议每2秒查询一次，最多查询30次（60秒超时）

### Q5: 资源包配额用完怎么办？

**A:**
- 代码会自动降级到基础模型
- 如果基础模型也失败，需要购买资源包：
  - 访问：https://console.cloud.tencent.com/tts
  - 购买"长文本语音合成-大模型音色-预付费包-50万字符"

### Q6: 如何提高合成速度？

**A:**
- 使用 TextToVoice API（短文本，同步返回）
- 减少轮询间隔（但不要过于频繁）
- 使用基础模型（ModelType: 1）可能更快

### Q7: 支持哪些音频格式？

**A:**
- `mp3`：推荐，兼容性好
- `pcm`：原始音频格式，需要指定采样率

### Q8: 如何调整音量和语速？

**A:**
- `Volume`：范围[-10, 10]，0为正常音量
- `Speed`：范围[-2, 2]，0为正常语速
- 负数表示降低，正数表示提高

---

## 参考链接

- [腾讯云TTS官方文档](https://cloud.tencent.com/document/product/1073)
- [腾讯云TTS控制台](https://console.cloud.tencent.com/tts)
- [腾讯云SDK文档](https://cloud.tencent.com/document/sdk/Node.js)

---

## 更新日志

- **2024-01-XX**：初始版本
  - 添加CreateTtsTask和TextToVoice API说明
  - 添加自动降级机制
  - 添加完整代码示例

---

## 技术支持

如有问题，请：
1. 查看本文档的"常见问题"部分
2. 查看腾讯云官方文档
3. 联系腾讯云技术支持

