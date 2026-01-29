# Project Setup Guide: Knowledge Video App

## 📋 Project Overview

**Project Name**: Knowledge Video App

**Description**: A knowledge-sharing mobile application that converts book highlights into engaging videos through AI technology, providing users with an immersive learning experience. The app supports both iOS and Android platforms and can be published to App Store and Google Play.

**Core Concept**: Similar to TikTok's vertical video browsing experience, but focused on educational content across three categories: Technology, Arts & Humanities, and Business.

---

## 🏗️ Technical Architecture

### Project Structure

```
Learning/
├── frontend/              # User-facing Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # UI Components
│   │   │   ├── contexts/      # React Context (Language, Auth)
│   │   │   └── services/      # API Services
│   │   └── styles/            # CSS Styles
│   └── package.json
│
├── admin/                # Admin Management Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Admin UI Components
│   │   │   └── services/      # Admin API Services
│   │   └── styles/
│   └── package.json
│
└── admin API/            # Backend API Server
    ├── routes/           # API Routes
    │   ├── books.js      # Book management & video generation
    │   ├── videos.js     # Video management
    │   ├── users.js      # User management
    │   └── ...
    ├── server.js         # Express server entry point
    └── package.json
```

---

## 🎨 Frontend Technology Stack

### User-Facing Application (`frontend/`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | Frontend framework |
| **TypeScript** | Latest | Type safety and better DX |
| **Vite** | 6.3.5 | Build tool and dev server |
| **Tailwind CSS** | 4.1.12 | Utility-first CSS framework |
| **Radix UI** | Latest | Accessible UI primitives |
| **shadcn/ui** | Latest | High-quality component system |
| **LeanCloud SDK** | 4.14.0 | BaaS client for data & auth |

**Key Features**:
- Vertical video feed (TikTok-style scrolling)
- Category tabs (Technology, Arts & Humanities, Business)
- Video playback with controls
- Like, comment, favorite, share functionality
- OTP email authentication (only `@ashleyfurniture.com` domain)
- Bilingual support (Chinese/English)

### Admin Dashboard (`admin/`)

**Same tech stack as frontend**, with additional admin-specific components:
- Book management interface
- Video review workflow
- User management
- Statistics dashboard
- Content moderation tools

---

## ⚙️ Backend Technology Stack

### Core Backend (`admin API/`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express** | 4.18.2 | Web framework |
| **LeanCloud** | Latest | BaaS platform (Database + Auth) |
| **阿里云OSS** | Latest | Object storage for videos/images |
| **FFmpeg** | Latest | Video processing & subtitle embedding |
| **Nodemailer** | 7.0.12 | Email service (OTP codes) |

### Key Dependencies

```json
{
  "leancloud-storage": "^4.14.0",      // Database & Auth
  "ali-oss": "^6.23.0",                // File storage
  "fluent-ffmpeg": "^2.1.3",           // Video processing
  "express": "^4.18.2",                // Web server
  "tencentcloud-sdk-nodejs": "^4.1.163", // Tencent Cloud TTS
  "pdf-parse": "^1.1.1",               // PDF parsing
  "epub2": "^3.0.2",                   // EPUB parsing
  "canvas": "^3.2.0",                  // Image processing
  "nodemailer": "^7.0.12"              // Email sending
}
```

---

## 🤖 AI Tools & Services Integration

### 1. Book Content Extraction

**Service**: Deepseek API
- **API Endpoint**: `https://api.deepseek.com/v1/chat/completions`
- **Use Case**: 
  - Book decomposition and analysis
  - Content extraction and summarization
  - Video script outline generation
- **Configuration**: Set `DEEPSEEK_API_KEY` environment variable

### 2. Text-to-Speech (TTS)

**Service**: Tencent Cloud TTS
- **Documentation**: https://cloud.tencent.com/document/product/1073/34079
- **Use Case**: Convert Chinese/English text to speech audio
- **Configuration**:
  - `TENCENT_SECRET_ID`: Tencent Cloud Secret ID
  - `TENCENT_SECRET_KEY`: Tencent Cloud Secret Key
- **Features**:
  - Multiple voice options
  - Natural-sounding speech
  - Support for Chinese and English

### 3. Text-to-Video Generation

