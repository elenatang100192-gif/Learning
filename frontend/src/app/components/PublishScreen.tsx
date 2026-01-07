import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { videoAPI, categoryAPI, uploadAPI } from '../services/leancloud';
import { toast } from 'sonner';

interface PublishScreenProps {
  user: { email: string } | null;
  onClose: () => void;
  onNavigateToHome?: () => void;
  onNavigateToPublications?: () => void;
}

export function PublishScreen({ user, onClose, onNavigateToHome, onNavigateToPublications }: PublishScreenProps) {
  const [step, setStep] = useState<'form' | 'uploading' | 'success'>('form');

  return (
    <div className="flex-1 bg-zinc-900 overflow-hidden">
      {step === 'form' && (
        <PublishForm
          user={user}
          onClose={onClose}
          onSubmit={() => setStep('uploading')}
          setStep={setStep}
        />
      )}
      {step === 'uploading' && (
        <UploadingProgress onComplete={() => setStep('success')} />
      )}
      {step === 'success' && (
        <UploadSuccess 
          onNavigateToHome={onNavigateToHome || onClose} 
          onNavigateToPublications={onNavigateToPublications || onClose} 
        />
      )}
    </div>
  );
}

interface PublishFormProps {
  user: { email: string } | null;
  onClose: () => void;
  onSubmit: () => void;
  setStep: (step: 'form' | 'uploading' | 'success') => void;
}

function PublishForm({ user, onClose, onSubmit, setStep }: PublishFormProps) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [category, setCategory] = useState<'Tech' | 'Arts' | 'Business'>('Tech');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !titleEn || !videoFile) {
      toast.error(t.titlePlaceholder ? '请填写所有必填字段' : 'Please fill all required fields');
      return;
    }

    // 检查用户认证状态
    const token = localStorage.getItem('sessionToken');

    if (!token) {
      toast.error('请先登录后再发布视频');
      return;
    }

    // 检查用户是否已登录
    if (!user) {
      toast.error('用户未登录，请重新登录');
      return;
    }

    onSubmit(); // 调用父组件传递的onSubmit函数来切换到uploading状态

    try {
      // 上传视频文件
      const uploadedVideo = await uploadAPI.uploadVideo(videoFile);

      // 上传封面图片
      let coverUrl = '';
      if (thumbnailFile) {
        const uploadedCover = await uploadAPI.uploadCover(thumbnailFile);
        coverUrl = uploadedCover.url;
      } else {
        // 使用默认封面
        coverUrl = 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400';
      }

      // 获取分类ID
      const categoriesData = await categoryAPI.getAll();
      const categoryMap: { [key: string]: string } = {
        'Tech': '科技',
        'Arts': '艺术人文',
        'Business': '商业业务'
      };
      const categoryName = categoryMap[category];
      const categoryData = categoriesData.find(cat => cat.nameCn === categoryName);

      if (!categoryData) {
        throw new Error('分类不存在');
      }

      // 发布视频
      const videoData = {
        title,
        titleEn,
        categoryId: categoryData.id,
        videoUrl: uploadedVideo.url,
        coverUrl,
        duration: 180 // TODO: 从视频文件中提取实际时长
      };

      try {
        const result = await videoAPI.publish(videoData);

        if (result) {
          toast.success('视频发布成功，等待审核！');
          setStep('success');

          // 延迟一下再调用onClose，确保用户看到成功消息
          // 同时确保数据已经保存到数据库
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          throw new Error('发布返回空结果');
        }
      } catch (publishError) {
        console.error('发布过程中出错:', publishError);
        toast.error('发布失败，请重试');
        setStep('form');
        return;
      }

    } catch (error) {
      console.error('发布失败:', error);
      toast.error('发布失败，请重试');
      setStep('form');
    }
  };

  const categories = [
    { id: 'Tech', label: t.tech, icon: '💻' },
    { id: 'Arts', label: t.arts, icon: '🎨' },
    { id: 'Business', label: t.business, icon: '💼' },
  ];

  return (
    <div className="h-full flex flex-col pb-20">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-white font-semibold">{t.publishVideo}</h1>
        <div className="w-6" />
      </div>

      {/* 表单内容 */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 视频上传 */}
        <div>
          <label className="block text-white font-medium mb-3">
            {t.uploadVideo} <span className="text-red-500">*</span>
          </label>
          {!videoPreview ? (
            <label className="block w-full aspect-video bg-zinc-800 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-600 cursor-pointer transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />
              <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span>{language === 'zh' ? '点击上传视频' : 'Click to upload video'}</span>
                <span className="text-xs">{language === 'zh' ? '支持 MP4, MOV, AVI 格式' : 'Supports MP4, MOV, AVI formats'}</span>
              </div>
            </label>
          ) : (
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video src={videoPreview} controls className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview('');
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 封面上传 */}
        <div>
          <label className="block text-white font-medium mb-3">{t.uploadCover}{language === 'zh' ? '（可选）' : ' (Optional)'}</label>
          {!thumbnailPreview ? (
            <label className="block w-full aspect-video bg-zinc-800 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-600 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
              />
              <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span>{language === 'zh' ? '点击上传封面' : 'Click to upload cover'}</span>
              </div>
            </label>
          ) : (
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <img src={thumbnailPreview} alt={language === 'zh' ? '封面预览' : 'Cover preview'} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setThumbnailFile(null);
                  setThumbnailPreview('');
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 标题 */}
        <div>
          <label className="block text-white font-medium mb-3">
            {t.videoTitle} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            className="w-full bg-zinc-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            rows={3}
            maxLength={100}
            required
          />
          <div className="text-right text-xs text-zinc-500 mt-1">
            {title.length}/100
          </div>
        </div>

        {/* 英文标题 */}
        <div>
          <label className="block text-white font-medium mb-3">
            {t.videoTitleEn} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder={t.titlePlaceholderEn}
            className="w-full bg-zinc-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            rows={3}
            maxLength={100}
            required
          />
          <div className="text-right text-xs text-zinc-500 mt-1">
            {titleEn.length}/100
          </div>
        </div>

        {/* 分类选择 */}
        <div>
          <label className="block text-white font-medium mb-3">
            {t.selectCategory} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as 'Tech' | 'Arts' | 'Business')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  category === cat.id
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <div className="text-3xl mb-2">{cat.icon}</div>
                <div className="text-sm font-medium">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={!title || !titleEn || !videoFile}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-700 hover:to-orange-600 transition-all"
        >
          {t.submit}
        </button>

        <p className="text-center text-xs text-zinc-500">
          {language === 'zh' ? '视频提交后将进入审核流程，审核通过后即可发布' : 'Videos will be reviewed after submission and published after approval'}
        </p>
      </form>
    </div>
  );
}

