import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import { Checkbox } from './ui/checkbox';
import { Plus, Upload, BookOpen, Search, Sparkles, Video, Clock, CircleCheck, Loader, Eye, RefreshCw, Volume2, Trash2, Edit, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { bookAPI, categoryAPI, videoAPI, type Book, type Category } from '../services/leancloud';

export function BookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [extractingBooks, setExtractingBooks] = useState<Set<string>>(new Set());
  
  const [editBook, setEditBook] = useState({
    title: '',
    author: '',
    category: '科技' as string
  });

  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '科技' as string
  });
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<5 | 10 | 20 | 30>(10);
  const [bookContents, setBookContents] = useState<any[]>([]);
  const [generatingContentId, setGeneratingContentId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const [generatingAudioLanguage, setGeneratingAudioLanguage] = useState<'zh' | 'en' | null>(null);
  const [generatingSilentVideoId, setGeneratingSilentVideoId] = useState<string | null>(null);
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null);
  const [generatingVideoLanguage, setGeneratingVideoLanguage] = useState<'zh' | 'en' | null>(null);
  const [translatingContentId, setTranslatingContentId] = useState<string | null>(null);
  const [generatingEnglishVideoId, setGeneratingEnglishVideoId] = useState<string | null>(null);
  const [isEnglishVideoDialogOpen, setIsEnglishVideoDialogOpen] = useState(false);
  const [selectedEnglishContent, setSelectedEnglishContent] = useState<any | null>(null);
  const [englishContents, setEnglishContents] = useState<any[]>([]);
  const [allContentsForEnglishVideo, setAllContentsForEnglishVideo] = useState<any[]>([]);
  const [selectedContentIdsForEnglishVideo, setSelectedContentIdsForEnglishVideo] = useState<Set<string>>(new Set());
  const [englishVideoGeneratingProgress, setEnglishVideoGeneratingProgress] = useState<{ [key: string]: number }>({});
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<{ [key: string]: number }>({});
  const [videoProgressInterval, setVideoProgressInterval] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [pendingVideos, setPendingVideos] = useState<Video[]>([]); // 待审核视频列表
  const [publishedVideos, setPublishedVideos] = useState<Video[]>([]); // 已发布视频列表
  const [videoStyleDescription, setVideoStyleDescription] = useState<string>('Anime style, vibrant colors'); // Video style description (shared by all content)
  const [generatingBlogCover, setGeneratingBlogCover] = useState<boolean>(false);
  const [blogCoverUrl, setBlogCoverUrl] = useState<string | null>(null);
  const [blogCoverPrompts, setBlogCoverPrompts] = useState<{
    style1: string;
    style2: string;
    style3: string;
  } | null>(null);
  const [selectedPromptStyle, setSelectedPromptStyle] = useState<'style1' | 'style2' | 'style3' | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<{
    style1: string;
    style2: string;
    style3: string;
  } | null>(null);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState<boolean>(false);
  const [generatingPrompts, setGeneratingPrompts] = useState<boolean>(false);

  // Cover image upload related state
  const [uploadedCoverImage, setUploadedCoverImage] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
  
  // Edit state for each content
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editedSummaries, setEditedSummaries] = useState<{ [contentId: string]: { summary: string; summaryEn: string; chapterTitle: string; chapterTitleEn: string } }>({});
  
  // Opening text option for each content (default: true - include opening text)
  const [includeOpeningText, setIncludeOpeningText] = useState<{ [contentId: string]: boolean }>({});

  // 加载数据
  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm]);

  // 清理进度条定时器
  useEffect(() => {
    return () => {
      Object.values(videoProgressInterval).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, [videoProgressInterval]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 并行加载书籍和分类数据
      const [booksData, categoriesData] = await Promise.all([
        bookAPI.getList(
          searchTerm ? { title: searchTerm, author: searchTerm } : {},
          currentPage,
          20
        ),
        categoryAPI.getAll()
      ]);

      setBooks(booksData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.author || !newBook.isbn) {
      toast.error('Please fill in complete book information');
      return;
    }

    if (!bookFile) {
      toast.error('Please upload an e-book file');
      return;
    }

    // 检查文件大小（限制为100MB）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (bookFile.size > maxSize) {
      toast.error(`File size exceeds limit. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    // 如果文件较大，提示用户
    if (bookFile.size > 10 * 1024 * 1024) { // 大于10MB
      toast.info(`Uploading large file (${(bookFile.size / 1024 / 1024).toFixed(2)}MB), please wait...`, {
        duration: 3000
      });
    }

    try {
      // 使用nameCn（中文名称）来匹配分类
      const category = categories.find(cat => cat.nameCn === newBook.category);
      if (!category) {
        toast.error('Please select a valid category');
        return;
      }

      // 重置上传进度
      setIsUploading(true);
      setUploadProgress(0);

      // 上传电子书文件（带进度回调）
      const uploadedBook = await bookAPI.uploadBook(
        bookFile,
        {
          title: newBook.title,
          author: newBook.author,
          isbn: newBook.isbn,
          categoryId: category.id
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // 上传成功，无论uploadedBook是否为null都执行清理和刷新
      console.log('📚 上传完成，返回数据:', uploadedBook);
      toast.success('Book added successfully');
      
      // 重置上传状态
      setIsUploading(false);
      setUploadProgress(0);
      
      // 关闭对话框
      setIsAddDialogOpen(false);
      
      // 重置表单
        setNewBook({ title: '', author: '', isbn: '', category: '科技' });
        setBookFile(null);
      
      // 延迟500ms后刷新数据，确保后端已完全保存
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      console.error('添加书籍失败:', error);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(error.message || 'Failed to add book');
    }
  };

  const handleStartExtraction = async (bookId: string, segments: 5 | 10 | 20 | 30) => {
    try {
      // 添加到正在提取的集合
      setExtractingBooks(prev => new Set(prev).add(bookId));

      toast.info('Starting AI content extraction, this may take a few minutes...');

      // 调用API启动AI提取
      const result = await bookAPI.startAIExtraction(bookId, segments);

      if (result) {
      // 重新加载数据以获取最新状态
      await loadData();
        toast.success(`AI content extraction completed, generated ${result.segments?.length || 0} segments`);
      } else {
        toast.error('AI extraction failed');
      }
    } catch (error: any) {
      console.error('启动AI提取失败:', error);
      toast.error(error.message || 'Failed to start AI extraction');
    } finally {
      // 从正在提取的集合中移除
      setExtractingBooks(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
    }
  };

  // 加载书籍内容
  const loadBookContents = async (bookId: string) => {
    try {
      const contents = await bookAPI.getBookContents(bookId);
      setBookContents(contents);
      
      // 同时加载待审核和已发布的视频列表，用于检查是否可以发布
      try {
        const [pendingVideosList, publishedVideosList] = await Promise.all([
          videoAPI.getList({ status: '待审核' }, 1, 1000),
          videoAPI.getList({ status: '已发布' }, 1, 1000)
        ]);
        setPendingVideos(pendingVideosList);
        setPublishedVideos(publishedVideosList);
      } catch (error) {
        console.warn('加载视频列表失败:', error);
        // 不影响主要内容加载，只记录警告
      }
    } catch (error) {
      console.error('加载书籍内容失败:', error);
      toast.error('Failed to load book contents');
    }
  };

  // 检查视频是否在待审核或已发布列表中
  const isVideoPublished = (videoUrl: string | undefined, videoUrlEn: string | undefined, isEnglish: boolean = false): boolean => {
    if (!videoUrl && !videoUrlEn) return false;
    
    const targetUrl = isEnglish ? videoUrlEn : videoUrl;
    if (!targetUrl) return false;
    
    // 检查待审核列表
    const inPendingList = pendingVideos.some(video => {
      if (isEnglish) {
        return video.videoUrlEn === targetUrl;
      } else {
        return video.videoUrl === targetUrl;
      }
    });
    
    // 检查已发布列表
    const inPublishedList = publishedVideos.some(video => {
      if (isEnglish) {
        return video.videoUrlEn === targetUrl;
      } else {
        return video.videoUrl === targetUrl;
      }
    });
    
    return inPendingList || inPublishedList;
  };

  // 生成音频（单个语言）
  const handleGenerateAudio = async (content: any, language: 'zh' | 'en') => {
    try {
      setGeneratingAudioId(content.id);
      setGeneratingAudioLanguage(language);
      
      const audioText = language === 'zh' 
        ? `${content.summary || ''}`.trim()
        : `${content.summaryEn || ''}`.trim();
      
      if (!audioText) {
        toast.error(`Content text is empty, cannot generate ${language === 'zh' ? 'Chinese' : 'English'} audio`);
        return;
      }

      toast.info(`Generating ${language === 'zh' ? 'Chinese' : 'English'} audio...`);
      
      const audioResult = await bookAPI.generateAudio(content.id, audioText, language);
      if (!audioResult || !audioResult.audioUrl) {
        throw new Error(`生成${language === 'zh' ? '中文' : '英文'}音频失败`);
      }
      
      toast.success(`${language === 'zh' ? 'Chinese' : 'English'} audio generation completed!`);
      // 重新加载内容
      if (selectedBook) {
        await loadBookContents(selectedBook.id);
      }
    } catch (error: any) {
      console.error('生成音频失败:', error);
      toast.error(error.message || 'Failed to generate audio');
    } finally {
      setGeneratingAudioId(null);
      setGeneratingAudioLanguage(null);
    }
  };

  // 生成无声视频（步骤2）
  const handleGenerateSilentVideo = async (content: any) => {
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      setGeneratingSilentVideoId(content.id);
      setVideoProgress({ ...videoProgress, [content.id]: 0 });
      
      // 需要至少有一个音频来确定时长
      if (!content.audioUrl && !content.audioUrlEn) {
        toast.error('Please generate at least one audio (Chinese or English) first');
        return;
      }

      toast.info('Generating silent video, this may take a few minutes...');
      
      // 启动进度条更新
      const startTime = Date.now();
      const estimatedDuration = 180000; // 预计3分钟
      
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(90, Math.floor((elapsed / estimatedDuration) * 90));
        setVideoProgress(prev => ({ ...prev, [content.id]: progress }));
      }, 1000);
      
      setVideoProgressInterval(prev => ({ ...prev, [content.id]: progressInterval! }));
      
      const result = await bookAPI.generateSilentVideo(content.id, videoStyleDescription || undefined);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setVideoProgress(prev => ({ ...prev, [content.id]: 100 }));
      
      if (result && result.silentVideoUrl) {
        toast.success('Silent video generation completed!');
        if (selectedBook) {
          await loadBookContents(selectedBook.id);
        }
      } else {
        throw new Error('无声视频生成失败');
      }
    } catch (error: any) {
      console.error('生成无声视频失败:', error);
      
      // 特殊处理敏感内容错误
      let errorMessage = error.message || 'Failed to generate silent video';
      if (errorMessage.includes('敏感') || errorMessage.includes('sensitive')) {
        errorMessage = 'Silent video generation failed: Content may contain sensitive information. Please try modifying the text content and try again.';
        toast.error(errorMessage, {
          duration: 8000, // 显示8秒，让用户有时间阅读
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setVideoProgressInterval(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[content.id];
        return newIntervals;
      });
      setGeneratingSilentVideoId(null);
    setTimeout(() => {
        setVideoProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[content.id];
          return newProgress;
        });
      }, 2000);
    }
  };

  // 生成英文翻译
  const handleTranslateContent = async (content: any) => {
    try {
      setTranslatingContentId(content.id);
      toast.info('Generating English translation, please wait...');
      
      const result = await bookAPI.translateContent(content.id);
      
      if (result) {
        toast.success('English translation generation completed!');
        // 重新加载内容
        if (selectedBook) {
          await loadBookContents(selectedBook.id);
        }
      } else {
        throw new Error('翻译生成失败');
      }
    } catch (error: any) {
      console.error('生成翻译失败:', error);
      toast.error(error.message || 'Failed to generate translation');
    } finally {
      setTranslatingContentId(null);
    }
  };

  // Generate Chinese video (combines 3 steps: audio -> silent video -> final video)
  const handleGenerateChineseVideo = async (content: any) => {
    let progressInterval: NodeJS.Timeout | null = null;
    const progressKey = `${content.id}_zh_complete`;
    
    // 判断是否是重新生成（如果已有videoUrl，则强制重新生成所有步骤）
    const isRegenerate = !!content.videoUrl;
    
    try {
      setGeneratingVideoId(content.id);
      setGeneratingVideoLanguage('zh');
      setVideoProgress({ ...videoProgress, [progressKey]: 0 });
      
      // Use edited summary if available, otherwise use original
      const editedSummary = editedSummaries[content.id]?.summary;
      const finalSummary = editedSummary || content.summary || '';
      
      // Step 1: Generate Chinese audio (if not exists, or needs regeneration, or summary was edited)
      if (!content.audioUrl || isRegenerate || editedSummary) {
        setVideoProgress(prev => ({ ...prev, [progressKey]: 5 }));
        toast.info('Step 1/3: Generating Chinese audio...');
        
        const audioText = finalSummary.trim();
        if (!audioText) {
          throw new Error('Content text is empty, cannot generate Chinese audio');
        }
        
        // Check if opening text should be included
        const shouldIncludeOpening = includeOpeningText[content.id] !== false; // Default to true
        
        setGeneratingAudioId(content.id);
        setGeneratingAudioLanguage('zh');
        
        const audioResult = await bookAPI.generateAudio(content.id, audioText, 'zh', shouldIncludeOpening);
        if (!audioResult || !audioResult.audioUrl) {
          throw new Error('Failed to generate Chinese audio');
        }
        
        setVideoProgress(prev => ({ ...prev, [progressKey]: 33 }));
        toast.success('Step 1 completed: Chinese audio generated successfully');
        
        // 重新加载内容以获取最新的audioUrl
        if (selectedBook) {
          await loadBookContents(selectedBook.id);
        }
        
        // 等待一下确保数据已更新
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setGeneratingAudioId(null);
        setGeneratingAudioLanguage(null);
      } else {
        setVideoProgress(prev => ({ ...prev, [progressKey]: 33 }));
        toast.info('Step 1 skipped: Chinese audio already exists');
      }
      
      // Step 2: Generate Chinese video (using blog cover image and microphone, merge with audio)
      setVideoProgress(prev => ({ ...prev, [progressKey]: 35 }));
      toast.info('Step 2/2: Generating video with blog cover and microphone, this may take a few minutes...');
      
      // Check if blog cover image exists (priority: uploaded > generated > book's)
      const currentBlogCoverUrl = uploadedCoverImage || blogCoverUrl || selectedBook?.blogCoverUrl;
      if (!currentBlogCoverUrl) {
        throw new Error('Please generate or upload blog cover image first');
      }
      
      // Reload latest content data
      const updatedContents = await bookAPI.getBookContents(selectedBook!.id);
      const updatedContent = updatedContents.find((c: any) => c.id === content.id);
      
      if (!updatedContent) {
        console.error('❌ Cannot find updated content data, contentId:', content.id);
        throw new Error('Cannot find updated content data');
      }
      
      if (!updatedContent.audioUrl) {
        console.error('❌ Chinese audio URL does not exist');
        throw new Error('Chinese audio URL does not exist, please generate Chinese audio first');
      }
      
      // Start progress bar update
      const startTime = Date.now();
      const estimatedDuration = 180000; // Estimated 3 minutes (video generation)
      
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(95, 35 + Math.floor((elapsed / estimatedDuration) * 60));
        setVideoProgress(prev => ({ ...prev, [progressKey]: progress }));
      }, 1000);
      
      setVideoProgressInterval(prev => ({ ...prev, [progressKey]: progressInterval! }));
      
      // Pass custom cover image, edited summary, edited titles, and opening text option
      const edited = editedSummaries[content.id];
      const shouldIncludeOpening = includeOpeningText[content.id] !== false; // Default to true
      const videoResult = await bookAPI.generateVideo(
        updatedContent.id,
        updatedContent.audioUrl,
        'zh',
        {
          coverImageUrl: currentBlogCoverUrl,
          summary: finalSummary,
          summaryEn: edited?.summaryEn || content.summaryEn,
          chapterTitle: edited?.chapterTitle || content.chapterTitle,
          chapterTitleEn: edited?.chapterTitleEn || content.chapterTitleEn,
          includeOpeningText: shouldIncludeOpening
        }
      );
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setVideoProgress(prev => ({ ...prev, [progressKey]: 100 }));
      
      if (videoResult && videoResult.videoUrl) {
        toast.success('Step 2 completed: Chinese video generated successfully!');
        if (selectedBook) {
          await loadBookContents(selectedBook.id);
        }
      } else {
        throw new Error('视频生成失败');
      }
    } catch (error: any) {
      console.error('Failed to generate Chinese video:', error);
      
      // Handle sensitive content errors
      let errorMessage = error.message || 'Failed to generate Chinese video';
      if (errorMessage.includes('敏感') || errorMessage.includes('sensitive')) {
        errorMessage = 'Video generation failed: Content may contain sensitive information. Please try modifying the text content and try again.';
        toast.error(errorMessage, {
          duration: 8000, // 显示8秒，让用户有时间阅读
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setVideoProgressInterval(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[progressKey];
        return newIntervals;
      });
      
      setGeneratingVideoId(null);
      setGeneratingVideoLanguage(null);
      setGeneratingAudioId(null);
      setGeneratingAudioLanguage(null);
      setGeneratingSilentVideoId(null);
      
      setTimeout(() => {
        setVideoProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[progressKey];
          return newProgress;
        });
      }, 2000);
    }
  };

  // 生成视频（步骤3：将无声视频与音频合并）
  const handleGenerateVideo = async (content: any, language: 'zh' | 'en') => {
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      setGeneratingVideoId(content.id);
      setGeneratingVideoLanguage(language);
      setVideoProgress({ ...videoProgress, [`${content.id}_${language}`]: 0 });
      
      if (!content.silentVideoUrl) {
        toast.error('Please generate silent video first (Step 2)');
        return;
      }

      const audioUrl = language === 'zh' ? content.audioUrl : content.audioUrlEn;
      if (!audioUrl) {
        toast.error(`Please generate ${language === 'zh' ? 'Chinese' : 'English'} audio first (Step 1)`);
        return;
      }

      toast.info(`Generating ${language === 'zh' ? 'Chinese' : 'English'} video, this may take a few minutes...`);
      
      // 启动进度条更新
      const startTime = Date.now();
      const estimatedDuration = 120000; // 预计2分钟（合并操作）
      
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(90, Math.floor((elapsed / estimatedDuration) * 90));
        setVideoProgress(prev => ({ ...prev, [`${content.id}_${language}`]: progress }));
      }, 1000);
      
      setVideoProgressInterval(prev => ({ ...prev, [`${content.id}_${language}`]: progressInterval! }));
      
      const videoResult = await bookAPI.generateVideo(
        content.id,
        audioUrl,
        language
      );

      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setVideoProgress(prev => ({ ...prev, [`${content.id}_${language}`]: 100 }));
      
      if (videoResult && videoResult.videoUrl) {
        toast.success(`${language === 'zh' ? 'Chinese' : 'English'} video generation completed!`);
        if (selectedBook) {
          await loadBookContents(selectedBook.id);
        }
      } else {
        throw new Error('视频生成失败');
      }
    } catch (error: any) {
      console.error('生成视频失败:', error);
      toast.error(error.message || 'Failed to generate video');
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setVideoProgressInterval(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[`${content.id}_${language}`];
        return newIntervals;
      });
      
      setGeneratingVideoId(null);
      setGeneratingVideoLanguage(null);
      setTimeout(() => {
        setVideoProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[`${content.id}_${language}`];
          return newProgress;
        });
      }, 2000);
    }
  };

  // 打开英文视频生成对话框
  const handleOpenEnglishVideoDialog = async (book: Book) => {
    try {
      // 先加载书籍内容
      const contents = await bookAPI.getBookContents(book.id);
      if (!contents || contents.length === 0) {
        toast.error('This book has no extracted content yet, please extract content first');
        return;
      }
      
      // 检查是否有博客封面图
      if (!book.blogCoverUrl) {
        toast.error('Please generate blog cover image first');
        return;
      }
      
      // 为每个内容添加bookId（用于后续重新加载）
      const contentsWithBookId = contents.map((c: any) => ({
        ...c,
        bookId: book.id
      }));
      
      // 设置所有内容并打开对话框
      setAllContentsForEnglishVideo(contentsWithBookId);
      setSelectedContentIdsForEnglishVideo(new Set(contentsWithBookId.map((c: any) => c.id)));
      setIsEnglishVideoDialogOpen(true);
      
      // 如果有已生成的英文视频，设置选中内容
      const contentsWithEnglishVideo = contentsWithBookId.filter((c: any) => c.videoUrlEn);
      if (contentsWithEnglishVideo.length > 0) {
        setEnglishContents(contentsWithEnglishVideo);
        setSelectedEnglishContent(contentsWithEnglishVideo[0]);
      } else {
        setEnglishContents([]);
        setSelectedEnglishContent(null);
      }
    } catch (error: any) {
      console.error('加载内容失败:', error);
      toast.error(error.message || 'Failed to load content');
    }
  };

  // 生成选中的英文视频
  const handleGenerateSelectedEnglishVideos = async () => {
    if (selectedContentIdsForEnglishVideo.size === 0) {
      toast.error('Please select at least one segment');
      return;
    }
    
    const selectedContents = allContentsForEnglishVideo.filter((c: any) => 
      selectedContentIdsForEnglishVideo.has(c.id)
    );
    
    setGeneratingEnglishVideoId('generating');
    toast.info(`Generating English videos for ${selectedContents.length} segments, this may take a few minutes...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 为每个选中的内容生成英文视频
    for (let i = 0; i < selectedContents.length; i++) {
      const content = selectedContents[i];
      const contentId = content.id;
      
      // 初始化进度
      setEnglishVideoGeneratingProgress(prev => ({ ...prev, [contentId]: 0 }));
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setEnglishVideoGeneratingProgress(prev => {
          const current = prev[contentId] || 0;
          if (current < 90) {
            return { ...prev, [contentId]: current + 5 };
          }
          return prev;
        });
      }, 1000);
      
      try {
        const result = await bookAPI.generateEnglishVideo(contentId);
        if (result) {
          console.log(`✅ 第${i + 1}段内容英文视频生成完成:`, result);
          successCount++;
          setEnglishVideoGeneratingProgress(prev => ({ ...prev, [contentId]: 100 }));
        }
        clearInterval(progressInterval);
      } catch (error: any) {
        console.error(`生成第${i + 1}段内容的英文视频失败:`, error);
        failCount++;
        clearInterval(progressInterval);
        setEnglishVideoGeneratingProgress(prev => ({ ...prev, [contentId]: 0 }));
        toast.error(`Failed to generate segment ${i + 1}: ${error.message}`);
      }
    }
    
    // 重新加载内容
    const bookId = selectedContents[0]?.bookId || allContentsForEnglishVideo[0]?.bookId;
    if (bookId) {
      const updatedContents = await bookAPI.getBookContents(bookId);
      if (updatedContents && updatedContents.length > 0) {
        // 更新所有内容列表（添加bookId）
        const updatedContentsWithSilentVideo = updatedContents
          .filter((c: any) => c.silentVideoUrl)
          .map((c: any) => ({ ...c, bookId }));
        setAllContentsForEnglishVideo(updatedContentsWithSilentVideo);
        
        // 找到所有有英文视频的内容
        const contentsWithEnglishVideo = updatedContentsWithSilentVideo.filter((c: any) => c.videoUrlEn);
        if (contentsWithEnglishVideo.length > 0) {
          setEnglishContents(contentsWithEnglishVideo);
          setSelectedEnglishContent(contentsWithEnglishVideo[0]);
        }
      }
    }
    
    // 清除进度
    setTimeout(() => {
      setEnglishVideoGeneratingProgress({});
    }, 2000);
    
    if (failCount === 0) {
      toast.success(`All English videos generated! ${successCount} segments succeeded`);
    } else {
      toast.warning(`English video generation completed: ${successCount} succeeded, ${failCount} failed`);
    }
    
    setGeneratingEnglishVideoId(null);
  };

  const handlePublishVideo = async (content: any, isEnglishVideo: boolean = false) => {
    if (!content) {
      toast.error('Content does not exist, cannot publish');
      return;
    }

    // 如果是英文视频，必须有videoUrlEn；如果是中文视频，必须有videoUrl
    if (isEnglishVideo && !content.videoUrlEn) {
      toast.error('English video URL does not exist, cannot publish');
      return;
    }
    if (!isEnglishVideo && !content.videoUrl) {
      toast.error('Chinese video URL does not exist, cannot publish');
      return;
    }

    try {
      // 使用书籍的分类，而不是默认分类
      let bookCategory: Category | null = null;
      
      if (selectedBook && selectedBook.category) {
        // 如果书籍有分类对象，直接使用
        bookCategory = selectedBook.category;
      } else if (selectedBook && selectedBook.category?.nameCn) {
        // 如果书籍有分类名称，从categories数组中查找对应的分类对象
        bookCategory = categories.find(cat => cat.nameCn === selectedBook.category.nameCn) || null;
      }
      
      // 如果找不到书籍分类，使用第一个分类作为fallback
      if (!bookCategory) {
        bookCategory = categories.length > 0 ? categories[0] : null;
        if (!bookCategory) {
          toast.error('Please add a category first');
          return;
        }
        console.warn('⚠️ 未找到书籍分类，使用默认分类:', bookCategory.nameCn);
      } else {
        console.log('✅ 使用书籍分类:', bookCategory.nameCn);
      }

      // 获取视频时长（如果有的话，否则使用默认值）
      const duration = content.estimatedDuration || 0;

      // 发布视频到待审核
      const publishData: any = {
        categoryId: bookCategory.id,
        coverUrl: '', // 可以后续添加封面图功能
        duration: duration
      };

      // 根据是否为英文视频设置不同的videoUrl和videoUrlEn
      if (isEnglishVideo) {
        // 发布英文视频：只设置videoUrlEn，不设置videoUrl
        publishData.videoUrlEn = content.videoUrlEn;
        publishData.videoUrl = ''; // 英文视频不包含中文视频URL
        // 标题使用英文标题
        publishData.title = content.chapterTitleEn || content.summaryEn?.substring(0, 50) || '未命名视频';
        publishData.titleEn = content.chapterTitleEn || content.summaryEn?.substring(0, 50) || '';
      } else {
        // 发布中文视频：只设置videoUrl，不设置videoUrlEn
        publishData.videoUrl = content.videoUrl;
        publishData.videoUrlEn = ''; // 中文视频不包含英文视频URL
        // 标题使用中文标题
        publishData.title = content.chapterTitle || content.summary?.substring(0, 50) || '未命名视频';
        publishData.titleEn = content.chapterTitleEn || content.summaryEn?.substring(0, 50) || '';
      }

      const result = await videoAPI.publish(publishData);

      if (result) {
        const videoTitle = isEnglishVideo 
          ? (content.chapterTitleEn || '未命名视频')
          : (content.chapterTitle || '未命名视频');
        toast.success(`${isEnglishVideo ? 'English' : 'Chinese'} video "${videoTitle}" has been published to the review queue`);
        
        // 刷新待审核和已发布视频列表，更新按钮状态
        try {
          const [pendingVideosList, publishedVideosList] = await Promise.all([
            videoAPI.getList({ status: '待审核' }, 1, 1000),
            videoAPI.getList({ status: '已发布' }, 1, 1000)
          ]);
          setPendingVideos(pendingVideosList);
          setPublishedVideos(publishedVideosList);
        } catch (error) {
          console.warn('刷新视频列表失败:', error);
        }
      } else {
        toast.error('Publish failed, please try again');
      }
    } catch (error: any) {
      console.error('发布视频失败:', error);
      toast.error(`Publish failed: ${error.message || 'Unknown error'}`);
    }
  };

  // 本地搜索（API已经支持服务端搜索，这里作为额外过滤）
  const filteredBooks = books.filter(book =>
    !searchTerm ||
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Book['status']) => {
    const statusMap: Record<Book['status'], string> = {
      '待处理': 'Pending',
      '提取中': 'Extracting',
      '已完成': 'Completed'
    };

    const variants = {
      '待处理': 'secondary',
      '提取中': 'default',
      '已完成': 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className={
        status === '提取中' ? 'bg-accent text-accent-foreground' : ''
      }>
        {statusMap[status] || status}
      </Badge>
    );
  };

  const getVideoStatusIcon = (status: ExtractedContent['videoStatus']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'generating':
        return <Loader className="h-4 w-4 animate-spin text-accent" />;
      case 'completed':
        return <CircleCheck className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <span className="text-red-600">Failed</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Book Management</h1>
          <p className="text-muted-foreground mt-1">Manage book information, AI content extraction and video generation</p>
        </div>

        <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Book</DialogTitle>
              <DialogDescription>Fill in book information and upload e-book file</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Book Title</Label>
                <Input
                  placeholder="Enter book title"
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Input
                  placeholder="Enter author"
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ISBN</Label>
                <Input
                  placeholder="Enter ISBN"
                  value={newBook.isbn}
                  onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newBook.category}
                  onValueChange={(value) => setNewBook({ ...newBook, category: value as VideoCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Map(categories.map(cat => [cat.nameCn, cat])).values()).map((category) => (
                      <SelectItem key={category.id} value={category.nameCn}>
                        {category.name || category.nameCn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Upload E-book</Label>
                <input
                  type="file"
                  accept=".pdf,.epub,.mobi"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setBookFile(file);
                    }
                  }}
                  className="hidden"
                  id="book-file-upload"
                />
                <label
                  htmlFor="book-file-upload"
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer block"
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  {bookFile ? (
                    <div>
                      <p className="text-accent font-medium">{bookFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(bookFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                  <p className="text-muted-foreground">Click to upload or drag file here</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports PDF, EPUB, MOBI formats</p>
                    </>
                  )}
                </label>
                </div>
              
              {/* 上传进度条 */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Upload Progress</span>
                    <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleAddBook} 
                  className="flex-1 bg-accent hover:bg-accent/90"
                  disabled={!newBook.title || !newBook.author || !bookFile || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Confirm Add'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)} 
                  className="flex-1"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 编辑书籍对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>Modify book basic information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">书名</Label>
              <Input
                id="edit-title"
                value={editBook.title}
                onChange={(e) => setEditBook({ ...editBook, title: e.target.value })}
                placeholder="Enter book title"
              />
            </div>
            <div>
              <Label htmlFor="edit-author">Author</Label>
              <Input
                id="edit-author"
                value={editBook.author}
                onChange={(e) => setEditBook({ ...editBook, author: e.target.value })}
                placeholder="Enter author"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={editBook.category}
                onValueChange={(value) => setEditBook({ ...editBook, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Map(categories.map(cat => [cat.nameCn, cat])).values()).map((category) => (
                    <SelectItem key={category.id} value={category.nameCn}>
                      {category.name || category.nameCn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editBook.title || !editBook.author) {
                    toast.error('Please fill in complete book information');
                    return;
                  }

                  if (!selectedBook) return;

                  try {
                    const category = categories.find(cat => cat.nameCn === editBook.category);
                    if (!category) {
                      toast.error('Please select a valid category');
                      return;
                    }

                    await bookAPI.update(selectedBook.id, {
                      title: editBook.title,
                      author: editBook.author,
                      category: category
                    });

                    toast.success('Update successful');
                    setIsEditDialogOpen(false);
                    loadData();
                  } catch (error) {
                    console.error('修改失败:', error);
                    toast.error('Update failed, please try again');
                  }
                }}
              >
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by book title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Extract Content</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // 加载状态
              [...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-14 rounded" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {searchTerm ? 'No matching books found' : 'No book data available'}
                </TableCell>
              </TableRow>
            ) : (
              filteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="flex items-center gap-3">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-10 h-14 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <span>{book.title}</span>
                </TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell>{book.isbn}</TableCell>
                <TableCell>
                  <Badge variant="outline">{book.category?.name || book.category?.nameCn || 'Uncategorized'}</Badge>
                </TableCell>
                <TableCell>{book.uploadDate}</TableCell>
                <TableCell>{getStatusBadge(book.status)}</TableCell>
                <TableCell>
                  <span className="text-muted-foreground">No statistics available</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                  {book.status === '待处理' && (
                      <div className="flex gap-2">
                        <Select
                          value={selectedSegments.toString()}
                          onValueChange={(value) => setSelectedSegments(parseInt(value) as 5 | 10 | 20 | 30)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 Segments</SelectItem>
                            <SelectItem value="10">10 Segments</SelectItem>
                            <SelectItem value="20">20 Segments</SelectItem>
                            <SelectItem value="30">30 Segments</SelectItem>
                          </SelectContent>
                        </Select>
                    <Button
                      size="sm"
                      variant="outline"
                          onClick={() => handleStartExtraction(book.id, selectedSegments)}
                      disabled={extractingBooks.has(book.id)}
                      className="hover:bg-accent hover:text-accent-foreground"
                    >
                      {extractingBooks.has(book.id) ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                          {extractingBooks.has(book.id) ? 'Extracting...' : 'Start Extraction'}
                    </Button>
                      </div>
                  )}
                  {book.status === '提取中' && (
                    <Button size="sm" variant="ghost" disabled>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </Button>
                  )}
                  {book.status === '已完成' && (
                    <>
                    <Button
                      size="sm"
                      variant="outline"
                        onClick={async () => {
                        // 从最新的books列表中查找对应的书籍，确保使用最新的数据（包括blogCoverUrl）
                        const latestBook = books.find(b => b.id === book.id) || book;
                        setSelectedBook(latestBook);
                        setIsContentDialogOpen(true);
                        setBlogCoverUrl(latestBook.blogCoverUrl || null);
                          await loadBookContents(latestBook.id);
                      }}
                      className="hover:bg-accent hover:text-accent-foreground"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                        Generate Video
                      </Button>
                    </>
                  )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedBook(book);
                        setEditBook({
                          title: book.title,
                          author: book.author,
                          category: book.category?.nameCn || '科技'
                        });
                        setIsEditDialogOpen(true);
                      }}
                      className="hover:bg-accent hover:text-accent-foreground"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm(`确定要删除书籍《${book.title}》吗？此操作不可恢复。`)) {
                          try {
                            await bookAPI.delete(book.id);
                            toast.success('Delete successful');
                            loadData();
                          } catch (error) {
                            console.error('删除失败:', error);
                            toast.error('Delete failed, please try again');
                          }
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 提取内容和视频生成对话框 */}
      <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {selectedBook?.title}
            </DialogTitle>
            <DialogDescription>
              View AI-extracted Chinese content and generate Chinese audio and video
            </DialogDescription>
          </DialogHeader>

          {/* Blog Cover Image Section */}
          <div className="mb-6 p-4 border rounded-lg bg-accent/5">
            <div className="mb-3">
              <div>
                <h3 className="font-semibold mb-1">Blog Cover Image</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a 9:16 book cover image based on book title and author, or upload your own cover image
                </p>
              </div>
              <div className="flex gap-2 mt-3">
              <Button
                onClick={async () => {
                  if (!selectedBook) return;
                  try {
                      // If prompts already exist (including edited), open dialog directly
                    if (editedPrompts || blogCoverPrompts) {
                      setIsPromptDialogOpen(true);
                      return;
                    }
                    
                      // Otherwise generate prompts first
                    setIsPromptDialogOpen(true);
                    setGeneratingPrompts(true);
                    const promptsResult = await bookAPI.generateBlogCoverPrompts(selectedBook.id);
                    if (promptsResult && promptsResult.prompts) {
                      setBlogCoverPrompts(promptsResult.prompts);
                        setEditedPrompts(null); // Reset edit state
                    } else {
                      throw new Error('Failed to generate prompts');
                    }
                  } catch (error: any) {
                      console.error('Failed to generate prompts:', error);
                    toast.error(error.message || 'Failed to generate prompts');
                    setIsPromptDialogOpen(false);
                  } finally {
                    setGeneratingPrompts(false);
                  }
                }}
                disabled={generatingBlogCover || generatingPrompts}
                variant={blogCoverUrl || selectedBook?.blogCoverUrl ? "outline" : "default"}
              >
                {generatingBlogCover || generatingPrompts ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    {generatingPrompts ? 'Generating Prompts...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {blogCoverUrl || selectedBook?.blogCoverUrl ? 'Regenerate Cover' : 'Generate Cover'}
                  </>
                )}
              </Button>
                <Button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      
                      try {
                        setIsUploadingCover(true);
                        // Upload cover image and save to Book object if book is selected
                        const result = await videoAPI.uploadCover(
                          file, 
                          selectedBook?.id, // Pass bookId to save to Book object
                          (progress) => {
                            // Can display upload progress
                          }
                        );
                        setUploadedCoverImage(result.url);
                        setBlogCoverUrl(result.url);
                        
                        // Update selectedBook and books list with the new cover URL
                        if (selectedBook) {
                          setSelectedBook({
                            ...selectedBook,
                            blogCoverUrl: result.url
                          });
                          setBooks(prevBooks => 
                            prevBooks.map(book => 
                              book.id === selectedBook.id 
                                ? { ...book, blogCoverUrl: result.url }
                                : book
                            )
                          );
                        }
                        
                        toast.success('Cover image uploaded and saved successfully!');
                      } catch (error: any) {
                        console.error('Failed to upload cover image:', error);
                        toast.error(error.message || 'Failed to upload cover image');
                      } finally {
                        setIsUploadingCover(false);
                      }
                    };
                    input.click();
                  }}
                  disabled={isUploadingCover}
                  variant="outline"
                >
                  {isUploadingCover ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Cover
                  </>
                )}
              </Button>
            </div>
            </div>
            {(blogCoverUrl || selectedBook?.blogCoverUrl || uploadedCoverImage) && (
              <div className="mt-3">
                <img 
                  src={uploadedCoverImage || blogCoverUrl || selectedBook?.blogCoverUrl || ''} 
                  alt="Blog Cover" 
                  className="w-full max-w-xs mx-auto rounded-lg border"
                />
              </div>
            )}
          </div>

          {/* 提示词选择对话框 */}
          <Dialog open={isPromptDialogOpen} onOpenChange={(open) => {
            setIsPromptDialogOpen(open);
            if (!open) {
              // When closing dialog, if no style is selected, reset selection state
              // But keep prompts and edit state for next time
              if (!selectedPromptStyle) {
                // If no selection when closing, keep prompts unchanged
              }
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Cover Style and Prompt</DialogTitle>
                <DialogDescription>
                  Select a style, edit the prompt if needed, then click Apply to generate the cover image
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* 如果还没有提示词，先生成 */}
                {!blogCoverPrompts && !editedPrompts && (
                  <div className="text-center py-8">
                    <Loader className="mx-auto h-8 w-8 animate-spin mb-4" />
                    <p className="text-muted-foreground">Generating prompts...</p>
                  </div>
                )}

                {/* 显示3种风格的提示词 */}
                {(editedPrompts || blogCoverPrompts) && (
                  <div className="space-y-4">
                    {/* Style 1: Modern Minimalist Style */}
                    <div className={`p-4 border-2 rounded-lg transition-colors ${
                      selectedPromptStyle === 'style1' 
                        ? 'border-accent bg-accent/10' 
                        : 'border-border hover:border-accent/50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold mb-1">Style 1: Modern Minimalist Style</h4>
                          <p className="text-sm text-muted-foreground">
                            Focuses on premium feel and professionalism, suitable for most knowledge blogs
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={selectedPromptStyle === 'style1' ? 'default' : 'outline'}
                          onClick={() => setSelectedPromptStyle('style1')}
                        >
                          {selectedPromptStyle === 'style1' ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                      <Textarea
                        value={editedPrompts?.style1 || blogCoverPrompts?.style1 || ''}
                        onChange={(e) => {
                          const currentPrompts = editedPrompts || blogCoverPrompts;
                          if (currentPrompts) {
                            setEditedPrompts({
                              ...currentPrompts,
                              style1: e.target.value
                            });
                          }
                        }}
                        className="min-h-[100px] font-mono text-sm"
                        placeholder="Prompt..."
                      />
                    </div>

                    {/* Style 2: Creative Expression Style */}
                    <div className={`p-4 border-2 rounded-lg transition-colors ${
                      selectedPromptStyle === 'style2' 
                        ? 'border-accent bg-accent/10' 
                        : 'border-border hover:border-accent/50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold mb-1">Style 2: Creative Expression Style</h4>
                          <p className="text-sm text-muted-foreground">
                            More dynamic and creative, highlighting the concepts of "sharing" and "spreading"
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={selectedPromptStyle === 'style2' ? 'default' : 'outline'}
                          onClick={() => setSelectedPromptStyle('style2')}
                        >
                          {selectedPromptStyle === 'style2' ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                      <Textarea
                        value={editedPrompts?.style2 || blogCoverPrompts?.style2 || ''}
                        onChange={(e) => {
                          const currentPrompts = editedPrompts || blogCoverPrompts;
                          if (currentPrompts) {
                            setEditedPrompts({
                              ...currentPrompts,
                              style2: e.target.value
                            });
                          }
                        }}
                        className="min-h-[100px] font-mono text-sm"
                        placeholder="Prompt..."
                      />
                    </div>

                    {/* Style 3: Knowledge Stage Style */}
                    <div className={`p-4 border-2 rounded-lg transition-colors ${
                      selectedPromptStyle === 'style3' 
                        ? 'border-accent bg-accent/10' 
                        : 'border-border hover:border-accent/50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold mb-1">Style 3: Knowledge Stage Style</h4>
                          <p className="text-sm text-muted-foreground">
                            Places the book at the center of a "stage", creating a solemn and classic lecture or press conference atmosphere
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={selectedPromptStyle === 'style3' ? 'default' : 'outline'}
                          onClick={() => setSelectedPromptStyle('style3')}
                        >
                          {selectedPromptStyle === 'style3' ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                      <Textarea
                        value={editedPrompts?.style3 || blogCoverPrompts?.style3 || ''}
                        onChange={(e) => {
                          const currentPrompts = editedPrompts || blogCoverPrompts;
                          if (currentPrompts) {
                            setEditedPrompts({
                              ...currentPrompts,
                              style3: e.target.value
                            });
                          }
                        }}
                        className="min-h-[100px] font-mono text-sm"
                        placeholder="Prompt..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsPromptDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!selectedPromptStyle) {
                            toast.error('Please select a style first');
                            return;
                          }
                          
                          const currentPrompts = editedPrompts || blogCoverPrompts;
                          if (!currentPrompts) {
                            toast.error('Prompts not found');
                            return;
                          }

                          const selectedPrompt = currentPrompts[selectedPromptStyle];
                          if (!selectedPrompt || !selectedPrompt.trim()) {
                            toast.error('The selected style prompt is empty');
                            return;
                          }

                          if (!selectedBook) return;

                          try {
                            setIsPromptDialogOpen(false);
                            setGeneratingBlogCover(true);
                            
                            const result = await bookAPI.generateBlogCover(
                              selectedBook.id,
                              selectedPrompt
                            );
                            
                            if (result && result.blogCoverUrl) {
                              setBlogCoverUrl(result.blogCoverUrl);
                              setSelectedBook({
                                ...selectedBook,
                                blogCoverUrl: result.blogCoverUrl
                              });
                              setBooks(prevBooks => 
                                prevBooks.map(book => 
                                  book.id === selectedBook.id 
                                    ? { ...book, blogCoverUrl: result.blogCoverUrl }
                                    : book
                                )
                              );
                              toast.success('Blog cover image generated successfully!');
                            } else {
                              throw new Error('Failed to generate blog cover');
                            }
                          } catch (error: any) {
                            console.error('生成博客封面图失败:', error);
                            toast.error(error.message || 'Failed to generate blog cover image');
                          } finally {
                            setGeneratingBlogCover(false);
                          }
                        }}
                        disabled={!selectedPromptStyle}
                        className="bg-accent hover:bg-accent/90"
                      >
                        Apply & Generate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {bookContents && bookContents.length > 0 ? (
            <div className="space-y-4 mt-4">
              {bookContents.map((content, index) => (
                <Card key={content.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent">
                            Content {index + 1}
                          </Badge>
                          {getVideoStatusIcon(content.videoStatus)}
                        </div>
                        <div className="mb-2 space-y-1">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-muted-foreground">Chinese Title:</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (editingContentId === content.id) {
                                    // Save edits
                                    const edited = editedSummaries[content.id];
                                    if (edited) {
                                      try {
                                        // Call API to save edited content
                                        await bookAPI.updateContentSummary(
                                          content.id, 
                                          edited.summary, 
                                          edited.summaryEn,
                                          edited.chapterTitle,
                                          edited.chapterTitleEn
                                        );
                                        setEditingContentId(null);
                                        toast.success('Content updated successfully');
                                        // Reload content to get latest data
                                        if (selectedBook) {
                                          await loadBookContents(selectedBook.id);
                                        }
                                      } catch (error: any) {
                                        console.error('Failed to save content:', error);
                                        toast.error(error.message || 'Failed to save content');
                                      }
                                    }
                                  } else {
                                    // Start editing
                                    setEditingContentId(content.id);
                                    setEditedSummaries({
                                      ...editedSummaries,
                                      [content.id]: {
                                        summary: content.summary || '',
                                        summaryEn: content.summaryEn || '',
                                        chapterTitle: content.chapterTitle || '',
                                        chapterTitleEn: content.chapterTitleEn || ''
                                      }
                                    });
                                  }
                                }}
                              >
                                {editingContentId === content.id ? (
                                  <>
                                    <CircleCheck className="mr-1 h-3 w-3" />
                                    Save
                                  </>
                                ) : (
                                  <>
                                    <Edit className="mr-1 h-3 w-3" />
                                    Edit
                                  </>
                                )}
                              </Button>
                            </div>
                            {editingContentId === content.id ? (
                              <Input
                                value={editedSummaries[content.id]?.chapterTitle || content.chapterTitle || ''}
                                onChange={(e) => {
                                  setEditedSummaries({
                                    ...editedSummaries,
                                    [content.id]: {
                                      ...editedSummaries[content.id],
                                      chapterTitle: e.target.value
                                    }
                                  });
                                }}
                                className="mt-1"
                                placeholder="Enter Chinese title..."
                              />
                            ) : (
                              <h3 className="font-semibold">{editedSummaries[content.id]?.chapterTitle || content.chapterTitle}</h3>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-muted-foreground">English Title:</span>
                            </div>
                            {editingContentId === content.id ? (
                              <Input
                                value={editedSummaries[content.id]?.chapterTitleEn || content.chapterTitleEn || ''}
                                onChange={(e) => {
                                  setEditedSummaries({
                                    ...editedSummaries,
                                    [content.id]: {
                                      ...editedSummaries[content.id],
                                      chapterTitleEn: e.target.value
                                    }
                                  });
                                }}
                                className="mt-1"
                                placeholder="Enter English title..."
                              />
                            ) : (
                              content.chapterTitleEn && (
                                <h4 className="text-sm text-muted-foreground font-medium">{editedSummaries[content.id]?.chapterTitleEn || content.chapterTitleEn}</h4>
                              )
                            )}
                          </div>
                        </div>
                        
                        {/* 视频标题区域 */}
                        {content.videoTitleCn && (
                          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Video className="h-4 w-4 text-accent" />
                              <span className="text-accent">Video Title</span>
                            </div>
                            <div>
                                <span>{content.videoTitleCn}</span>
                              </div>
                          </div>
                        )}
                        
                        <div className="mb-4 space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-muted-foreground">Chinese Summary:</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (editingContentId === content.id) {
                                    // Save edits
                                    const edited = editedSummaries[content.id];
                                    if (edited) {
                                      try {
                                        // Call API to save edited content
                                        await bookAPI.updateContentSummary(
                                          content.id, 
                                          edited.summary, 
                                          edited.summaryEn,
                                          edited.chapterTitle,
                                          edited.chapterTitleEn
                                        );
                                        setEditingContentId(null);
                                        toast.success('Content updated successfully');
                                        // Reload content to get latest data
                                        if (selectedBook) {
                                          await loadBookContents(selectedBook.id);
                                        }
                                      } catch (error: any) {
                                        console.error('Failed to save content:', error);
                                        toast.error(error.message || 'Failed to save content');
                                      }
                                    }
                                  } else {
                                    // Start editing
                                    setEditingContentId(content.id);
                                    setEditedSummaries({
                                      ...editedSummaries,
                                      [content.id]: {
                                        summary: content.summary || '',
                                        summaryEn: content.summaryEn || '',
                                        chapterTitle: content.chapterTitle || '',
                                        chapterTitleEn: content.chapterTitleEn || ''
                                      }
                                    });
                                  }
                                }}
                              >
                                {editingContentId === content.id ? (
                                  <>
                                    <CircleCheck className="mr-1 h-3 w-3" />
                                    Save
                                  </>
                                ) : (
                                  <>
                                    <Edit className="mr-1 h-3 w-3" />
                                    Edit
                                  </>
                                )}
                              </Button>
                        </div>
                            {editingContentId === content.id ? (
                              <Textarea
                                value={editedSummaries[content.id]?.summary || content.summary || ''}
                                onChange={(e) => {
                                  setEditedSummaries({
                                    ...editedSummaries,
                                    [content.id]: {
                                      ...editedSummaries[content.id],
                                      summary: e.target.value
                                    }
                                  });
                                }}
                                className="mt-1 min-h-[100px]"
                                placeholder="Enter Chinese summary..."
                              />
                            ) : (
                              <p className="text-muted-foreground mt-1">
                                {editedSummaries[content.id]?.summary || content.summary || 'No Chinese summary available'}
                              </p>
                            )}
                          </div>
                            <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-muted-foreground">English Summary:</span>
                      </div>
                            {editingContentId === content.id ? (
                              <Textarea
                                value={editedSummaries[content.id]?.summaryEn || content.summaryEn || ''}
                                onChange={(e) => {
                                  setEditedSummaries({
                                    ...editedSummaries,
                                    [content.id]: {
                                      ...editedSummaries[content.id],
                                      summaryEn: e.target.value
                                    }
                                  });
                                }}
                                className="mt-1 min-h-[100px]"
                                placeholder="Enter English summary..."
                              />
                            ) : (
                              <p className="text-muted-foreground mt-1">
                                {editedSummaries[content.id]?.summaryEn || content.summaryEn || 'No English summary available'}
                              </p>
                            )}
                          </div>
                    </div>
                      </div>
                    </div>

                    {/* Generate Chinese and English Video Buttons */}
                    <div className="space-y-4">
                      {/* Generate Chinese Video Button */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Generate Chinese Video</span>
                            {content.videoUrl && (
                              <CircleCheck className="h-4 w-4 text-green-600" />
                            )}
                            {(generatingVideoId === content.id && generatingVideoLanguage === 'zh') || 
                             (generatingAudioId === content.id && generatingAudioLanguage === 'zh') ? (
                              <Loader className="h-4 w-4 animate-spin text-accent" />
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            id={`opening-text-zh-${content.id}`}
                            checked={includeOpeningText[content.id] !== false} // Default to true
                            onCheckedChange={(checked) => {
                              setIncludeOpeningText({
                                ...includeOpeningText,
                                [content.id]: checked !== false
                              });
                            }}
                          />
                          <Label 
                            htmlFor={`opening-text-zh-${content.id}`}
                            className="text-xs text-muted-foreground cursor-pointer"
                          >
                            Include opening text (e.g., "Welcome to our book blog")
                          </Label>
                        </div>
                        <Button 
                            onClick={() => handleGenerateChineseVideo(content)}
                            disabled={
                              (generatingVideoId === content.id && generatingVideoLanguage === 'zh') ||
                              (generatingAudioId === content.id && generatingAudioLanguage === 'zh') ||
                              generatingSilentVideoId === content.id ||
                              !(uploadedCoverImage || blogCoverUrl || selectedBook?.blogCoverUrl)
                            }
                            size="sm"
                            variant={content.videoUrl ? "outline" : "default"}
                          >
                            {(generatingVideoId === content.id && generatingVideoLanguage === 'zh') ||
                             (generatingAudioId === content.id && generatingAudioLanguage === 'zh') ? (
                              <>
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                          <Video className="mr-2 h-4 w-4" />
                                {content.videoUrl ? 'Regenerate' : 'Generate Chinese Video'}
                              </>
                            )}
                        </Button>
                        {/* Hint Message */}
                        {!(uploadedCoverImage || blogCoverUrl || selectedBook?.blogCoverUrl) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Please generate or upload blog cover image first
                          </p>
                        )}
                        {/* Progress Bar Display */}
                        {videoProgress[`${content.id}_zh_complete`] !== undefined && (
                          <div className="mt-2">
                            <Progress 
                              value={videoProgress[`${content.id}_zh_complete`] || 0} 
                              className="h-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Generation Progress: {videoProgress[`${content.id}_zh_complete`] || 0}%
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 生成英文视频按钮 */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Generate English Video</span>
                            {content.videoUrlEn && (
                              <CircleCheck className="h-4 w-4 text-green-600" />
                            )}
                            {generatingEnglishVideoId === content.id && (
                              <Loader className="h-4 w-4 animate-spin text-accent" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            id={`opening-text-en-${content.id}`}
                            checked={includeOpeningText[`${content.id}_en`] !== false} // Default to true
                            onCheckedChange={(checked) => {
                              setIncludeOpeningText({
                                ...includeOpeningText,
                                [`${content.id}_en`]: checked !== false
                              });
                            }}
                          />
                          <Label 
                            htmlFor={`opening-text-en-${content.id}`}
                            className="text-xs text-muted-foreground cursor-pointer"
                          >
                            Include opening text (e.g., "Welcome to our book blog")
                          </Label>
                        </div>
                        <Button 
                          onClick={async () => {
                            try {
                              setGeneratingEnglishVideoId(content.id);
                              // 初始化进度
                              setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: 0 }));
                              
                              // 启动进度条更新（预计5分钟）
                              const startTime = Date.now();
                              const estimatedDuration = 300000; // 5分钟
                              
                              const progressInterval = setInterval(() => {
                                const elapsed = Date.now() - startTime;
                                const progress = Math.min(95, Math.floor((elapsed / estimatedDuration) * 95));
                                setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: progress }));
                              }, 1000);
                              
                              toast.info('Generating English video, this may take a few minutes...');
                              
                              try {
                                // 重新获取最新的内容数据，确保获取最新的audioUrlEn
                                if (selectedBook) {
                                  const updatedContents = await bookAPI.getBookContents(selectedBook.id);
                                  const updatedContent = updatedContents.find((c: any) => c.id === content.id);
                                  if (updatedContent) {
                                    content = updatedContent;
                                  }
                                }
                                
                                // 步骤1: 如果没有英文音频，先自动生成英文音频
                                let finalAudioUrl: string | null = null;
                                
                                if (!content.audioUrlEn || content.audioUrlEn.includes('myqcloud.com')) {
                                  // 如果没有英文音频，或者URL是腾讯云临时URL（可能已过期），重新生成
                                  toast.info('Step 1/2: Generating English audio...');
                                  setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: 10 }));
                                  
                                  // Use edited summary if available, otherwise use original
                                  const edited = editedSummaries[content.id];
                                  const finalSummaryEn = edited?.summaryEn || content.summaryEn || '';
                                  
                                  // 检查是否有英文翻译
                                  if (!content.chapterTitleEn && !finalSummaryEn) {
                                    throw new Error('Please translate content first. English content is required to generate English audio.');
                                  }
                                  
                                  const audioText = finalSummaryEn.trim();
                                  if (!audioText) {
                                    throw new Error('English content text is empty, cannot generate English audio');
                                  }
                                  
                                  // 生成英文音频
                                  const audioResult = await bookAPI.generateAudio(content.id, audioText, 'en');
                                  if (!audioResult || !audioResult.audioUrl) {
                                    throw new Error('生成英文音频失败：未返回有效的音频URL');
                                  }
                                  
                                  // 直接使用API返回的audioUrl（这是LeanCloud的URL）
                                  finalAudioUrl = audioResult.audioUrl;
                                  console.log('✅ 英文音频生成成功，LeanCloud URL:', finalAudioUrl);
                                  
                                  // 更新本地content对象
                                  content.audioUrlEn = finalAudioUrl;
                                  
                                  // 等待一下，确保数据库更新完成
                                  await new Promise(resolve => setTimeout(resolve, 1000));
                                  
                                  toast.success('English audio generated successfully');
                                  setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: 30 }));
                                } else {
                                  // 如果已有英文音频URL，使用它
                                  finalAudioUrl = content.audioUrlEn;
                                  
                                  // 如果URL是腾讯云临时URL，提示并重新生成
                                  if (finalAudioUrl.includes('myqcloud.com')) {
                                    console.warn('⚠️ 检测到腾讯云临时URL，可能已过期，重新生成音频...');
                                    toast.info('Detected temporary URL, regenerating audio...');
                                    setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: 10 }));
                                    
                                    // Use edited summary if available
                                    const edited = editedSummaries[content.id];
                                    const audioText = `${edited?.summaryEn || content.summaryEn || ''}`.trim();
                                    // Check if opening text should be included
                                    const shouldIncludeOpeningEn = includeOpeningText[`${content.id}_en`] !== false; // Default to true
                                    const audioResult = await bookAPI.generateAudio(content.id, audioText, 'en', shouldIncludeOpeningEn);
                                    if (!audioResult || !audioResult.audioUrl) {
                                      throw new Error('重新生成英文音频失败');
                                    }
                                    
                                    finalAudioUrl = audioResult.audioUrl;
                                    content.audioUrlEn = finalAudioUrl;
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: 30 }));
                                  }
                                }
                                
                                // 最终验证音频URL
                                if (!finalAudioUrl || !finalAudioUrl.startsWith('http')) {
                                  console.error('❌ 音频URL无效:', { 
                                    audioUrlEn: content.audioUrlEn, 
                                    finalAudioUrl,
                                    contentId: content.id
                                  });
                                  throw new Error(`Invalid English audio URL: ${finalAudioUrl || 'null'}. Please try again.`);
                                }
                                
                                console.log('📻 使用英文音频URL生成视频:', finalAudioUrl.substring(0, 100) + '...');
                                
                                // 步骤2: 使用generateVideo API生成英文视频
                                toast.info('Step 2/2: Generating English video with blog cover and microphone...');
                                setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: 40 }));
                                
                                // Use edited cover, title, and summary if available
                                const edited = editedSummaries[content.id];
                                const currentBlogCoverUrl = uploadedCoverImage || blogCoverUrl || selectedBook?.blogCoverUrl;
                                
                                // Get opening text option for English video
                                const shouldIncludeOpeningEn = includeOpeningText[`${content.id}_en`] !== false; // Default to true
                                
                                const result = await bookAPI.generateVideo(
                                  content.id, 
                                  finalAudioUrl, 
                                  'en',
                                  {
                                    coverImageUrl: currentBlogCoverUrl,
                                    summary: content.summary, // Chinese summary (not used for English video but kept for consistency)
                                    summaryEn: edited?.summaryEn || content.summaryEn,
                                    chapterTitle: content.chapterTitle, // Chinese title (not used for English video but kept for consistency)
                                    chapterTitleEn: edited?.chapterTitleEn || content.chapterTitleEn,
                                    includeOpeningText: shouldIncludeOpeningEn
                                  }
                                );
                                if (progressInterval) {
                                  clearInterval(progressInterval);
                                }
                                
                                // 检查返回结果（英文视频可能返回videoUrlEn或videoUrl）
                                const videoUrl = result?.videoUrlEn || result?.videoUrl;
                                if (result && videoUrl) {
                                  setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: 100 }));
                                  toast.success('English video generated successfully');
                                  // 重新加载内容
                                  if (selectedBook) {
                                    await loadBookContents(selectedBook.id);
                                  }
                                } else {
                                  console.error('生成英文视频返回结果:', result);
                                  throw new Error('生成英文视频失败：未返回有效的视频URL');
                                }
                              } catch (apiError: any) {
                                if (progressInterval) {
                                  clearInterval(progressInterval);
                                }
                                setEnglishVideoGeneratingProgress(prev => ({ ...prev, [content.id]: 0 }));
                                throw apiError;
                              }
                            } catch (error: any) {
                              console.error('生成英文视频失败:', error);
                              toast.error(error.message || 'Failed to generate English video');
                            } finally {
                              setGeneratingEnglishVideoId(null);
                            }
                          }}
                          size="sm"
                          variant={content.videoUrlEn ? "outline" : "default"}
                          disabled={generatingEnglishVideoId === content.id || !(blogCoverUrl || selectedBook?.blogCoverUrl)}
                        >
                          {generatingEnglishVideoId === content.id ? (
                            <>
                              <Loader className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Languages className="mr-2 h-4 w-4" />
                              {content.videoUrlEn ? 'Regenerate' : 'Generate English Video'}
                            </>
                          )}
                        </Button>
                        {/* 进度条显示 */}
                        {generatingEnglishVideoId === content.id && englishVideoGeneratingProgress[content.id] !== undefined && (
                          <div className="mt-2">
                            <Progress 
                              value={englishVideoGeneratingProgress[content.id] || 0} 
                              className="h-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Generation Progress: {englishVideoGeneratingProgress[content.id] || 0}%
                            </p>
                          </div>
                        )}
                        {!(blogCoverUrl || selectedBook?.blogCoverUrl) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Please generate blog cover image first
                          </p>
                        )}
                        
                        {content.videoUrlEn && (
                          <div className="mt-4">
                            <div className="text-sm font-medium mb-2">English Video:</div>
                            <video controls className="w-full rounded-lg" src={content.videoUrlEn}>
                              Your browser does not support video playback
                            </video>
                            <div className="flex gap-2 mt-2">
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                size="sm"
                                onClick={() => window.open(content.videoUrlEn, '_blank')}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview English Video
                              </Button>
                              <Button 
                                onClick={() => handlePublishVideo(content, true)}
                                className="flex-1 bg-accent hover:bg-accent/90"
                                size="sm"
                                disabled={isVideoPublished(content.videoUrl, content.videoUrlEn, true)}
                              >
                                <Video className="mr-2 h-4 w-4" />
                                {isVideoPublished(content.videoUrl, content.videoUrlEn, true)
                                  ? (publishedVideos.some(v => v.videoUrlEn === content.videoUrlEn) ? 'Published' : 'In Review Queue')
                                  : 'Publish English Video'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                        {/* 显示中间步骤的结果（可选，用于调试） */}
                        {content.audioUrl && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="text-green-600">✓</span> Chinese audio generated
                          </div>
                        )}
                        {content.silentVideoUrl && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span className="text-green-600">✓</span> Video material completed
                        </div>
                        )}
                        
                        {/* 最终视频展示 */}
                        {content.videoUrl && (
                          <div className="mt-4">
                            <div className="text-sm font-medium mb-2">Chinese Video:</div>
                            <video controls className="w-full rounded-lg" src={content.videoUrl}>
                              Your browser does not support video playback
                            </video>
                            <div className="flex gap-2 mt-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                                size="sm"
                                onClick={() => window.open(content.videoUrl, '_blank')}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                                Preview Chinese Video
                          </Button>
                          <Button 
                                onClick={() => handlePublishVideo(content, false)}
                            className="flex-1 bg-accent hover:bg-accent/90"
                                size="sm"
                                disabled={isVideoPublished(content.videoUrl, content.videoUrlEn, false)}
                          >
                            <Video className="mr-2 h-4 w-4" />
                                {isVideoPublished(content.videoUrl, content.videoUrlEn, false) 
                                  ? (publishedVideos.some(v => v.videoUrl === content.videoUrl) ? 'Published' : 'In Review Queue')
                                  : 'Publish Chinese Video'}
                          </Button>
                        </div>
                      </div>
                    )}
                        
                        {content.videoStatus === 'failed' && (
                          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-700 text-sm">视频生成失败，请重试</p>
                          </div>
                        )}
                      </div>
                    </div>
                </Card>
              ))}

              <div className="bg-muted rounded-lg p-4 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="mb-1">提示</h4>
                  <p className="text-muted-foreground">
                    AI will generate videos based on extracted text content, then merge the generated audio with video. After generation, you can preview and adjust, then publish to the review queue after confirmation.
                  </p>
                </div>
              </div>
            </div>
          ) : bookContents.length === 0 && selectedBook ? (
            <div className="py-12 text-center text-muted-foreground">
              <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>暂无提取内容，请先进行AI内容提取</p>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>加载中...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 英文视频对话框 */}
      <Dialog open={isEnglishVideoDialogOpen} onOpenChange={setIsEnglishVideoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate English Video</DialogTitle>
            <DialogDescription>
              Select content segments to generate English videos. The system will automatically translate, generate English audio and merge videos
            </DialogDescription>
          </DialogHeader>
          
          {/* 内容选择区域 */}
          {allContentsForEnglishVideo.length > 0 && (
            <div className="space-y-4 border-b pb-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">选择要生成的内容段</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedContentIdsForEnglishVideo(new Set(allContentsForEnglishVideo.map((c: any) => c.id)));
                    }}
                  >
                    全选
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedContentIdsForEnglishVideo(new Set());
                    }}
                  >
                    Cancel全选
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allContentsForEnglishVideo.map((content: any, index: number) => {
                  const isSelected = selectedContentIdsForEnglishVideo.has(content.id);
                  const isGenerating = generatingEnglishVideoId === 'generating' && englishVideoGeneratingProgress[content.id] !== undefined;
                  const progress = englishVideoGeneratingProgress[content.id] || 0;
                  const hasEnglishVideo = content.videoUrlEn;
                  
                  return (
                    <div
                      key={content.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      } ${hasEnglishVideo ? 'bg-green-50 border-green-200' : ''}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedContentIdsForEnglishVideo);
                          if (checked) {
                            newSet.add(content.id);
                          } else {
                            newSet.delete(content.id);
                          }
                          setSelectedContentIdsForEnglishVideo(newSet);
                        }}
                        disabled={generatingEnglishVideoId === 'generating'}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            Segment {index + 1}: {content.chapterTitle || `Content ${index + 1}`}
                          </span>
                          {hasEnglishVideo && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              已生成
                            </Badge>
                          )}
                          {isGenerating && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                              生成中...
                            </Badge>
                          )}
                        </div>
                        {content.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-4">
                            {content.summary}
                          </p>
                        )}
                        {isGenerating && (
                          <div className="mt-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Button
                onClick={handleGenerateSelectedEnglishVideos}
                disabled={selectedContentIdsForEnglishVideo.size === 0 || generatingEnglishVideoId === 'generating'}
                className="w-full"
              >
                {generatingEnglishVideoId === 'generating' ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Generate English Videos for Selected Content ({selectedContentIdsForEnglishVideo.size} segments)
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* 已生成的英文视频展示区域 */}
          {selectedEnglishContent ? (
            <div className="space-y-4">
              {/* 内容选择器 */}
              {englishContents.length > 1 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">选择内容段</Label>
                  <Select
                    value={selectedEnglishContent.id}
                    onValueChange={(value) => {
                      const content = englishContents.find((c: any) => c.id === value);
                      if (content) {
                        setSelectedEnglishContent(content);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {englishContents.map((content: any, index: number) => (
                        <SelectItem key={content.id} value={content.id}>
                          第{index + 1}段: {content.chapterTitleEn || content.chapterTitle || `内容${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 英文标题 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">English Title</Label>
                <p className="text-base font-semibold">{selectedEnglishContent.chapterTitleEn || '暂无'}</p>
              </div>

              {/* 英文摘要 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">English Summary</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedEnglishContent.summaryEn || '暂无'}
                </p>
              </div>

              {/* 英文关键要点 */}
              {selectedEnglishContent.keyPointsEn && selectedEnglishContent.keyPointsEn.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">英文关键要点</Label>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {selectedEnglishContent.keyPointsEn.map((point: string, index: number) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 英文音频 */}
              {selectedEnglishContent.audioUrlEn && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">英文音频</Label>
                  <audio controls className="w-full">
                    <source src={selectedEnglishContent.audioUrlEn} type="audio/mpeg" />
                    您的浏览器不支持音频播放
                  </audio>
                </div>
              )}

              {/* 英文视频 */}
              {selectedEnglishContent.videoUrlEn && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">English Video</Label>
                  <video controls className="w-full rounded-lg" src={selectedEnglishContent.videoUrlEn}>
                    您的浏览器不支持视频播放
                  </video>
                </div>
              )}

              {/* 发布按钮 */}
              {selectedEnglishContent.videoUrlEn && (
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => handlePublishVideo(selectedEnglishContent, true)}
                    className="bg-primary text-primary-foreground"
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Publish English Video
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Languages className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>暂无英文内容</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}