**Service**: Doubao-Seedance-1.5-pro (ByteDance)
- **Model ID**: `doubao-seedance-1-5-pro-251215`
- **API Endpoint**: `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks`
- **Documentation**: https://www.volcengine.com/docs/82379/1520758?lang=zh
- **Use Case**: Generate video from text prompts
- **Configuration**: Set `ARK_API_KEY` or `DOUBAO_API_KEY` environment variable

### 4. Image Generation

**Service**: OpenAI DALL-E (Azure AI Foundry)
- **Model**: DALL-E 3
- **API Endpoint**: `https://[your-endpoint]/openai/deployments/[deployment-name]/images/generations?api-version=2024-02-15-preview`
- **API Key**: `cfbf57ca067949419e00faba7441f21f`
- **Documentation**: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/reference-preview-latest?view=foundry-classic#create-transcription
- **Use Case**: Generate cover images for videos
- **Configuration**: 
  - Set `OPENAI_API_KEY` environment variable (default: `cfbf57ca067949419e00faba7441f21f`)
  - Set `OPENAI_ENDPOINT` environment variable (e.g., `https://your-resource.openai.azure.com`)
  - Set `OPENAI_DEPLOYMENT_NAME` environment variable (default: `dall-e-3`)
  - Set `OPENAI_API_VERSION` environment variable (default: `2024-02-15-preview`)
- **Previous Service**: Doubao-Seedream-4-0 (已替换)

### 5. Image-to-Video Generation

**Service**: Alibaba Cloud DashScope (通义万相)
- **API Endpoint**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/generation`
- **Use Case**: Generate video from cover images
- **Configuration**: Set `DASHSCOPE_API_KEY` environment variable

---

## 🔄 Video Generation Workflow

### Complete Pipeline

```
1. Book Upload
   ↓
2. AI Content Extraction (Deepseek)
   - Extract key concepts
   - Generate chapter summaries
   - Create video script outline
   ↓
3. Text-to-Speech (Tencent Cloud TTS)
   - Generate Chinese audio
   - Generate English audio
   ↓
4. Cover Image Generation
   - Generate from text using OpenAI DALL-E 3 (Azure AI Foundry)
   - Previous: Doubao-Seedream (已替换为 OpenAI DALL-E)
   ↓
5. Video Generation
   - Option A: Text-to-Video (Doubao-Seedance)
   - Option B: Image-to-Video (Alibaba Cloud DashScope)
   ↓
6. Subtitle Generation (Tencent Cloud ASR)
   - Automatic Speech Recognition
   - Generate SRT subtitle files
   ↓
7. Video Processing (FFmpeg)
   - Merge video + audio
   - Embed hardcoded subtitles
   - Apply subtitle styling (position, font, colors)
   ↓
8. Upload to OSS
   - Upload final video to Alibaba Cloud OSS
   - Generate CDN URLs
   ↓
9. Manual Review
   - Admin reviews content
   - Approve/reject/publish
   ↓
10. Publish to Frontend
    - Video appears in user feed
```

### Subtitle Processing Logic

**Key Features**:
- **Punctuation-based segmentation**: Subtitles split at sentence-ending punctuation (`. ! ? 。！？`)
- **Character limit**: Maximum 84 characters per subtitle block (3 lines × 28 chars)
- **Audio synchronization**: Uses ASR timestamps for perfect sync
- **Non-overlapping display**: Previous subtitle disappears before next appears
- **Styling**: 
  - Font size: 8
  - Text color: White
  - Outline color: Dark gray (`#606060`)
  - Position: Center of screen, 80px from center
  - Margins: 50px left/right

---

## 🗄️ Database Design (LeanCloud MongoDB)

### Core Collections

| Collection | Purpose |
|------------|---------|
| `Category` | Content categories (Technology, Arts & Humanities, Business) |
| `Book` | Book information (title, author, ISBN, file URL) |
| `Video` | Video metadata (title, URL, category, cover, subtitles) |
| `ExtractedContent` | AI-extracted content from books |
| `Like` | User likes on videos |
| `Favorite` | User favorites |
| `Comment` | User comments |
| `WatchHistory` | Video playback history |
| `AuditLog` | Content moderation logs |
| `UserSession` | User authentication sessions |
| `Notification` | User notifications |
| `StatisticsDaily` | Daily statistics |

### Key Fields