function UploadingProgress({ onComplete }: { onComplete: () => void }) {
  const { language } = useLanguage();
  const [progress, setProgress] = useState(0);

  // 模拟上传进度
  useState(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    return () => clearInterval(interval);
  });

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-24 h-24 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <h2 className="text-white text-xl font-semibold mb-2">{language === 'zh' ? '上传中...' : 'Uploading...'}</h2>
      <p className="text-zinc-400 mb-6">{language === 'zh' ? '请稍候，正在处理您的视频' : 'Please wait, processing your video'}</p>
      
      <div className="w-full max-w-xs">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center text-white mt-2">{progress}%</div>
      </div>
    </div>
  );
}

function UploadSuccess({ onNavigateToHome, onNavigateToPublications }: { onNavigateToHome: () => void; onNavigateToPublications: () => void }) {
  const { language } = useLanguage();
  
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-white text-2xl font-bold mb-2">{language === 'zh' ? '提交成功！' : 'Submitted Successfully!'}</h2>
      <p className="text-zinc-400 text-center mb-2">
        {language === 'zh' ? (
          <>您的视频已提交审核<br />审核通过后将自动发布</>
        ) : (
          <>Your video has been submitted for review<br />It will be published after approval</>
        )}
      </p>
      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mb-8 max-w-xs">
        <p className="text-yellow-400 text-sm text-center">
          {language === 'zh' ? '⏳ 预计审核时间：24小时内' : '⏳ Est. review time: within 24 hours'}
        </p>
      </div>
      
      <div className="space-y-3 w-full max-w-xs">
        <button
          onClick={onNavigateToHome}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-4 rounded-xl font-semibold hover:from-orange-700 hover:to-orange-600 transition-all"
        >
          {language === 'zh' ? '返回首页' : 'Back to Home'}
        </button>
        <button
          onClick={onNavigateToPublications}
          className="w-full bg-zinc-800 text-white py-4 rounded-xl font-semibold hover:bg-zinc-700 transition-all"
        >
          {language === 'zh' ? '查看审核状态' : 'Check Review Status'}
        </button>
      </div>
    </div>
  );
}