**Video Collection**:
```javascript
{
  title: String,              // Chinese title
  titleEn: String,            // English title
  videoUrl: String,           // Chinese video URL
  videoUrlEn: String,         // English video URL
  coverUrl: String,           // Cover image URL
  category: Pointer<Category>, // Category reference
  book: Pointer<Book>,        // Source book reference
  status: String,              // 'pending', 'published', 'rejected', 'disabled'
  displayOrder: Number,        // Custom display order
  likes: Number,               // Like count
  views: Number,               // View count
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Deployment Strategy

### Frontend Deployment

#### Option A: Netlify (International)
- **Pros**: Simple setup, good free tier, automatic deployments
- **Cons**: May be slow in China
- **Steps**:
  1. Connect GitHub repository
  2. Build command: `npm install && npm run build`
  3. Publish directory: `dist`
  4. Configure environment variables
  5. Auto-deploy on push

#### Option B: Tencent Cloud Static Website Hosting (Recommended for China)
- **Pros**: Fast in China, same platform as backend, Git auto-deploy
- **Steps**:
  1. Enable CloudBase service
  2. Create static website hosting site
  3. Connect Git repository
  4. Configure build command and output directory
  5. Set environment variables
  6. Auto-deploy

### Backend Deployment

#### Option A: Railway (International)
- **Pros**: Simple setup, auto-detects Node.js
- **Cons**: May be slow in China
- **Steps**:
  1. Connect GitHub repository
  2. Set root directory to `admin API`
  3. Configure environment variables
  4. Auto-deploy

#### Option B: Tencent Cloud CloudBase Run (Recommended for China)
- **Pros**: Fast in China, Docker support, can install FFmpeg
- **Steps**:
  1. Create CloudBase service
  2. Connect Git repository
  3. Set target directory to `admin API`
  4. Create Dockerfile (includes FFmpeg)
  5. Configure service port (3001)
  6. Set environment variables
  7. Auto-deploy

**Dockerfile Example**:
```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### File Storage

**Alibaba Cloud OSS**:
- **Storage**: ¥0.12/GB/month (standard storage)
- **CDN Traffic**: ¥0.24/GB (domestic traffic)
- **Configuration**:
  - `OSS_REGION`: OSS region (e.g., `oss-cn-hangzhou`)
  - `OSS_ACCESS_KEY_ID`: Access key ID
  - `OSS_ACCESS_KEY_SECRET`: Access key secret
  - `OSS_BUCKET`: Bucket name

---

## 🔐 Authentication & Security

### User Authentication

**OTP Email Authentication**:
- Only users with `@ashleyfurniture.com` email domain can register/login
- Login flow:
  1. User enters company email
  2. Backend sends 6-digit OTP code to email (valid for 5 minutes)
  3. User enters OTP code
  4. Backend validates and creates/updates user session
  5. User is logged in

**Implementation**:
- Uses LeanCloud Auth for session management
- Nodemailer for sending OTP emails
- Rate limiting on OTP requests
- Secure token-based authentication

### Access Control

- **Public**: Video browsing (no login required)
- **Authenticated**: Like, comment, favorite, share, publish
- **Admin**: Full access to admin dashboard

---

## 📦 Environment Variables

### Backend (`admin API/.env`)

```bash
# LeanCloud Configuration
LEANCLOUD_APP_ID=your_app_id
LEANCLOUD_APP_KEY=your_app_key
LEANCLOUD_MASTER_KEY=your_master_key

# Alibaba Cloud OSS
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=knowledge-video-app

# AI Services
DEEPSEEK_API_KEY=your_deepseek_api_key
DASHSCOPE_API_KEY=your_dashscope_api_key
ARK_API_KEY=your_doubao_api_key

# Tencent Cloud TTS
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key

# Email Service (for OTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# Server Configuration
PORT=3001
NODE_ENV=production
```

### Frontend (`frontend/.env`)

```bash
VITE_LEANCLOUD_APP_ID=your_app_id
VITE_LEANCLOUD_APP_KEY=your_app_key
VITE_API_BASE_URL=https://your-api-domain.com/api
```

### Admin (`admin/.env`)

```bash
VITE_LEANCLOUD_APP_ID=your_app_id
VITE_LEANCLOUD_APP_KEY=your_app_key
VITE_API_BASE_URL=https://your-api-domain.com/api
```

---

## 🛠️ Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git
- FFmpeg (for video processing)

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd Learning
```

2. **Install Dependencies**
```bash
# Frontend
cd frontend
npm install

# Admin Dashboard
cd ../admin
npm install

# Backend API
cd ../admin\ API
npm install
```

3. **Configure Environment Variables**
```bash
# Copy example files and fill in values
cp admin\ API/.env.example admin\ API/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
```

4. **Initialize Database**
```bash
# Run database initialization script
cd admin\ API
node scripts/init-database.js
```

5. **Start Development Servers**
```bash
# Terminal 1: Backend API
cd admin\ API
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Admin Dashboard
cd admin
npm run dev
```

---

## 📊 Cost Estimation

### For 300 Users (Daily 10 Videos)

| Service | Monthly Cost |
|---------|--------------|
| LeanCloud (Free Tier) | ¥0 |
| Alibaba Cloud OSS Storage | ¥10-15 |
| CDN Traffic (450GB/month) | ¥100-120 |
| OSS Requests | ¥5-10 |
| **Total** | **¥110-135/month** |

**Note**: AI service costs (Deepseek, Tencent TTS, Doubao) are billed separately based on usage.

---

## 🔧 Key Features Implementation

### Video Feed Component

- **Vertical scrolling**: Implemented with React hooks and touch events
- **Auto-play**: Current visible video plays automatically
- **Lazy loading**: Videos load as user scrolls
- **Category filtering**: Tab-based content filtering

### Subtitle Processing

- **ASR Integration**: Uses Tencent Cloud ASR for automatic subtitle generation
- **Punctuation-based segmentation**: Splits at sentence-ending punctuation
- **Character wrapping**: Maximum 28 characters per line, 3 lines max
- **Time synchronization**: Uses ASR timestamps for perfect audio sync
- **FFmpeg embedding**: Hardcoded subtitles with custom styling

### Video Generation Pipeline

1. **Audio Generation**: Text → TTS → Audio file
2. **Cover Generation**: Text → Image generation → Cover image
3. **Video Generation**: Text/Image → Video generation → Video file
4. **Subtitle Generation**: Audio → ASR → SRT file
5. **Video Merging**: Video + Audio + Subtitles → Final video (FFmpeg)
6. **Upload**: Final video → OSS → CDN URL

---

## 📝 Development Best Practices

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint + Prettier**: Code formatting and linting
- **Conventional Commits**: Git commit message format
- **Component Structure**: Atomic design principles

### Testing

- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows

### Performance Optimization

- **Video Loading**: Lazy loading and preloading strategies
- **Image Optimization**: WebP format, CDN delivery
- **Code Splitting**: Route-based code splitting
- **Caching**: API response caching, static asset caching

---

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg Not Found**
   - Install FFmpeg: `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
   - Verify: `ffmpeg -version`

2. **OSS Upload Fails**
   - Check OSS credentials in environment variables
   - Verify bucket permissions
   - Check network connectivity

3. **TTS Generation Fails**
   - Verify Tencent Cloud credentials
   - Check API quota and limits
   - Review error logs for specific error messages

4. **Video Generation Timeout**
   - Increase timeout limits in API configuration
   - Consider using async job queue for long-running tasks

---

## 📚 Additional Resources

### Documentation

- [LeanCloud Documentation](https://leancloud.cn/docs/)
- [Alibaba Cloud OSS Documentation](https://help.aliyun.com/product/31815.html)
- [Tencent Cloud TTS Documentation](https://cloud.tencent.com/document/product/1073)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

### API References

- [Deepseek API](https://platform.deepseek.com/api-docs/)
- [Doubao API](https://www.volcengine.com/docs/82379/1520758?lang=zh)
- [Alibaba Cloud DashScope](https://help.aliyun.com/zh/model-studio/)

---

## 🎯 Future Enhancements

- [ ] Video recommendation algorithm
- [ ] User personalization
- [ ] Live streaming support
- [ ] Community discussion features
- [ ] Learning progress tracking
- [ ] Offline download capability
- [ ] Dark mode support
- [ ] Accessibility improvements

---

## 📄 License

MIT License

---

## 👥 Contributors

- Product Manager: [Name]
- Frontend Developer: [Name]
- Backend Developer: [Name]
- AI Engineer: [Name]
- UI Designer: [Name]

---

**Last Updated**: January 2025

